/** Canonical WORLD landmarks for Principal Dungeon missions — keep in sync with quest JSON. */

/** Temporary supplier booth, west sidewalk facing the store plaza. */
export const SUPPLIER_TEMP_POST: [number, number, number] = [-14.5, 0, 12.8];

/** Toko Cung rear warehouse receiving dock (behind store, not street-north). */
export const WORLD_WAREHOUSE_DOCK: [number, number, number] = [-3.5, 0, -16.5];

const LANDMARKS: Record<string, [number, number, number]> = {
  "supplier-confirm": SUPPLIER_TEMP_POST,
  "world-warehouse": WORLD_WAREHOUSE_DOCK,
};

/** Resolve authoritative world position for a dungeon objective target. */
export function worldLandmarkFor(target: string, fallback: number[]): [number, number, number] {
  const hit = LANDMARKS[target];
  if (hit) return hit;
  return [fallback[0] ?? 0, fallback[1] ?? 0, fallback[2] ?? 0];
}
