import { MathUtils, Matrix4, Quaternion, Vector3, type PerspectiveCamera } from "three";
import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import { SHOWROOM_ROOM } from "./layout";
import { SHOWROOM_EXHIBITS, type ShowroomExhibitId } from "./models";

interface CatalogFrame {
  id: ShowroomExhibitId;
  centerX: number;
  centerY: number;
  widthFraction: number;
}

let frame: CatalogFrame | null = null;

/** Measure the uncovered part of the viewport where the displayed vehicle belongs. */
export function setShowroomCatalogFrame(id: ShowroomExhibitId, stage: HTMLElement) {
  const viewport = stage.closest(".world-viewport")?.getBoundingClientRect();
  if (!viewport?.width || !viewport.height) return;
  const box = stage.getBoundingClientRect();
  frame = {
    id,
    centerX: ((box.left + box.width / 2 - viewport.left) / viewport.width) * 2 - 1,
    centerY: 1 - ((box.top + box.height / 2 - viewport.top) / viewport.height) * 2,
    widthFraction: box.width / viewport.width,
  };
}

export function clearShowroomCatalogFrame() {
  frame = null;
}

const [roomX, roomY, roomZ] = SHOWROOM_ROOM.origin;

/** Runs after the player orbit. It never changes the player transform or the camera lens. */
export class ShowroomCatalogCamera {
  private active = false;
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly targetPosition = new Vector3();
  private readonly targetRotation = new Quaternion();
  private readonly center = new Vector3();
  private readonly look = new Matrix4();
  private readonly yaw = new Quaternion();
  private readonly pitch = new Quaternion();
  private readonly xAxis = new Vector3(1, 0, 0);
  private readonly yAxis = new Vector3(0, 1, 0);

  apply(camera: PerspectiveCamera, active: boolean, delta: number, reducedMotion: boolean) {
    if (!active || !frame) {
      this.active = false;
      return false;
    }

    const { id, centerX, centerY, widthFraction } = frame;
    const exhibit = SHOWROOM_EXHIBITS.find((candidate) => candidate.id === id);
    if (!exhibit) return false;

    if (!this.active) {
      this.position.copy(camera.position);
      this.rotation.copy(camera.quaternion);
      this.active = true;
    }

    const { model, cameraAngle: angle } = exhibit;
    const [width, height, length] = VEHICLE_DEFINITIONS[model].size;
    const heading = exhibit.yaw + angle;
    const yFov = Math.tan(MathUtils.degToRad(camera.getEffectiveFOV()) / 2);
    const xFov = yFov * camera.aspect;
    const silhouette = width * Math.abs(Math.cos(angle)) + length * Math.abs(Math.sin(angle));
    const fit = silhouette / (2 * xFov * Math.max(widthFraction, 0.3) * 0.76) + length * 0.35;
    const distance = MathUtils.clamp(fit, model === "cung-eclipse" ? 3.6 : 5.1, 8.2);
    this.center.set(roomX + exhibit.x, roomY + 0.48 + height * 0.46, roomZ + exhibit.z);
    this.targetPosition.set(
      this.center.x + Math.sin(heading) * distance,
      this.center.y + distance * 0.26,
      this.center.z + Math.cos(heading) * distance,
    );
    this.look.lookAt(this.targetPosition, this.center, camera.up);
    this.targetRotation
      .setFromRotationMatrix(this.look)
      .multiply(this.yaw.setFromAxisAngle(this.yAxis, Math.atan(centerX * xFov)))
      .multiply(this.pitch.setFromAxisAngle(this.xAxis, -Math.atan(centerY * yFov)));

    const follow = reducedMotion ? 1 : 1 - Math.exp(-11 * Math.min(Math.max(delta, 0), 0.1));
    this.position.lerp(this.targetPosition, follow);
    this.rotation.slerp(this.targetRotation, follow);
    camera.position.copy(this.position);
    camera.quaternion.copy(this.rotation);
    return true;
  }
}
