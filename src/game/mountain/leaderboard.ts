import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { useProfile } from "@/identity/profile-store";
import { connectionId, useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useMobility } from "@/game/mobility/store";
import { useWorldEditor } from "@/game/editor/store";
import {
  isMountainPosition,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_SUMMIT_ID,
  MOUNTAIN_ROUTE_VERSION,
} from "./model";

export type SummitEntry = { rank: number; playerId: string; name: string; summits: number };
type SummitSnapshot = {
  routeVersion: number;
  entries: SummitEntry[];
  ownSummits: number;
  run: { id: string; checkpoint: number; completed: boolean } | null;
};
export const useSummitLeaderboard = create<{
  entries: SummitEntry[];
  ownSummits: number;
  loading: boolean;
  loaded: boolean;
  error: string | null;
}>(() => ({ entries: [], ownSummits: 0, loading: false, loaded: false, error: null }));

type Sample = { position: [number, number, number]; checkpoint: number; ackFailures?: number };
class SummitAcknowledgementError extends Error {}
let generation = 0;
let runId: string | null = null;
let runStarted = false;
let runCompleted = false;
let runFailed = false;
let samples: Sample[] = [];
let running = false;
let reading = false;
let retryAt = 0;
let readAt = 0;
type PendingFinish = {
  runId: string;
  room: string;
  profileId: string;
  samples: Sample[];
  started: boolean;
};
let finishes: PendingFinish[] = [];
let finishing = false;
let finishRetryAt = 0;

export function resetSummitTracking(clearBoard = false) {
  const lease = useChannels.getState().lease;
  const profile = useProfile.getState().profile;
  // Returning immediately from the summit must not erase a slow/queued completion.
  if (
    !clearBoard &&
    runId &&
    !runCompleted &&
    samples.some((s) => s.checkpoint === MOUNTAIN_SUMMIT_ID) &&
    lease &&
    profile
  )
    finishes.push({
      runId,
      room: lease.channel,
      profileId: profile.id,
      samples: [...samples],
      started: runStarted,
    });
  generation++;
  finishing = false;
  runId = null;
  runStarted = false;
  runCompleted = false;
  runFailed = false;
  samples = [];
  running = false;
  reading = false;
  retryAt = 0;
  if (clearBoard) {
    finishes = [];
    finishRetryAt = 0;
    readAt = 0;
    useSummitLeaderboard.setState({
      entries: [],
      ownSummits: 0,
      loaded: false,
      loading: false,
      error: null,
    });
  }
}
function applySnapshot(snapshot: SummitSnapshot) {
  if (!Array.isArray(snapshot.entries) || !Number.isFinite(snapshot.ownSummits))
    throw new Error("Papan summit belum tersedia.");
  // A read started before a finish may arrive afterwards; account totals never go backwards.
  if (snapshot.ownSummits < useSummitLeaderboard.getState().ownSummits) return;
  useSummitLeaderboard.setState({
    entries: snapshot.entries,
    ownSummits: snapshot.ownSummits,
    loading: false,
    loaded: true,
    error: null,
  });
}
export async function refreshSummitLeaderboard(force = false) {
  if (reading || !useProfile.getState().profile || !useChannels.getState().playing) return;
  if (!force && Date.now() - readAt < 30_000) return;
  reading = true;
  readAt = Date.now();
  const ticket = generation;
  useSummitLeaderboard.setState({ loading: true });
  try {
    const snapshot = await worldRequest<SummitSnapshot>("mountain", { action: "read" });
    if (ticket === generation) applySnapshot(snapshot);
  } catch {
    if (ticket === generation)
      useSummitLeaderboard.setState({
        loading: false,
        error: "Papan summit belum terhubung. Mencoba lagi…",
      });
  } finally {
    if (ticket === generation) reading = false;
  }
}
function available() {
  const game = useGame.getState(),
    mobility = useMobility.getState();
  return (
    useProfile.getState().profile &&
    useChannels.getState().playing &&
    useChannels.getState().lease &&
    !game.pendingTeleport &&
    useWorldEditor.getState().mode === "PLAYER" &&
    !mobility.flying &&
    !mobility.carries.some((p) => p.carrier === connectionId || p.passenger === connectionId) &&
    !mobility.vehicles?.some((v) => v.occupants.some((p) => p.connectionId === connectionId)) &&
    isMountainPosition(game.playerPos[0], game.playerPos[2])
  );
}
/** Exact physics samples preserve CP visits; sparse movement samples prove the trail behind slow requests. */
export function recordSummitVisit(
  checkpoint: number,
  bodyPosition: readonly [number, number, number],
) {
  if (!available() || !runId || runCompleted || runFailed) return;
  samples.push({ position: [...bodyPosition], checkpoint });
  void sendNext();
}
export function tickSummitTracking(checkpoint: number, inFlight: boolean) {
  if (inFlight || !available()) return;
  const position = useGame.getState().playerPos;
  if (Math.hypot(position[0] - 376, position[2] - 55) < 45) void refreshSummitLeaderboard();
  if (runFailed) return;
  // Capture the next departure even while the previous summit is still being retried.
  // Sending remains serialized, so the old receipt is safe and the new CPs are not lost.
  if (!runId) {
    const base = MOUNTAIN_HELIPAD.position;
    if (
      checkpoint !== 0 ||
      Math.hypot(position[0] - base[0], position[2] - base[2]) > 17 ||
      Math.abs(position[1] - base[1] - 0.83) > 1.6
    )
      return;
    runId = createId();
    samples = [{ position: [...position], checkpoint: 0 }];
  } else if (runStarted && !runCompleted) {
    const last = samples.at(-1);
    if (!last || Math.hypot(...position.map((v, i) => v - last.position[i]!)) > 0.5)
      samples.push({ position: [...position], checkpoint: 0 });
    // A 15 minute outage must not grow an unbounded queue or silently erase trail evidence.
    if (samples.length > 600) {
      runFailed = true;
      samples = [];
      rejectedRun();
      return;
    }
  }
  if (finishes.length) void flushFinished();
  else void sendNext();
}
function acknowledge(snapshot: SummitSnapshot, sample: Sample, expectedRun: string) {
  if (
    snapshot.routeVersion !== MOUNTAIN_ROUTE_VERSION ||
    snapshot.run?.id !== expectedRun ||
    (sample.checkpoint > 0 &&
      !snapshot.run.completed &&
      snapshot.run.checkpoint < sample.checkpoint)
  ) {
    sample.ackFailures = (sample.ackFailures ?? 0) + 1;
    throw new SummitAcknowledgementError("Checkpoint belum diakui server.");
  }
}
function rejectedRun() {
  const message = "Catatan summit belum tervalidasi. Mulai ulang dari basecamp.";
  useSummitLeaderboard.setState({ error: message });
  useGame.getState().setToast(message);
}
async function sendNext() {
  if (
    running ||
    finishes.length ||
    !runId ||
    runCompleted ||
    runFailed ||
    !samples.length ||
    Date.now() < retryAt ||
    !available()
  )
    return;
  const lease = useChannels.getState().lease!;
  const ticket = generation;
  const sample = samples[0]!;
  const action = runStarted ? "step" : "start";
  running = true;
  try {
    const snapshot = await worldRequest<SummitSnapshot>("mountain", {
      action,
      routeVersion: MOUNTAIN_ROUTE_VERSION,
      runId,
      room: lease.channel,
      connectionId,
      position: sample.position,
    });
    if (ticket !== generation) return;
    acknowledge(snapshot, sample, runId);
    applySnapshot(snapshot);
    runStarted = true;
    runCompleted = snapshot.run?.completed ?? false;
    samples = samples.filter((candidate) => candidate !== sample);
    retryAt = 0;
  } catch (error) {
    if (ticket === generation) {
      if (error instanceof SummitAcknowledgementError && (sample.ackFailures ?? 0) >= 2) {
        runFailed = true;
        samples = [];
        rejectedRun();
        return;
      }
      retryAt = Date.now() + 5000;
      useSummitLeaderboard.setState({ error: "Catatan summit menunggu koneksi. Mencoba lagi…" });
    }
  } finally {
    if (ticket === generation) {
      running = false;
      if (!retryAt && samples.length) void sendNext();
    }
  }
}

