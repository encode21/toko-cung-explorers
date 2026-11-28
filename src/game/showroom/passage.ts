import type { Vector3 } from "three";
import { useWorldEditor } from "@/game/editor/store";
import { useControls } from "@/game/player/control-state";
import { resetTouchDrive } from "@/game/player/touch-drive";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { gameUiBlocked, useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import { showLoader, useTravelScene } from "@/ui/hud/travel-loader";
import { inVenueRoom, MOTOR_VENUE, showroomWalkStep, venueAt, type ShowroomVenue } from "./layout";

type Direction = "enter" | "exit";
let secondsLeft = 0;
/** Dealer yang sedang dimasuki/ditinggalkan; satu jalan pintu aktif dalam satu waktu. */
let walkVenue: ShowroomVenue = MOTOR_VENUE;

function passageAvailable(direction: Direction, venue = walkVenue) {
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
      ? inVenueRoom(venue, game.playerPos[0], game.playerPos[2])
      : useTravelScene.getState().mounted?.art === "kota")
  );
}

export function canStartShowroomWalk(direction: Direction, venue = MOTOR_VENUE) {
  return !gameUiBlocked() && passageAvailable(direction, venue);
}

export function startShowroomWalk(direction: Direction, venue = MOTOR_VENUE) {
  if (!canStartShowroomWalk(direction, venue)) return;
  walkVenue = venue;
  secondsLeft = 3;
  resetTouchDrive();
  useControls.getState().consumeJump();
  useGameUi.setState({ showroomWalk: direction });
}

export function cancelShowroomWalk() {
  if (useGameUi.getState().showroomWalk) useGameUi.setState({ showroomWalk: null });
}

export function exitShowroom() {
  const [x, , z] = useGame.getState().playerPos;
  useGame.getState().requestTeleport((venueAt(x, z) ?? walkVenue).cityReturn);
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
  const { walkTo } = direction === "enter" ? walkVenue.entry : walkVenue.exit;
  const dx = walkTo[0] - position.x;
  const dz = walkTo[2] - position.z;
  const distance = Math.hypot(dx, dz);
  const step = showroomWalkStep(distance, secondsLeft <= 0);
  if (step === "fail") {
    cancelShowroomWalk();
    useGame.getState().setToast("Mundur sebentar, lalu dekati pintu lagi.");
    return 0;
  }
  if (!onFoot) return 0;
  if (step === "walk") {
    move.set(dx, 0, dz);
    return Math.min(2.65, distance / Math.max(1 / 60, delta));
  }

  cancelShowroomWalk();
  if (direction === "enter") {
    showLoader(`Masuk ${walkVenue.name}`, "Menyiapkan galeri kendaraan", "showroom", 650);
    const game = useGame.getState();
    if (game.waypoint === walkVenue.waypoint) game.setWaypoint(null);
    game.requestTeleport(walkVenue.roomSpawn);
  } else {
    showLoader(`Keluar ${walkVenue.name}`, "Menuju pusat kota", "kota", 650);
    exitShowroom();
  }
  return 0;
}
