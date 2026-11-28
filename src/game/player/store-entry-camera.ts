import { MathUtils, Matrix4, Quaternion, Vector3, type Camera } from "three";
import { STORE, STORE_ENTRY_PULSE, WAREHOUSE } from "@/game/world/layout";
import { useGameUi } from "@/state/game-ui-store";
import { showLoader, useLoader } from "@/ui/hud/travel-loader";
import { useControls } from "./control-state";
import { resetTouchDrive } from "./touch-drive";

const TOUR_SECONDS = 3.6;
const HANDOVER_START = 2.95;
const REENTRY_CLEARANCE = 0.45;
const ENTRANCE_WALK_MAX_SECONDS = 1.45;
const ENTRANCE_WALK_DISTANCE = 1.18;
const ENTRANCE_WALK_SPEED = 1.45;
const APPROACH_SPEED = 3.2;
const APPROACH_MAX_SECONDS = 2.6;
const EXIT_WALK_SPEED = 1.65;
const EXIT_WALK_DISTANCE = 1.12;
const EXIT_WALK_MAX_SECONDS = 1.9;
const DOOR_CROSSING_DEPTH = 1.35;
const CAMERA_START = new Vector3(0.35, 2.9, 2.28);
const CAMERA_END = new Vector3(0.8, 2.6, -0.25);
const SHELF_VIEW = new Vector3(-5.3, 1.45, -4.6);
const CASHIER_VIEW = new Vector3(6.15, 1.34, -4.15);

type Position = { x: number; y: number; z: number };
type DoorDirection = "enter" | "exit";
type DoorLoading = { direction: DoorDirection; ready: boolean; unsubscribe: () => void };
type GuidedWalk = { x: number; z: number; speed: number; timeLeft: number };

export function skipStoreIntro() {
  if (useGameUi.getState().storeIntro) useGameUi.setState({ storeIntro: false });
}

/** A local camera pass over the actual retail scene. The normal orbit keeps updating underneath. */
export class StoreEntryCamera {
  private playedThisVisit = false;
  private exitArmed = true;
  private pulseArmed = false;
  private previousZ: number | undefined;
  private loading: DoorLoading | null = null;
  private walk: GuidedWalk | null = null;
  private elapsed = 0;
  private firstTourFrame = false;
  private walkTargetZ = 0;
  private readonly entrancePosition = new Vector3();
  private readonly entranceTarget = new Vector3();
  private readonly position = new Vector3();
  private readonly target = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly look = new Matrix4();

  private clearLoading() {
    this.loading?.unsubscribe();
    this.loading = null;
  }

  private startWalk(walk: GuidedWalk) {
    this.walk = walk;
    resetTouchDrive();
    useControls.getState().consumeJump();
    useGameUi.setState({ storeWalk: true });
  }

  private stopWalk() {
    if (!this.walk) return;
    this.walk = null;
    useGameUi.setState({ storeWalk: false });
  }

  private beginCover(direction: DoorDirection) {
    this.pulseArmed = false;
    this.stopWalk();
    skipStoreIntro();
    const id = showLoader(
      direction === "enter" ? "Masuk Grosir Toko Cung" : "Keluar Grosir Toko Cung",
      direction === "enter" ? "Menyiapkan bagian dalam toko" : "Menyiapkan area luar toko",
      "grosir",
      750,
    );
    const loading: DoorLoading = {
      direction,
      ready: false,
      unsubscribe: useLoader.subscribe(({ loader }, previous) => {
        if (loader === previous.loader || loader?.id === id) return;
        if (!loader && previous.loader?.id === id) loading.ready = true;
        else this.clearLoading();
      }),
    };
    this.loading = loading;
  }

  private finishCover(direction: DoorDirection, position: Position, reducedMotion: boolean) {
    if (direction === "exit") {
      this.startWalk({
        x: position.x,
        z: position.z + EXIT_WALK_DISTANCE,
        speed: EXIT_WALK_SPEED,
        timeLeft: EXIT_WALK_MAX_SECONDS,
      });
      return;
    }
    if (reducedMotion) return;
    this.elapsed = 0;
    this.firstTourFrame = true;
    this.walkTargetZ = position.z - ENTRANCE_WALK_DISTANCE;
    // Start just inside the door: the city is not drawn while inside, so an outside shot shows void.
    this.entrancePosition.set(position.x, 2.25, STORE.maxZ - 0.25);
    this.entranceTarget.set(position.x, 1.05, STORE.maxZ - 4.2);
    resetTouchDrive();
    useControls.getState().consumeJump();
    useGameUi.setState({ storeIntro: true });
  }

  interrupt() {
    this.previousZ = undefined;
    this.pulseArmed = false;
    this.clearLoading();
    this.stopWalk();
    skipStoreIntro();
  }

