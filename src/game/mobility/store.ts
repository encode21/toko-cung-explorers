import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { connectionId, useChannels } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import { useFishing } from "@/game/fishing/store";
import { useObby } from "@/game/obby/store";
import { useDungeon } from "@/game/dungeon/store";
import { useWorldEditor } from "@/game/editor/store";
import { activePair, type MobilitySnapshot } from "./model";

const empty: MobilitySnapshot = { canFly: false, flying: false, carries: [] };
export const useMobility = create<
  MobilitySnapshot & { busy: boolean; vertical: number; confirmedAt: number; error: string }
>(() => ({
  ...empty,
  busy: false,
  vertical: 0,
  confirmedAt: 0,
  error: "",
}));
let generation = 0;
let running = false;
let inFlight: Promise<void> | null = null;
export function resetMobility() {
  generation++;
  inFlight = null;
  useMobility.setState({ ...empty, busy: false, vertical: 0, confirmedAt: 0, error: "" });
}
export function mobilityAvailable() {
  const game = useGame.getState();
  return (
    useChannels.getState().playing &&
    !game.sitting &&
    !game.pendingTeleport &&
    !useFishing.getState().open &&
    !useDungeon.getState().transition &&
    useWorldEditor.getState().mode !== "EDITOR"
  );
}
type MobilityAction = "read" | "request" | "accept" | "decline" | "release" | "flight";

/** Polls never disable controls. User actions wait behind a poll instead of disappearing. */
export async function mobilityCommand(action: MobilityAction, extra: Record<string, unknown> = {}) {
  const ticket = generation;
  if (action === "read") {
    if (inFlight || useMobility.getState().busy) return;
    return sendCommand(action, extra);
  }
  if (useMobility.getState().busy) return;
  useMobility.setState({ busy: true });
  try {
    await inFlight;
    if (ticket === generation) await sendCommand(action, extra);
  } finally {
    if (ticket === generation) useMobility.setState({ busy: false });
  }
}
function sendCommand(action: MobilityAction, extra: Record<string, unknown>) {
  const ticket = generation;
  const task = performCommand(action, extra, ticket);
  inFlight = task;
  void task.finally(() => {
    if (inFlight === task) inFlight = null;
  });
  return task;
}
async function performCommand(
  action: MobilityAction,
  extra: Record<string, unknown>,
  ticket: number,
) {
  const lease = useChannels.getState().lease;
  if (!lease || !lease.channel.startsWith("CHANNEL-") || !useNet.getState().connected) return;
  try {
    const result = await worldRequest<MobilitySnapshot>("mobility", {
      action,
      room: lease.channel,
      connectionId,
      position: useGame.getState().playerPos,
      available: mobilityAvailable(),
      ...extra,
    });
    if (ticket !== generation || useChannels.getState().lease?.channel !== lease.channel) return;
    const wasFlying = useMobility.getState().flying;
    useMobility.setState({ ...result, confirmedAt: performance.now(), error: "" });
    if (result.flying && !wasFlying) useObby.getState().reset();
    if (action === "request") useGame.getState().setToast("Undangan gendong terkirim.");
  } catch (error) {
    if (ticket !== generation) return;
    const message =
      action === "read"
        ? "Kontrol belum tersambung. Mencoba menghubungkan kembali…"
        : error instanceof Error
          ? error.message
          : "Interaksi belum berhasil.";
    useMobility.setState({ error: message });
    if (action !== "read") useGame.getState().setToast(message);
  }
}
export function releaseCarry() {
  const pair = activePair(useMobility.getState().carries, connectionId);
  if (pair) void mobilityCommand("release", { id: pair.id });
}
export function startMobility() {
  if (running) return () => {};
  running = true;
  resetMobility();
  const tick = () => {
    const state = useMobility.getState();
    if (
      !useNet.getState().connected ||
      (state.confirmedAt && performance.now() - state.confirmedAt > 5000)
    ) {
      // Stop movement on stale authority, but keep the known capability/button visible.
      // Account/room teardown still fully clears it via resetMobility().
      generation++;
      inFlight = null;
      useMobility.setState({
        flying: false,
        carries: [],
        vertical: 0,
        confirmedAt: 0,
        busy: false,
        error: "Koneksi terputus. Kontrol akan aktif setelah tersambung kembali.",
      });
    }
    void mobilityCommand("read");
  };
  tick();
  const timer = window.setInterval(tick, 1000);
  return () => {
    window.clearInterval(timer);
    running = false;
    resetMobility();
  };
}
