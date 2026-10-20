import { create } from "zustand";
import { connectionId, useChannels } from "@/net/channel-store";
import { useMobility, mobilityCommand } from "@/game/mobility/store";
import { useDungeon } from "@/game/dungeon/store";
import { useClub, clubCommand, stopDanceOnMove } from "@/game/club/store";
import { closeFishing } from "@/game/fishing/store";
import { useWorldEditor } from "@/game/editor/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useControls } from "./control-state";
import { useTouchDrive } from "./touch-drive";
import { SPAWN } from "@/game/world/layout";

export const useRecovery = create(() => ({ busy: false }));

/** World recovery keeps the existing lease and asks the server to release shared activities first. */
export async function returnToSpawn() {
  if (
    useRecovery.getState().busy ||
    useMobility.getState().busy ||
    !useChannels.getState().playing ||
    !useControls.getState().playerReady ||
    useDungeon.getState().data?.instance ||
    useDungeon.getState().transition ||
    useWorldEditor.getState().mode === "EDITOR" ||
    useGame.getState().pendingTeleport
  )
    return;
  const room = useChannels.getState().lease?.channel;
  const current = () =>
    useChannels.getState().playing &&
    useChannels.getState().lease?.channel === room &&
    !useDungeon.getState().data?.instance;
  useRecovery.setState({ busy: true });
  try {
    const pair = useMobility
      .getState()
      .carries.find((p) => p.carrier === connectionId || p.passenger === connectionId);
    if (pair) {
      await mobilityCommand("release", { id: pair.id });
      if (!current()) return;
      if (
        useMobility
          .getState()
          .carries.some((p) => p.carrier === connectionId || p.passenger === connectionId)
      )
        throw new Error(useMobility.getState().error || "Gendong belum terlepas. Coba Spawn lagi.");
    }
    if (useMobility.getState().flying) {
      await mobilityCommand("flight", { enabled: false });
      if (!current()) return;
      if (useMobility.getState().flying)
        throw new Error(useMobility.getState().error || "Terbang belum berhenti. Coba Spawn lagi.");
    }
    if (useClub.getState().inside) {
      await clubCommand("exit");
      if (!current()) return;
      if (useClub.getState().inside)
        throw new Error(useClub.getState().error || "Belum bisa keluar dari venue. Coba lagi.");
    }
    if (!current()) return;
    // A new invitation may arrive while an asynchronous venue exit is finishing.
    if (
      useMobility.getState().flying ||
      useMobility
        .getState()
        .carries.some((p) => p.carrier === connectionId || p.passenger === connectionId)
    )
      throw new Error("Interaksi baru sedang aktif. Coba Spawn lagi.");
    closeFishing();
    stopDanceOnMove();
    useTouchDrive.getState().reset();
    useControls.setState({ jumpQueued: false });
    useMobility.setState({ vertical: 0 });
    useHud.getState().setSheet(null);
    useHud.setState({ principalPanel: null });
    useGame.setState({ sitting: false, sittingBenchId: null, overlay: "none", nearby: null });
    useGame.getState().requestTeleport([...SPAWN]);
    useGame.getState().setToast("Kembali ke titik spawn.");
  } catch (error) {
    if (current())
      useGame
        .getState()
        .setToast(error instanceof Error ? error.message : "Belum bisa kembali ke spawn.");
  } finally {
    useRecovery.setState({ busy: false });
  }
}
