import { STORE, WAREHOUSE } from "@/game/world/layout";
import {
  contains,
  SIDEWALKS,
  PEDESTRIAN,
  PARKING,
  ROADS,
  DRIVEWAYS,
  GREEN,
} from "@/game/world/outdoor-layout";

/** The world intentionally uses a flat physics plane below its visual paving.
 * Correct the avatar only; do not change canonical physics/network positions. */
export function avatarSurfaceY(p: { x: number; z: number }) {
  if (contains(STORE, p) || contains(WAREHOUSE, p)) return 0.05;
  if (SIDEWALKS.some((b) => contains(b, p))) return 0.085;
  if (PEDESTRIAN.some((b) => contains(b, p))) return 0.057;
  if (DRIVEWAYS.some((b) => contains(b, p))) return 0.0495;
  if (ROADS.some((b) => contains(b, p))) return 0.042;
  if (PARKING.some((b) => contains(b, p))) return 0.044;
  if (GREEN.some((b) => contains(b, p))) return 0.033;
  return -0.03;
}
