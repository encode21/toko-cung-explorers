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
  MobilitySnapshot & { busy: boolean; vertical: number; confirmedAt: number }
>(() => ({
  ...empty,
  busy: false,
  vertical: 0,
  confirmedAt: 0,
}));
let generation = 0;
let running = false;
export function resetMobility() {
  generation++;
  useMobility.setState({ ...empty, busy: false, vertical: 0, confirmedAt: 0 });
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
export async function mobilityCommand(
  action: "read" | "request" | "accept" | "decline" | "release" | "flight",
  extra: Record<string, unknown> = {},
) {
  if (useMobility.getState().busy) return;
  const lease = useChannels.getState().lease;
  if (!lease || !lease.channel.startsWith("CHANNEL-") || !useNet.getState().connected) return;
  const ticket = generation;
  useMobility.setState({ busy: true });
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
    useMobility.setState({ ...result, confirmedAt: performance.now() });
    if (result.flying && !wasFlying) useObby.getState().reset();
    if (action === "request") useGame.getState().setToast("Undangan gendong terkirim.");
  } catch (error) {
    if (ticket !== generation) return;
    if (action !== "read")
      useGame
        .getState()
        .setToast(error instanceof Error ? error.message : "Interaksi belum berhasil.");
  } finally {
    if (ticket === generation) useMobility.setState({ busy: false });
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
      // Invalidate a delayed reply too: it must not restore an already expired pair.
      resetMobility();
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
