export interface GroundContact {
  x: number;
  y: number;
  z: number;
  width: number;
  length: number;
  yaw: number;
}
/** Visual anchors only: never physics, camera blockers or interaction targets. */
export const groundContacts = new Map<string, GroundContact[]>();