async function flushFinished() {
  if (finishing || Date.now() < finishRetryAt || !finishes.length) return;
  const finish = finishes[0]!;
  if (
    finish.profileId !== useProfile.getState().profile?.id ||
    finish.room !== useChannels.getState().lease?.channel
  ) {
    finishes.shift();
    return;
  }
  const ticket = generation;
  finishing = true;
  try {
    while (finish.samples.length && ticket === generation) {
      const sample = finish.samples[0]!;
      const snapshot = await worldRequest<SummitSnapshot>("mountain", {
        action: finish.started ? "step" : "start",
        routeVersion: MOUNTAIN_ROUTE_VERSION,
        runId: finish.runId,
        room: finish.room,
        connectionId,
        position: sample.position,
      });
      if (ticket !== generation) return;
      acknowledge(snapshot, sample, finish.runId);
      applySnapshot(snapshot);
      finish.started = true;
      finish.samples.shift();
      if (snapshot.run?.completed) finish.samples = [];
    }
    if (ticket === generation) {
      finishes.shift();
      finishRetryAt = 0;
    }
  } catch (error) {
    if (ticket === generation) {
      if (
        error instanceof SummitAcknowledgementError &&
        (finish.samples[0]?.ackFailures ?? 0) >= 2
      ) {
        finishes.shift();
        rejectedRun();
        return;
      }
      finishRetryAt = Date.now() + 5000;
      useSummitLeaderboard.setState({
        error: "Summit menunggu koneksi. Catatan akan dikirim ulang…",
      });
    }
  } finally {
    if (ticket === generation) finishing = false;
  }
}
