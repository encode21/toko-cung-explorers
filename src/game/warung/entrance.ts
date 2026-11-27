import { create } from "zustand";
import { houseFront, housePose, ownPorchWarung, type GangData } from "@/game/gang/model";
import { useGang } from "@/game/gang/store";
import { useControls } from "@/game/player/control-state";
import { resetTouchDrive } from "@/game/player/touch-drive";
import { enterHome, useHome } from "@/game/home/store";
import { useUsaha } from "@/game/usaha/store";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import type { BuildingLot } from "@/game/world/outdoor-layout";
import type { Vector3 } from "three";
import { WARUNG_LOTS, lotFront } from "./lots";
import { lotFit, warungDoorFront } from "./storefront";
import { canEnterWarungFromWorld, enterWarung, useWarung } from "./store";

type Point = { x: number; z: number };
export type WarungEntrance = {
  id: number;
  ring: [number, number, number];
  align: Point;
  inside: Point;
  outward: Point;
  unavailable: () => string | null;
  home?: { accessible: () => boolean; warungUnavailable: () => string | null };
};

const WALK_SPEED = 2.8;
const MAX_WALK_SECONDS = 3.25;
const ARRIVAL_DISTANCE = 0.08;
const SHOP_UNAVAILABLE = "Warung ini sudah pindah atau tidak tersedia.";

function entrance(
  id: number,
  origin: Point,
  yaw: number,
  front: number,
  ring: WarungEntrance["ring"],
  unavailable: WarungEntrance["unavailable"],
): WarungEntrance {
  const outward = { x: Math.sin(yaw), z: Math.cos(yaw) };
  const at = (depth: number) => ({
    x: origin.x + outward.x * depth,
    z: origin.z + outward.z * depth,
  });
  return { id, ring, align: at(front + 0.46), inside: at(front - 0.65), outward, unavailable };
}

export function gangWarungEntrance(id: number, house: number, layout: GangData["layout"]) {
  const p = housePose(house, layout);
  const currentHouse = () => {
    const { data, inside } = useGang.getState();
    const origin = data?.layout.origin;
    if (
      !data ||
      inside !== data.gang ||
      origin?.[0] !== layout.origin[0] ||
      origin[2] !== layout.origin[2]
    )
      return null;
    const home = data.houses.find((h) => h.number === house);
    return home?.warung?.id === id && home.warung.lot === null ? { data, home } : null;
  };
  const homeAccessible = () => {
    const current = currentHouse();
    return !!current && ownPorchWarung(current.data)?.id === id;
  };
  const warungUnavailable = () => {
    const current = currentHouse();
    if (!current) return SHOP_UNAVAILABLE;
    return current.home.inactive ? "Warung sedang tidak aktif." : null;
  };
  return {
    ...entrance(
      id,
      { x: layout.origin[0] + p.x, z: layout.origin[2] + p.z },
      p.yaw,
      warungDoorFront(),
      houseFront(house, layout),
      () => (homeAccessible() ? null : warungUnavailable()),
    ),
    home: { accessible: homeAccessible, warungUnavailable },
  };
}

export function cityWarungEntrance(id: number, lot: BuildingLot) {
  const [x, z] = lotFront(lot);
  return entrance(
    id,
    lot,
    lot.rotation,
    warungDoorFront(lotFit(lot.width, lot.depth)),
    [x, 0, z],
    () => {
      const { lots, data } = useWarung.getState();
      const card = lots.find((entry) => entry.id === id && WARUNG_LOTS[entry.lot] === lot);
      if (!card) return SHOP_UNAVAILABLE;
      return card.sealed && data?.warung?.id !== id
        ? "Warung ini disegel dan belum menerima pengunjung."
        : null;
    },
  );
}

let walk: { entrance: WarungEntrance; remaining: number; aligned: boolean } | null = null;
export const useWarungEntranceChoice = create<{ target: WarungEntrance | null }>(() => ({
  target: null,
}));
const doorReturns = new WeakSet<[number, number, number]>();

function doorReturn(ring: WarungEntrance["ring"]) {
  const point: [number, number, number] = [ring[0], 0.83, ring[2]];
  doorReturns.add(point);
  return point;
}

/** The queued return tuple keeps its identity through the room transition. */
export function isWarungDoorReturn(point: [number, number, number]) {
  return doorReturns.has(point);
}

