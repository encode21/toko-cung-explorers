import type { AvatarAnimation } from "../avatar/avatar-source";
import type { VehiclePose } from "../traffic/traffic-math";
export const AMBIENT_PROFILES = {
  walker: { pause: [5, 12], activity: "Idle" },
  sitter: { pause: [20, 35], activity: "Sit" },
  observer: { pause: [12, 24], activity: "UsePhone" },
  "chat-pair": { pause: [8, 16], activity: "Talk" },
  "crossing-pedestrian": { pause: [12, 22], activity: "Idle" },
  "shop-visitor": { pause: [8, 18], activity: "PickItem" },
} satisfies Record<string, { pause: [number, number]; activity: AvatarAnimation }>;
export type AmbientProfile = keyof typeof AMBIENT_PROFILES;
/** Only commit when traffic cannot reach this marked crossing during traversal. */
export function crossingGap(x: number, seconds: number, vehicles: Iterable<VehiclePose>) {
  for (const v of vehicles) {
    if (v.z < 16 || v.z > 24) continue;
    const approaching = (x - v.x) * v.dx;
    if (
      Math.abs(x - v.x) < 8 ||
      (approaching > 0 && approaching < Math.max(14, v.speed * seconds + 7))
    )
      return false;
  }
  return true;
}
