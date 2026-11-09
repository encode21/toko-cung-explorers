import { create } from "zustand";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { gameUiBlocked } from "@/state/game-ui-store";
import { connectionId, useChannels } from "@/net/channel-store";
import { useControls } from "@/game/player/control-state";
import { useTouchDrive } from "@/game/player/touch-drive";
import { useDungeon } from "@/game/dungeon/store";
import { useClub } from "@/game/club/store";
import { useMobility } from "@/game/mobility/store";
import { useFishing } from "@/game/fishing/store";
import { useMissions } from "@/game/missions/store";
import { useRecovery } from "@/game/player/recovery";
import { useWorldEditor } from "@/game/editor/store";
import { useObby } from "@/game/obby/store";
import { vehicleFor } from "@/game/vehicles/model";
import { miniParticipant } from "@/game/minigames/store";
import { advanceMountainProgress, emptyMountainProgress, type MountainProgress } from "./progress";
import {
  CITY_HELIPAD,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_CHECKPOINTS,
  isMountainPosition,
  mountainRespawn,
  type WorldLocation,
} from "./model";
import { playMountainCue } from "./audio";

export const HELICOPTER_FLIGHT_MS = 2600;
export interface MountainFlight {
  from: WorldLocation;
  to: WorldLocation;
  startedAt: number;
  room: string | null;
}
interface MountainState extends MountainProgress {
  pulseAt: number;
  summitOpen: boolean;
  returnToBasecamp: () => void;
  flight: MountainFlight | null;
  flashlightOwned: boolean;
  flashlightEquipped: boolean;
  flashlightOn: boolean;
  reach: (checkpoint: number) => void;
  equipFlashlight: () => void;
  toggleFlashlight: () => void;
  stowFlashlight: () => void;
  respawn: () => void;
  resetRun: () => void;
}
export function helicopterPad(location: WorldLocation) {
  return location === "city" ? CITY_HELIPAD : MOUNTAIN_HELIPAD;
}
export function nearHelicopter(location: WorldLocation) {
  const p = useGame.getState().playerPos;
  const b = helicopterPad(location).boarding;
  return Math.hypot(p[0] - b[0], p[2] - b[2]) <= 3.5 && Math.abs(p[1] - 0.83 - b[1]) <= 1.5;
}
// atArrival: the player was locked in flight, so a background mobility request (e.g. auto vehicle-spawn) is not an activity.
function activityBlock(atArrival = false) {
  if (useDungeon.getState().data?.instance || useDungeon.getState().transition)
    return "Selesaikan atau keluar dari misi Principal dahulu.";
  if (useClub.getState().inside) return "Keluar dari venue dahulu.";
  const mobility = useMobility.getState();
  if (
    mobility.flying ||
    (!atArrival && mobility.busy) ||
    mobility.carries.some((p) => p.carrier === connectionId || p.passenger === connectionId)
  )
    return "Turun dari mode terbang atau gendong dahulu.";
  if (vehicleFor(mobility.vehicles ?? [], connectionId)) return "Turun dari kendaraan dahulu.";
  if (miniParticipant()) return "Keluar dari ronde permainan dahulu.";
  if (useFishing.getState().open) return "Selesaikan memancing dahulu.";
  if (useMissions.getState().session.active?.truck) return "Selesaikan pengiriman truk dahulu.";
  if (useRecovery.getState().busy) return "Tunggu sampai kembali ke spawn.";
  return null;
}
function available() {
  const g = useGame.getState();
  return (
    useChannels.getState().playing &&
    useControls.getState().playerReady &&
    useWorldEditor.getState().mode === "PLAYER" &&
    !g.pendingTeleport &&
    !g.sitting &&
    g.overlay === "none" &&
    !useHud.getState().sheet &&
    !useHud.getState().principalPanel &&
    !gameUiBlocked()
  );
}
export function helicopterBlockReason() {
  return activityBlock();
}
function canUseFlashlight() {
  const p = useGame.getState().playerPos;
  return (
    available() &&
    !useMountain.getState().flight &&
    !activityBlock() &&
    isMountainPosition(p[0], p[2])
  );
}
export const useMountain = create<MountainState>((set, get) => ({
  ...emptyMountainProgress(),
  pulseAt: 0,
  summitOpen: false,
  returnToBasecamp: () => {
    const game = useGame.getState();
    if (
      !get().completed ||
      get().flight ||
      game.pendingTeleport ||
      activityBlock() ||
      !useChannels.getState().playing ||
      !isMountainPosition(game.playerPos[0], game.playerPos[2])
    )
      return;
    set({ ...emptyMountainProgress(), pulseAt: 0, summitOpen: false });
    useTouchDrive.getState().reset();
    useControls.setState({ jumpQueued: false });
    game.requestTeleport([...MOUNTAIN_HELIPAD.spawn]);
    game.setToast("Kembali ke basecamp. Siap mendaki lagi!");
  },
  flight: null,
  flashlightOwned: false,
  flashlightEquipped: false,
  flashlightOn: false,
  reach: (reached) => {
    const previous = get();
    if (previous.flight) return;
    const next = advanceMountainProgress(previous, reached);
    if (next === previous) return;
    set({
      checkpoint: next.checkpoint,
      completed: next.completed,
      pulseAt: Date.now(),
      summitOpen: next.completed,
    });
    playMountainCue(next.completed ? "summit" : "checkpoint");
    useGame
      .getState()
      .setToast(
        next.completed
          ? "Selamat, kamu sampai di puncak!"
          : `CP ${reached} aktif · ${MOUNTAIN_CHECKPOINTS.find((p) => p.id === reached)?.name ?? "Pos pendakian"}`,
      );
  },
  equipFlashlight: () => {
    if (!get().flashlightOwned || !canUseFlashlight()) return;
    set({ flashlightEquipped: true });
  },
  toggleFlashlight: () => {
    if (!get().flashlightOwned || !get().flashlightEquipped || !canUseFlashlight()) return;
    set({ flashlightOn: !get().flashlightOn });
    playMountainCue("flashlight");
  },
  stowFlashlight: () => set({ flashlightEquipped: false, flashlightOn: false }),
  respawn: () => {
    const p = useGame.getState().playerPos;
    if (!isMountainPosition(p[0], p[2]) || get().flight || activityBlock() || !available()) return;
    useTouchDrive.getState().reset();
    useControls.setState({ jumpQueued: false });
    useGame.getState().requestTeleport(mountainRespawn(get().checkpoint));
    useGame
      .getState()
      .setToast(get().checkpoint ? `Kembali ke CP ${get().checkpoint}.` : "Kembali ke basecamp.");
  },
  resetRun: () => {
    if (!available() || get().flight || activityBlock() || !nearHelicopter("mountain")) return;
    set({ ...emptyMountainProgress(), pulseAt: 0 });
    useGame.getState().setToast("Pendakian baru dimulai dari basecamp.");
  },
}));

