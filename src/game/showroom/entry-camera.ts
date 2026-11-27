import { MathUtils, Matrix4, Quaternion, Vector3, type Camera } from "three";
import { useControls } from "@/game/player/control-state";
import { resetTouchDrive } from "@/game/player/touch-drive";
import { useGameUi } from "@/state/game-ui-store";
import { SHOWROOM_ROOM } from "./layout";

const DURATION = 3.6;
const HANDOVER = 2.9;
const [roomX, roomY, roomZ] = SHOWROOM_ROOM.origin;

export function skipShowroomIntro() {
  if (useGameUi.getState().showroomIntro) useGameUi.setState({ showroomIntro: false });
}

/** A short camera move through the real gallery, with the usual player orbit underneath. */
export class ShowroomEntryCamera {
  private started = false;
  private elapsed = 0;
  private firstFrame = true;
  private readonly position = new Vector3();
  private readonly target = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly look = new Matrix4();

  observe(inside: boolean, reducedMotion: boolean) {
    const ui = useGameUi.getState();
    if (!inside || ui.portrait || ui.panels > 0 || ui.traveling || reducedMotion) {
      if (inside && !ui.traveling && reducedMotion) this.started = true;
      skipShowroomIntro();
      return;
    }
    if (this.started) return;
    this.started = true;
    resetTouchDrive();
    useControls.getState().consumeJump();
    useGameUi.setState({ showroomIntro: true });
  }

  walkSpeed(position: { z: number }, delta: number, move: Vector3) {
    if (!useGameUi.getState().showroomIntro || this.elapsed > 2.15) return 0;
    const remaining = position.z - (roomZ + 8);
    if (remaining <= 0.03) return 0;
    move.set(0, 0, -1);
    return Math.min(1.55, remaining / Math.max(1 / 60, delta));
  }

  apply(camera: Camera, delta: number) {
    if (!useGameUi.getState().showroomIntro) return;
    if (this.firstFrame) this.firstFrame = false;
    else this.elapsed += Math.max(0, delta);
    if (this.elapsed >= DURATION) {
      skipShowroomIntro();
      return;
    }

    const push = MathUtils.smoothstep(this.elapsed, 0, HANDOVER);
    const pan = MathUtils.smoothstep(this.elapsed, 0.72, 2.7);
    this.position.set(
      roomX + 0.45 + push * 0.45,
      roomY + 2.5 + push * 0.7,
      roomZ + 11.75 - push * 5.75,
    );
    this.target.set(roomX + MathUtils.lerp(-4.5, 4.5, pan), roomY + 1.15, roomZ - 3.5);
    this.look.lookAt(this.position, this.target, camera.up);
    this.rotation.setFromRotationMatrix(this.look);

    const weight = 1 - MathUtils.smoothstep(this.elapsed, HANDOVER, DURATION);
    camera.position.lerp(this.position, weight);
    camera.quaternion.slerp(this.rotation, weight);
  }
}
