import { Vector3, type Camera, type Object3D } from "three";

/** World DOM stays below the HUD (20): video 0–8, player names 10–19. */
export const WORLD_HTML_LAYERS: Record<"screen" | "playerName", [number, number]> = {
  screen: [8, 0],
  playerName: [19, 10],
};

const projected = new Vector3();

/** Html portals do not inherit Object3D visibility or camera clipping from their avatar. */
export function isWorldLabelVisible(anchor: Object3D, camera: Camera) {
  for (let object: Object3D | null = anchor; object; object = object.parent) {
    if (!object.visible) return false;
  }
  anchor.updateWorldMatrix(true, false);
  camera.updateMatrixWorld();
  projected.setFromMatrixPosition(anchor.matrixWorld).project(camera);
  return Number.isFinite(projected.z) && projected.z >= -1 && projected.z <= 1;
}
