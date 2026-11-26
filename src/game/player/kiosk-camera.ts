import { MathUtils, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";

type Kiosk = { position: readonly number[]; yaw: number };
type ViewSize = { width: number; height: number; sceneWidth: number; sceneHeight: number };
type CameraView = NonNullable<PerspectiveCamera["view"]>;

/** Camera-only close-up. The kiosk's local +Z is the touchscreen side. */
export function kioskCameraPose(
  camera: PerspectiveCamera,
  kiosk: Kiosk,
  view: ViewSize,
  position: Vector3,
  target: Vector3,
) {
  const { width, height } = view;
  const sceneWidth = MathUtils.clamp(view.sceneWidth, 1, width);
  const sceneHeight = MathUtils.clamp(view.sceneHeight, 1, height);
  const halfFov = Math.tan(MathUtils.degToRad(camera.getEffectiveFOV()) / 2);
  // Keep the entire 1.9 m pedestal clear of the bottom basket overlay and side drawer.
  const verticalFit = 2.05 / (2 * halfFov * 0.8 * (sceneHeight / height));
  const horizontalFit = 0.95 / (2 * halfFov * (width / height) * 0.7 * (sceneWidth / width));
  const distance = Math.max(2.2, verticalFit, horizontalFit);
  const heading = kiosk.yaw + 0.12;
  target.set(kiosk.position[0]!, kiosk.position[1]! + 0.96, kiosk.position[2]!);
  position.set(
    target.x + Math.sin(heading) * distance,
    target.y + distance * 0.12,
    target.z + Math.cos(heading) * distance,
  );
}

/**
 * Applied after the normal orbit has computed its pose. Orbit/yaw/zoom and the player physics
 * remain untouched; closing blends back to that live orbit and restores its projection.
 */
export class KioskCameraFocus {
  private saved = false;
  private blend = 0;
  private sceneWidthFraction = 1;
  private sceneHeightFraction = 1;
  private originalView: CameraView | null = null;
  private readonly originalPosition = new Vector3();
  private readonly originalQuaternion = new Quaternion();
  private readonly position = new Vector3();
  private readonly quaternion = new Quaternion();
  private readonly targetPosition = new Vector3();
  private readonly targetLook = new Vector3();
  private readonly targetQuaternion = new Quaternion();
  private readonly lookMatrix = new Matrix4();

  update(
    camera: PerspectiveCamera,
    active: boolean,
    delta: number,
    reducedMotion: boolean,
    kiosk: Kiosk,
    view: ViewSize,
  ) {
    if (view.width <= 0 || view.height <= 0) {
      this.reset(camera);
      return false;
    }
    const visible = active && view.sceneWidth > 0 && view.sceneHeight > 0;
    if (visible) {
      this.sceneWidthFraction = MathUtils.clamp(view.sceneWidth / view.width, 0, 1);
      this.sceneHeightFraction = MathUtils.clamp(view.sceneHeight / view.height, 0, 1);
    }
    if (visible && !this.saved) {
      this.originalView = camera.view ? { ...camera.view } : null;
      this.originalPosition.copy(camera.position);
      this.originalQuaternion.copy(camera.quaternion);
      this.position.copy(camera.position);
      this.quaternion.copy(camera.quaternion);
      this.saved = true;
    }
    if (!this.saved) return false;

    const follow = reducedMotion ? 1 : 1 - Math.exp(-9 * Math.max(0, Math.min(delta, 0.1)));
    this.blend = MathUtils.lerp(this.blend, visible ? 1 : 0, follow);
    if (visible) {
      kioskCameraPose(camera, kiosk, view, this.targetPosition, this.targetLook);
      this.lookMatrix.lookAt(this.targetPosition, this.targetLook, camera.up);
      this.targetQuaternion.setFromRotationMatrix(this.lookMatrix);
    } else {
      this.targetPosition.copy(camera.position);
      this.targetQuaternion.copy(camera.quaternion);
    }
    this.position.lerp(this.targetPosition, follow);
    this.quaternion.slerp(this.targetQuaternion, follow);

    if (!visible && (reducedMotion || this.blend < 0.002)) {
      // Keep the normal orbit pose already written this frame; restore exact prior lens settings.
      this.restoreProjection(camera);
      this.saved = false;
      this.blend = 0;
      return false;
    }
    camera.position.copy(this.position);
    camera.quaternion.copy(this.quaternion);
    const originalX = this.originalView?.enabled ? this.originalView.offsetX : 0;
    const originalY = this.originalView?.enabled ? this.originalView.offsetY : 0;
    // An off-axis view centers the kiosk in the uncovered left rectangle, not behind the drawer.
    camera.setViewOffset(
      view.width,
      view.height,
      MathUtils.lerp(originalX, (view.width * (1 - this.sceneWidthFraction)) / 2, this.blend),
      MathUtils.lerp(originalY, (view.height * (1 - this.sceneHeightFraction)) / 2, this.blend),
      view.width,
      view.height,
    );
    return true;
  }

  /** Cleanup also handles travel/unmount in the middle of the entrance. */
  reset(camera: PerspectiveCamera) {
    if (this.saved) {
      camera.position.copy(this.originalPosition);
      camera.quaternion.copy(this.originalQuaternion);
      this.restoreProjection(camera);
    }
    this.saved = false;
    this.blend = 0;
  }

  private restoreProjection(camera: PerspectiveCamera) {
    camera.view = this.originalView ? { ...this.originalView } : null;
    camera.updateProjectionMatrix();
  }
}
