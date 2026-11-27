import type { Vector3 } from "three";
import { useWorldEditor } from "@/game/editor/store";
import { useControls } from "@/game/player/control-state";
import { resetTouchDrive } from "@/game/player/touch-drive";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { gameUiBlocked, useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import { showLoader, useTravelScene } from "@/ui/hud/travel-loader";
import {
  isShowroomRoom,
  SHOWROOM_CITY_RETURN,
  SHOWROOM_ENTRY,
  SHOWROOM_EXIT,
  SHOWROOM_NAME,
  SHOWROOM_ROOM_SPAWN,
  SHOWROOM_WAYPOINT,
} from "./layout";

type Direction = "enter" | "exit";
let secondsLeft = 0;

function passageAvailable(direction: Direction) {
  const game = useGame.getState();
  const ui = useGameUi.getState();
  const hud = useHud.getState();
  const channels = useChannels.getState();
  return (
    channels.playing &&
    useControls.getState().playerReady &&
    useWorldEditor.getState().mode === "PLAYER" &&
    !game.pendingTeleport &&
    !game.sitting &&
    !game.inside &&
    game.overlay === "none" &&
    !ui.portrait &&
    ui.panels === 0 &&
    !ui.traveling &&
    !hud.sheet &&
    !hud.principalPanel &&
    (direction === "exit"
      ? isShowroomRoom(game.playerPos[0], game.playerPos[2])
      : useTravelScene.getState().mounted?.art === "kota")
  );
}

export function canStartShowroomWalk(direction: Direction) {
  return !gameUiBlocked() && passageAvailable(direction);
}

export function startShowroomWalk(direction: Direction) {
  if (!canStartShowroomWalk(direction)) return;
  secondsLeft = 3;
  resetTouchDrive();
  useControls.getState().consumeJump();
  useGameUi.setState({ showroomWalk: direction });
}

export function cancelShowroomWalk() {
  if (useGameUi.getState().showroomWalk) useGameUi.setState({ showroomWalk: null });
}

export function exitShowroom() {
  useGame.getState().requestTeleport(SHOWROOM_CITY_RETURN);
}

export function showroomWalkSpeed(
  position: { x: number; z: number },
  delta: number,
  move: Vector3,
  onFoot: boolean,
) {
  const direction = useGameUi.getState().showroomWalk;
  if (!direction) return 0;
  if (!passageAvailable(direction)) {
    cancelShowroomWalk();
    return 0;
  }
  secondsLeft -= Math.max(0, delta);
  if (secondsLeft <= 0) {
    cancelShowroomWalk();
    useGame.getState().setToast("Mundur sebentar, lalu dekati pintu lagi.");
    return 0;
  }
  if (!onFoot) return 0;
  const { walkTo } = direction === "enter" ? SHOWROOM_ENTRY : SHOWROOM_EXIT;
  const dx = walkTo[0] - position.x;
  const dz = walkTo[2] - position.z;
  const distance = Math.hypot(dx, dz);
  if (distance > 0.07) {
    move.set(dx, 0, dz);
    return Math.min(2.65, distance / Math.max(1 / 60, delta));
  }

  cancelShowroomWalk();
  if (direction === "enter") {
    showLoader(`Masuk ${SHOWROOM_NAME}`, "Menyiapkan galeri kendaraan", "showroom", 650);
    const game = useGame.getState();
    if (game.waypoint === SHOWROOM_WAYPOINT) game.setWaypoint(null);
    game.requestTeleport(SHOWROOM_ROOM_SPAWN);
  } else {
    showLoader(`Keluar ${SHOWROOM_NAME}`, "Menuju pusat kota", "kota", 650);
    exitShowroom();
  }
  return 0;
}
