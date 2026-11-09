/** Additive east-town parcels; the original town and quest coordinates stay fixed. */
export const DISTRICTS = [
  { id: "market", name: "Pasar & Alun-alun", minX: 60, maxX: 148, minZ: -32, maxZ: 56 },
  { id: "park", name: "Taman Kota", minX: 60, maxX: 148, minZ: 56, maxZ: 132 },
] as const;
export type DistrictId = (typeof DISTRICTS)[number]["id"];
export const CITY_LAKE = {
  kind: "pond" as const,
  x: 106,
  z: 88,
  rx: 12,
  rz: 9,
  surface: 0.025,
  depth: 2.2,
  bounds: { minX: 92, maxX: 120, minZ: 77, maxZ: 99 },
};
export const EXPANSION_DESTINATIONS = [
  {
    id: "venue-market",
    label: "Pasar Cung",
    detail: "Kios warga di Jalan Lingkar",
    position: [104, 0, 7],
  },
  {
    id: "venue-square",
    label: "Alun-alun Cung",
    detail: "Panggung dan mini game bersama",
    position: [104, 0, 40],
  },
  {
    id: "venue-park",
    label: "Taman Kota",
    detail: "Danau dan taman warga",
    position: [106, 0, 106],
  },
] as const;
export function districtDistance(x: number, z: number, b: (typeof DISTRICTS)[number]) {
  return Math.hypot(Math.max(b.minX - x, 0, x - b.maxX), Math.max(b.minZ - z, 0, z - b.maxZ));
}
