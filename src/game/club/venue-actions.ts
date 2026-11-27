import type { Vector3 } from "three";
import { useWorldEditor, type WorldTarget } from "@/game/editor/store";
import { useControls } from "@/game/player/control-state";
import { resetTouchDrive } from "@/game/player/touch-drive";
import { useChannels } from "@/net/channel-store";
import { useClub, clubCommand, stopDanceOnMove } from "./store";
import { useGame } from "@/state/game-store";
import { useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import { setLocalSocialAnim } from "@/game/social/social-actions";
import { clubDoorLayout } from "./door-layout";
import { atBar } from "./venue-layout";

type Point = { x: number; z: number };
type DoorWalk = {
  door: ReturnType<typeof clubDoorLayout>;
  alignAt: Point;
  remaining: number;
  aligned: boolean;
  submitting: boolean;
};

const WALK_SPEED = 2.7;
const WALK_TIMEOUT = 3.5;
const ARRIVAL_DISTANCE = 0.06;
let doorWalk: DoorWalk | null = null;

export function takeDrink() {
  if (!useClub.getState().inside || !atBar(useGame.getState().playerPos)) return;
  if (useGame.getState().sitting) return;
  stopDanceOnMove();
  setLocalSocialAnim("Drink", 3200);
  useGame.getState().setToast("Es jeruk Cung · Selamat menikmati!");
}

function inIndoorClub() {
  const { inside, outdoor } = useClub.getState();
  return inside && !outdoor;
}

function canWalkToClubDoor(exit: boolean) {
  const ui = useGameUi.getState();
  const game = useGame.getState();
  const hud = useHud.getState();
  const { playing, lease } = useChannels.getState();
  return (
    useControls.getState().playerReady &&
    playing &&
    !!lease?.channel.startsWith("CHANNEL-") &&
    useWorldEditor.getState().mode === "PLAYER" &&
    exit === inIndoorClub() &&
    !ui.portrait &&
    !ui.panels &&
    !ui.traveling &&
    !ui.storeIntro &&
    !ui.storeWalk &&
    !ui.warungWalk &&
    !hud.sheet &&
    !hud.principalPanel &&
    game.overlay === "none" &&
    !game.pendingTeleport &&
    !game.sitting &&
    !game.inside
  );
}

export function canStartClubDoorWalk(target: WorldTarget) {
  return (
    !doorWalk &&
    !useClub.getState().busy &&
    target.active &&
    target.type === "CLUB_ENTRANCE" &&
    canWalkToClubDoor(target.tags.includes("club-exit"))
  );
}

export function startClubDoorWalk(target: WorldTarget) {
  if (!canStartClubDoorWalk(target)) return;
  const door = clubDoorLayout(target);
  const [x, y, z] = useGame.getState().playerPos;
  if (
    Math.hypot(x - door.marker[0], z - door.marker[2]) >= 1 ||
    Math.abs(y - 0.83 - door.marker[1]) >= 1.5
  )
    return;

  doorWalk = {
    door,
    alignAt: {
      x: door.position[0] + Math.sin(door.yaw) * 0.8,
      z: door.position[2] + Math.cos(door.yaw) * 0.8,
    },
    remaining: WALK_TIMEOUT,
    aligned: false,
    submitting: false,
  };
  resetTouchDrive();
  useControls.getState().consumeJump();
  useGameUi.setState({ clubWalk: true });
}

export function cancelClubDoorWalk() {
  if (!doorWalk) return;
  doorWalk = null;
  useControls.getState().consumeJump();
  useGameUi.setState({ clubWalk: false });
}

async function crossClubDoor(walk: DoorWalk) {
  walk.submitting = true;
  await clubCommand(walk.door.exit ? "exit" : "enter");
  if (doorWalk !== walk) return;
  cancelClubDoorWalk();
  if (walk.door.exit === inIndoorClub())
    useGame
      .getState()
      .setToast(useClub.getState().error || "Pintu belum bisa dilewati. Coba lagi.");
}

/** Feed the usual controller so the guided steps keep physics and the walk animation. */
export function clubDoorWalkSpeed(
  position: Point,
  delta: number,
  direction: Vector3,
  onFoot: boolean,
) {
  const walk = doorWalk;
  if (!walk || walk.submitting) return 0;
  if (!canWalkToClubDoor(walk.door.exit)) {
    cancelClubDoorWalk();
    return 0;
  }
  walk.remaining -= Math.max(0, delta);
  if (walk.remaining <= 0) {
    cancelClubDoorWalk();
    useGame.getState().setToast("Pintu belum bisa dilewati. Mundur sebentar, lalu coba lagi.");
    return 0;
  }
  if (!onFoot) return 0;

  const { door, alignAt } = walk;
  const across =
    (position.x - alignAt.x) * Math.cos(door.yaw) - (position.z - alignAt.z) * Math.sin(door.yaw);
  if (Math.abs(across) < 0.16) walk.aligned = true;
  const dx = (walk.aligned ? door.walkTo[0] : alignAt.x) - position.x;
  const dz = (walk.aligned ? door.walkTo[2] : alignAt.z) - position.z;
  const distance = Math.hypot(dx, dz);
  if (walk.aligned && distance <= ARRIVAL_DISTANCE) {
    void crossClubDoor(walk);
    return 0;
  }
  direction.set(dx, 0, dz);
  return Math.min(WALK_SPEED, distance / Math.max(1 / 60, delta));
}