/** Called by the shared F/touch action resolver; distance and activity are rechecked here. */
export function boardHelicopter(from: WorldLocation) {
  if (!available() || useMountain.getState().flight || !nearHelicopter(from)) return;
  const blocked = activityBlock();
  if (blocked) {
    useGame.getState().setToast(blocked);
    return;
  }
  useTouchDrive.getState().reset();
  useControls.setState({ jumpQueued: false });
  useObby.getState().reset();
  useMountain.getState().stowFlashlight();
  useMountain.setState({
    flight: {
      from,
      to: from === "city" ? "mountain" : "city",
      startedAt: Date.now(),
      room: useChannels.getState().lease?.channel ?? null,
    },
  });
  playMountainCue("flight");
}
export function finishHelicopterFlight(flight: MountainFlight) {
  if (useMountain.getState().flight !== flight) return;
  const blocked =
    !useChannels.getState().playing ||
    (useChannels.getState().lease?.channel ?? null) !== flight.room
      ? "Channel berganti saat terbang."
      : !nearHelicopter(flight.from)
        ? "Kamu bergeser dari helipad."
        : (activityBlock(true) ??
          (useGame.getState().pendingTeleport ? "Perpindahan lain sedang berjalan." : null));
  if (blocked) {
    useMountain.setState({ flight: null });
    useGame.getState().setToast(`Penerbangan dibatalkan. ${blocked}`);
    return;
  }
  useMountain.setState({
    flight: null,
    ...(flight.to === "mountain"
      ? { ...emptyMountainProgress(), pulseAt: 0, summitOpen: false, flashlightOwned: true }
      : {}),
  });
  useTouchDrive.getState().reset();
  useControls.setState({ jumpQueued: false });
  useGame.getState().setWaypoint(null);
  useGame.getState().requestTeleport([...helicopterPad(flight.to).spawn]);
  useGame
    .getState()
    .setToast(
      flight.to === "mountain"
        ? "Tiba di basecamp · Senter tersedia. Ikuti jalur ke CP 1."
        : "Tiba di Pusat Kota. Selamat datang kembali!",
    );
}
export function resetMountainSession() {
  useMountain.setState({
    ...emptyMountainProgress(),
    pulseAt: 0,
    summitOpen: false,
    flight: null,
    flashlightOwned: false,
    flashlightEquipped: false,
    flashlightOn: false,
  });
}
