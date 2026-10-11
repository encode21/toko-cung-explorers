import { isDungeonRoom, useDungeon } from "@/game/dungeon/store";
import { useProfile } from "@/identity/profile-store";
import { create } from "zustand";
import { createId } from "@/lib/id";
import { gameCommand } from "@/game/core/api.functions";
import { useGame } from "@/state/game-store";
import type { GameSnapshot } from "./types";
interface CoreState {
  snapshot: GameSnapshot | null;
  busy: boolean;
  error: string;
  pending: string | null;
  target: string | null;
  syncing: boolean;
}
export const useGameCore = create<CoreState>(() => ({
  snapshot: null,
  busy: false,
  error: "",
  pending: null,
  target: null,
  syncing: false,
}));
let epoch = 0;
type Action = "read" | "pose" | "accept" | "objective" | "complete" | "cancel";
type Extra = { questId?: string; objective?: number };
export type CommandResult = { ok: true; snapshot: GameSnapshot } | { ok: false; error: string };
let running = false;
let queued: { action: Action; extra: Extra; resolve: (r: CommandResult) => void } | null = null;
export function clearGameCore() {
  epoch++;
  queued?.resolve({ ok: false, error: "Session changed" });
  queued = null;
  useGameCore.setState({
    snapshot: null,
    busy: false,
    error: "",
    pending: null,
    target: null,
    syncing: false,
  });
}
export function command(action: Action, extra: Extra = {}): Promise<CommandResult> {
  if ((isDungeonRoom() || useDungeon.getState().data?.instance) && action !== "read")
    return Promise.resolve({ ok: false, error: "Gunakan aksi dungeon." });
  const background = action === "read" || action === "pose";
  if (background && (running || useGameCore.getState().busy))
    return Promise.resolve({ ok: false, error: "Synchronization already running" });
  if (!background && useGameCore.getState().busy)
    return Promise.resolve({ ok: false, error: "Action already pending" });
  if (!background)
    useGameCore.setState({ busy: true, pending: action, target: extra.questId ?? null, error: "" });
  if (running)
    return new Promise((resolve) => {
      queued = { action, extra, resolve };
    });
  return execute(action, extra);
}
async function execute(action: Action, extra: Extra): Promise<CommandResult> {
  running = true;
  const background = action === "read" || action === "pose";
  const generation = epoch;
  const active = useGameCore.getState().snapshot?.active;
  const request = {
    action,
    requestId: createId(),
    ...extra,
    ...(active ? { runId: active.id, revision: active.revision } : {}),
    ...(action === "pose" ? { position: useGame.getState().playerPos } : {}),
  };
  if (background) useGameCore.setState({ syncing: true });
  try {
    const snapshot = await gameCommand({ data: request });
    if (generation !== epoch) return { ok: false, error: "Session changed" };
    // Pose heartbeats do not fetch the trusted event feed. Keep the last offer projection
    // until a read or gameplay command refreshes it; acceptance is still validated server-side.
    const previous = useGameCore.getState().snapshot;
    useGameCore.setState({
      snapshot: action === "pose" && previous ? { ...snapshot, quests: previous.quests } : snapshot,
    });
    const profile = useProfile.getState().profile;
    if (
      profile?.id === snapshot.profile.player_id &&
      (profile.level !== snapshot.profile.level || profile.title !== snapshot.profile.title)
    ) {
      useProfile.setState({
        profile: { ...profile, level: snapshot.profile.level, title: snapshot.profile.title },
      });
    }
    if (action === "complete") {
      const reward = snapshot.history.find((r) => r.id === active?.id);
      if (reward?.status === "COMPLETED")
        useGame
          .getState()
          .setToast(`Quest selesai · +${reward.xp_awarded} XP · +${reward.point_awarded} Point`);
    }
    return { ok: true, snapshot };
  } catch (e) {
    if (generation === epoch && action !== "pose")
      useGameCore.setState({
        error: e instanceof Error ? e.message : "Quest sementara tidak tersedia.",
      });
    return { ok: false, error: e instanceof Error ? e.message : "Quest sementara tidak tersedia." };
  } finally {
    running = false;
    if (generation === epoch)
      useGameCore.setState(
        background ? { syncing: false } : { busy: false, pending: null, target: null },
      );
    const next = queued;
    queued = null;
    if (next) void execute(next.action, next.extra).then(next.resolve);
  }
}
