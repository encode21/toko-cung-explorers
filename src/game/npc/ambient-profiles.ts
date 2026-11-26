import type { AvatarAnimation } from "../avatar/avatar-source";
import { projectedExtent, type VehiclePose } from "../traffic/traffic-math.ts";
import type { Bounds } from "../world/outdoor-layout";
export const AMBIENT_PROFILES = {
  walker: { pause: [5, 12], activity: "Idle" },
  sitter: { pause: [20, 35], activity: "Sit" },
  observer: { pause: [12, 24], activity: "UsePhone" },
  "chat-pair": { pause: [8, 16], activity: "Talk" },
  "crossing-pedestrian": { pause: [12, 22], activity: "Idle" },
  "shop-visitor": { pause: [8, 18], activity: "PickItem" },
} satisfies Record<string, { pause: [number, number]; activity: AvatarAnimation }>;
export type AmbientProfile = keyof typeof AMBIENT_PROFILES;
/** Wait for traffic occupying or approaching the zebra, but allow a queue stopped behind the line. */
export function crossingGap(cross: Bounds, seconds: number, vehicles: Iterable<VehiclePose>) {
  for (const v of vehicles) {
    const endX = v.x + v.dx * v.speed * seconds;
    const endZ = v.z + v.dz * v.speed * seconds;
    const halfX = projectedExtent(v, 1, 0) + 0.25;
    const halfZ = projectedExtent(v, 0, 1) + 0.25;
    if (
      Math.min(v.x, endX) - halfX <= cross.maxX &&
      Math.max(v.x, endX) + halfX >= cross.minX &&
      Math.min(v.z, endZ) - halfZ <= cross.maxZ &&
      Math.max(v.z, endZ) + halfZ >= cross.minZ
    )
      return false;
  }
  return true;
}
