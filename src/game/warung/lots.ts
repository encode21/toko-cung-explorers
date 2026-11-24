import { BUILDING_LOTS, type BuildingLot } from "../world/outdoor-layout.ts";

/** City house lots that can show a player's warung. Order must match the server's lot index (lot_count = 25). */
export const WARUNG_LOTS: BuildingLot[] = BUILDING_LOTS.filter((lot) => lot.kind === "house");

/** World point on the pavement in front of a lot (house fronts face local +z). */
export function lotFront(lot: BuildingLot, ahead = 1.8): [number, number] {
  const z = lot.depth / 2 + ahead;
  return [lot.x + Math.sin(lot.rotation) * z, lot.z + Math.cos(lot.rotation) * z];
}
