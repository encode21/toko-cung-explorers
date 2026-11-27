import type { OutdoorPart } from "./OutdoorBatch";

export const CITY_HALL = { x: 128, z: 139, width: 22, depth: 14, height: 27 };
export const CITY_HALL_TERRACE = {
  position: [128, 0.06 - 1.9, 137.1] as [number, number, number],
  bounds: { minX: 115, maxX: 141, minZ: 125.2, maxZ: 149 },
  size: [26, 3.8, 23.8] as [number, number, number],
};
export const MAYOR_POSITION: [number, number, number] = [128, 0.06, 128];
export const COASTAL_PARKING = { minX: 76.5, maxX: 90.8, minZ: 89, maxZ: 115 };
export const PARKING_BAYS = [92, 96, 100, 104, 108, 112].map((z) => ({ x: 87.3, z }));

/** Jakarta-inspired civic facade, authored as shared instanced surfaces. */
export function cityHallArchitecture() {
  const masonry: OutdoorPart[] = [],
    trim: OutdoorPart[] = [],
    glazing: OutdoorPart[] = [];
  const add = (list: OutdoorPart[], p: OutdoorPart["p"], s: OutdoorPart["s"], color: string) =>
    list.push({ p, s, color });
  add(masonry, [0, 4, 0], [22, 8, 14], "#b8a08c");
  add(masonry, [0, 16, 1], [16, 16, 11], "#dad5c7");
  add(masonry, [0, 25, 1], [8, 2, 11], "#e1daca");
  for (const y of [1.8, 4.6])
    for (const x of [-8, -4, 0, 4, 8]) add(glazing, [x, y, -7.04], [2.5, 1.7, 0.08], "#405a58");
  for (let floor = 0; floor < 6; floor++) {
    const y = 9.5 + floor * 2.55;
    for (const x of [-6, -3, 0, 3, 6]) {
      add(glazing, [x, y, -4.56], [1.9, 1.7, 0.08], "#486960");
      add(trim, [x, y - 0.9, -4.67], [2.1, 0.12, 0.3], "#b0b6aa");
    }
    for (const side of [-1, 1])
      for (const z of [-2, 1, 4]) add(glazing, [side * 8.04, y, z], [0.08, 1.7, 1.8], "#486960");
    add(trim, [0, y + 1.15, 1], [16.3, 0.18, 11.3], "#b6b2a6");
  }
  for (const x of [-8, -4, 4, 8]) add(trim, [x, 3, -8.1], [0.55, 6, 1.8], "#e3dbca");
  add(masonry, [0, 6.2, -7.6], [22.7, 0.6, 3.8], "#a38b75");
  add(glazing, [0, 1.6, -7.15], [3.1, 3.2, 0.12], "#233d3a");
  for (const x of [-8, 8]) {
    add(masonry, [x, 9.4, -3.6], [4.2, 2.8, 4.2], "#dbccb4");
    add(glazing, [x, 9.3, -5.73], [2.7, 1.6, 0.08], "#3b453d");
  }
  return { masonry, trim, glazing };
}