function canWalkToEntrance() {
  const ui = useGameUi.getState();
  const game = useGame.getState();
  const hud = useHud.getState();
  return (
    useControls.getState().playerReady &&
    useChannels.getState().playing &&
    !ui.portrait &&
    !ui.panels &&
    !ui.traveling &&
    !ui.storeIntro &&
    !ui.storeWalk &&
    !hud.sheet &&
    !hud.principalPanel &&
    game.overlay === "none" &&
    !game.sitting &&
    !game.inside &&
    !useHome.getState().inside &&
    !useUsaha.getState().inside &&
    canEnterWarungFromWorld()
  );
}

export function canStartWarungEntry() {
  return (
    !walk &&
    !useWarungEntranceChoice.getState().target &&
    !useWarung.getState().busy &&
    canWalkToEntrance()
  );
}

export function startWarungEntry(target: WarungEntrance) {
  if (!canStartWarungEntry()) return;
  const [x, , z] = useGame.getState().playerPos;
  if (Math.hypot(target.ring[0] - x, target.ring[2] - z) >= 4.1) return;
  const status = target.unavailable();
  if (status) {
    useGame.getState().setToast(status);
    return;
  }
  walk = { entrance: target, remaining: MAX_WALK_SECONDS, aligned: false };
  resetTouchDrive();
  useControls.getState().consumeJump();
  useGameUi.setState({ warungWalk: true });
}

export function cancelWarungEntry() {
  if (!walk && !useWarungEntranceChoice.getState().target) return;
  walk = null;
  useWarungEntranceChoice.setState({ target: null });
  useControls.getState().consumeJump();
  useGameUi.setState({ warungWalk: false });
}

export function finishWarungEntranceChoice(destination: "home" | "warung" | "cancel") {
  const { target } = useWarungEntranceChoice.getState();
  if (!target) return;
  cancelWarungEntry();
  const game = useGame.getState();
  if (game.pendingTeleport || useGameUi.getState().traveling || !useChannels.getState().playing)
    return;

  if (destination === "home" && target.home?.accessible()) {
    enterHome();
    return;
  }
  const status = target.home?.warungUnavailable();
  if (destination === "warung" && !status) {
    void enterFromDoor(target);
    return;
  }
  if (destination !== "cancel") game.setToast(status ?? SHOP_UNAVAILABLE);
  useGame.setState({ pendingTeleport: doorReturn(target.ring) });
}

async function enterFromDoor({ id, ring, inside }: WarungEntrance) {
  const returnTo = doorReturn(ring);
  const lease = useChannels.getState().lease;
  if (await enterWarung(id, returnTo)) return;

  const channels = useChannels.getState();
  const game = useGame.getState();
  const [x, , z] = game.playerPos;
  if (
    channels.playing &&
    channels.lease?.playerId === lease?.playerId &&
    channels.lease?.channel === lease?.channel &&
    !useGameUi.getState().traveling &&
    !game.pendingTeleport &&
    !useWarung.getState().inside &&
    Math.hypot(inside.x - x, inside.z - z) < 0.65
  ) {
    const error = useWarung.getState().error;
    if (error) game.setToast(error);
    // This also disarms the ring, requiring a fresh approach after a rejected visit.
    useGame.setState({ pendingTeleport: returnTo });
  }
}

/** Feed the regular Player movement so collisions and the Walk blend stay active. */
export function warungEntryWalkSpeed(
  position: Point,
  delta: number,
  direction: Vector3,
  canMove: boolean,
) {
  if (!walk) return 0;
  walk.remaining -= Math.max(0, delta);
  if (walk.remaining <= 0 || !canWalkToEntrance()) {
    cancelWarungEntry();
    return 0;
  }
  if (!canMove) return 0;
  const targetEntrance = walk.entrance;
  const status = targetEntrance.unavailable();
  if (status) {
    cancelWarungEntry();
    useGame.getState().setToast(status);
    useGame.setState({ pendingTeleport: doorReturn(targetEntrance.ring) });
    return 0;
  }
  const { align, inside, outward } = targetEntrance;
  // Center the capsule before proceeding through the doorway if the ring was approached from the side.
  const across = (position.x - align.x) * outward.z - (position.z - align.z) * outward.x;
  if (Math.abs(across) < 0.16) walk.aligned = true;
  const target = walk.aligned ? inside : align;
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const distance = Math.hypot(dx, dz);
  if (walk.aligned && distance <= ARRIVAL_DISTANCE) {
    if (targetEntrance.home?.accessible()) {
      walk = null;
      useWarungEntranceChoice.setState({ target: targetEntrance });
      return 0;
    }
    if (useWarung.getState().busy) return 0;
    cancelWarungEntry();
    void enterFromDoor(targetEntrance);
    return 0;
  }
  direction.set(dx, 0, dz);
  return Math.min(WALK_SPEED, distance / Math.max(1 / 60, delta));
}