  observe(
    position: Position,
    {
      inside,
      canPlay,
      continuous,
      reducedMotion,
      delta,
    }: {
      inside: boolean;
      canPlay: boolean;
      continuous: boolean;
      reducedMotion: boolean;
      delta: number;
    },
  ): DoorDirection | undefined {
    const ui = useGameUi.getState();
    if (!continuous || !canPlay || ui.portrait || ui.panels > 0) {
      this.interrupt();
      return;
    }
    const previousZ = this.previousZ;
    this.previousZ = position.z;
    if (reducedMotion) skipStoreIntro();

    if (this.loading) {
      const { direction, ready } = this.loading;
      if ((direction === "enter") !== inside) this.clearLoading();
      else if (ready) {
        this.clearLoading();
        if (!ui.traveling) {
          this.finishCover(direction, position, reducedMotion);
          return direction;
        }
      }
      return;
    }
    if (ui.traveling) {
      this.interrupt();
      return;
    }

    const inOpening =
      previousZ !== undefined &&
      Math.abs(previousZ - STORE.maxZ) < DOOR_CROSSING_DEPTH &&
      Math.abs(position.z - STORE.maxZ) < DOOR_CROSSING_DEPTH &&
      Math.abs(position.x - STORE.doorX) < STORE.doorHalfWidth;
    const entered = inOpening && inside && previousZ >= STORE.maxZ && position.z < STORE.maxZ;
    const exited = inOpening && !inside && previousZ < STORE.maxZ && position.z >= STORE.maxZ;
    if (entered) {
      this.stopWalk();
      if (!this.playedThisVisit && !useLoader.getState().loader) {
        this.playedThisVisit = true;
        this.exitArmed = true;
        this.beginCover("enter");
      }
      return;
    }
    if (exited) {
      if (this.exitArmed && !useLoader.getState().loader) {
        this.exitArmed = false;
        this.beginCover("exit");
      }
      return;
    }

    if (this.walk) {
      this.walk.timeLeft -= Math.max(0, delta);
      if (this.walk.timeLeft <= 0 || this.walkDistance(position, this.walk) <= 0.025)
        this.stopWalk();
    }
    if (inside) {
      if (position.z < STORE.maxZ - REENTRY_CLEARANCE) this.exitArmed = true;
      return;
    }
    skipStoreIntro();
    // Leave a little space around the door before either direction can re-arm.
    if (
      position.x < Math.min(STORE.minX, WAREHOUSE.minX) - REENTRY_CLEARANCE ||
      position.x > Math.max(STORE.maxX, WAREHOUSE.maxX) + REENTRY_CLEARANCE ||
      position.z < WAREHOUSE.minZ - REENTRY_CLEARANCE ||
      position.z > STORE.maxZ + REENTRY_CLEARANCE ||
      position.y > STORE.wallHeight + REENTRY_CLEARANCE
    )
      this.playedThisVisit = false;

    const [pulseX, pulseY, pulseZ] = STORE_ENTRY_PULSE.position;
    const distance = Math.hypot(position.x - pulseX, position.z - pulseZ);
    if (distance > STORE_ENTRY_PULSE.rearmRadius) this.pulseArmed = true;
    if (
      !this.walk &&
      this.pulseArmed &&
      previousZ !== undefined &&
      position.z >= STORE.maxZ &&
      position.y < pulseY + 1.3 &&
      distance < STORE_ENTRY_PULSE.radius
    ) {
      this.pulseArmed = false;
      this.startWalk({
        x: STORE.doorX,
        z: STORE.maxZ - 0.18,
        speed: APPROACH_SPEED,
        timeLeft: APPROACH_MAX_SECONDS,
      });
    }
    return undefined;
  }

  private walkDistance(position: Position, walk: GuidedWalk) {
    return Math.hypot(walk.x - position.x, walk.z - position.z);
  }

  walkSpeed(position: Position, delta: number, direction: Vector3) {
    const limit = Math.max(1 / 60, delta);
    if (this.walk) {
      const distance = this.walkDistance(position, this.walk);
      if (distance <= 0.025) return 0;
      direction.set(this.walk.x - position.x, 0, this.walk.z - position.z);
      return Math.min(this.walk.speed, distance / limit);
    }
    if (!useGameUi.getState().storeIntro || this.elapsed >= ENTRANCE_WALK_MAX_SECONDS) return 0;
    const remaining = position.z - this.walkTargetZ;
    if (remaining <= 0.02) return 0;
    direction.set(0, 0, -1);
    return Math.min(ENTRANCE_WALK_SPEED, remaining / limit);
  }

  apply(camera: Camera, delta: number) {
    if (!useGameUi.getState().storeIntro) return;
    // The first frame's delta belongs to the preceding loading cover.
    if (this.firstTourFrame) this.firstTourFrame = false;
    else this.elapsed += Math.max(0, delta);
    if (this.elapsed >= TOUR_SECONDS) {
      skipStoreIntro();
      return;
    }

    const leaveEntrance = MathUtils.smoothstep(this.elapsed, 0.78, 1.38);
    this.position
      .lerpVectors(CAMERA_START, CAMERA_END, MathUtils.smoothstep(this.elapsed, 0, HANDOVER_START))
      .lerp(this.entrancePosition, 1 - leaveEntrance);
    this.target
      .lerpVectors(SHELF_VIEW, CASHIER_VIEW, MathUtils.smoothstep(this.elapsed, 1.38, 2.7))
      .lerp(this.entranceTarget, 1 - leaveEntrance);
    this.look.lookAt(this.position, this.target, camera.up);
    this.rotation.setFromRotationMatrix(this.look);

    const tourWeight = 1 - MathUtils.smoothstep(this.elapsed, HANDOVER_START, TOUR_SECONDS);
    camera.position.lerp(this.position, tourWeight);
    camera.quaternion.slerp(this.rotation, tourWeight);
  }
}
