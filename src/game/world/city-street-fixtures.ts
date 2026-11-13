import { ROAD_SEGMENTS, SIDEWALKS, ROADS, DRIVEWAYS, PARKING, contains } from "./outdoor-layout";
import { TREE_SPOTS } from "./street-props";
import { CITY_AD_SLOTS } from "./city-advertising";
import type { Vec3 } from "./layout";
export const CITY_LAMP_BASE_HALF = 0.115;

const lamps: Vec3[] = [];
for (const road of ROAD_SEGMENTS) {
  const extent = Math.min(road.length / 2 - 3, 88);
  for (let along = -extent + 7; along < extent; along += 18) {
    for (const side of [-1, 1]) {
      const x = road.x + (road.axis === "x" ? along : side * (road.width / 2 + 1.65));
      const z = road.z + (road.axis === "z" ? along : side * (road.width / 2 + 1.65));
      const inTown =
        (x > -60 && x < 60 && z > -55 && z < 55) || (x > 66 && x < 142 && z > -30 && z < 126);
      if (!inTown || !SIDEWALKS.some((walk) => contains(walk, { x, z }, 0.1))) continue;
      if ([...ROADS, ...DRIVEWAYS, ...PARKING].some((zone) => contains(zone, { x, z }, -0.45)))
        continue;
      if (TREE_SPOTS.some((tree) => Math.hypot(x - tree.x, z - tree.z) < 2.2)) continue;
      if (CITY_AD_SLOTS.some((slot) => Math.hypot(x - slot.position[0], z - slot.position[2]) < 2))
        continue;
      lamps.push([x, 4.32, z]);
    }
  }
}
export const CITY_LAMP_POSITIONS: readonly Vec3[] = lamps;
