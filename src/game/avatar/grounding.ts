import { inBeach, beachFloorY } from "@/game/swimming/model";
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

/** Match visual paving or the beach seabed without moving the canonical physics/network root. */
export function avatarSurfaceY(p: { x: number; z: number }) {
  if (inBeach(p.x, p.z)) return beachFloorY(p.x, p.z);
  if (contains(STORE, p) || contains(WAREHOUSE, p)) return 0.05;
  if (SIDEWALKS.some((b) => contains(b, p))) return 0.085;
  if (PEDESTRIAN.some((b) => contains(b, p))) return 0.057;
  if (DRIVEWAYS.some((b) => contains(b, p))) return 0.0495;
  if (ROADS.some((b) => contains(b, p))) return 0.042;
  if (PARKING.some((b) => contains(b, p))) return 0.044;
  if (GREEN.some((b) => contains(b, p))) return 0.033;
  return -0.03;
}
