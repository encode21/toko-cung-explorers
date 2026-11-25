import { BUILDING_LOTS, ROAD_SEGMENTS, type BuildingLot } from "../world/outdoor-layout.ts";

/** City house lots that can show a player's warung. Order must match the server's lot index (lot_count = 25). */
export const WARUNG_LOTS: BuildingLot[] = BUILDING_LOTS.filter((lot) => lot.kind === "house");

/** World point on the pavement in front of a lot (house fronts face local +z). */
export function lotFront(lot: BuildingLot, ahead = 1.8): [number, number] {
  const z = lot.depth / 2 + ahead;
  return [lot.x + Math.sin(lot.rotation) * z, lot.z + Math.cos(lot.rotation) * z];
}

/**
 * Local +z distance from a lot's centre to the middle of the nearest lane of the road its front faces, so the
 * kulakan truck parks on the street rather than in the yard. Falls back to just past the pavement.
 */
export function lotRoadZ(lot: BuildingLot): number {
  const fx = Math.round(Math.sin(lot.rotation)),
    fz = Math.round(Math.cos(lot.rotation));
  let best = Infinity;
  for (const r of ROAD_SEGMENTS) {
    // Only roads running across the lot's facing direction, and passing in front of it.
    if ((r.axis === "x" && fz === 0) || (r.axis === "z" && fx === 0)) continue;
    const along = r.axis === "x" ? lot.x - r.x : lot.z - r.z;
    if (Math.abs(along) > r.length / 2) continue;
    const ahead = r.axis === "x" ? (r.z - lot.z) * fz : (r.x - lot.x) * fx;
    const lane = ahead - r.width / 2 + 1.7;
    if (ahead > lot.depth / 2 && lane < best) best = lane;
  }
  return best <= lot.depth / 2 + 20 ? best : lot.depth / 2 + 3.4;
}
