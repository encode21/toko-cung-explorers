import { BUILDING_LOTS, rect } from "./outdoor-layout.ts";
import type { OutdoorPart } from "./OutdoorBatch";

const lot = BUILDING_LOTS.find((l) => l.id === "partner-4")!;
const plinthHeight = 0.24;
const plinthTop = 0.1;
export const MOSQUE = {
  position: [lot.x, plinthTop - plinthHeight, lot.z] as [number, number, number],
  rotation: lot.rotation,
  bounds: rect(lot.x, lot.z, 12, 13),
  plinthTop,
  dome: [0, 9, -1.6] as [number, number, number],
  domeRadius: 3.1,
};

// A waterfront terrace connects the south sidewalk to the courtyard and supports the rear hall.
const terraceSize: [number, number, number] = [16, 3.8, 15.6];
const terraceZ = lot.z + 0.9;
const terraceTop = 0.06;
export const MOSQUE_TERRACE = {
  bounds: rect(lot.x, terraceZ, terraceSize[0], terraceSize[2]),
  position: [lot.x, terraceTop - terraceSize[1] / 2, terraceZ] as [number, number, number],
  size: terraceSize,
  top: terraceTop,
};

/** Authored Istiqlal-inspired facade; boxes are instanced by surface, not individual meshes. */
export function mosqueArchitecture() {
  const masonry: OutdoorPart[] = [],
    trim: OutdoorPart[] = [],
    glazing: OutdoorPart[] = [];
  const colliders: Pick<OutdoorPart, "p" | "s">[] = [];
  const wall = "#eee7d6",
    edge = "#fff8e7",
    stone = "#c2b39a",
    glass = "#344f48";
  const box = (
    items: OutdoorPart[],
    p: OutdoorPart["p"],
    s: OutdoorPart["s"],
    color: string,
    solid = false,
  ) => {
    items.push({ p, s, color });
    if (solid) colliders.push({ p, s });
  };
  // Low plinth connects to the sidewalk without a jump; the front courtyard stays open.
  box(masonry, [0, plinthHeight / 2, 0], [12, plinthHeight, 13], stone, true);
  box(masonry, [0, 4.2, -1.6], [10.2, 7.92, 8], "#aca38d", true);
  box(trim, [0, 0.33, -1.6], [10.7, 0.18, 8.5], edge);
  box(trim, [0, 8.16, -1.6], [11.4, 0.32, 9.1], edge);
  box(trim, [0, 8.38, -1.6], [11.1, 0.12, 8.8], stone, true);
  // Deep, green-tinted facade recesses behind continuous concrete ribs.
  for (const z of [-5.63, 2.43]) {
    box(glazing, [0, 4.7, z], [9.9, 6, 0.06], glass);
    for (let i = -6; i <= 6; i++) {
      const x = i * 0.8;
      box(masonry, [x, 4.7, z + Math.sign(z) * 0.13], [0.2, 6.8, 0.34], wall);
    }
    for (const y of [1.45, 3.1, 4.75, 6.4, 7.95])
      box(trim, [0, y, z + Math.sign(z) * 0.16], [10.35, 0.14, 0.36], edge);
  }
  for (const side of [-1, 1]) {
    box(glazing, [side * 5.13, 4.7, -1.6], [0.06, 6, 7.8], glass);
    for (let i = -5; i <= 5; i++)
      box(masonry, [side * 5.28, 4.7, -1.6 + i * 0.72], [0.36, 6.8, 0.18], wall);
    for (const y of [1.45, 3.1, 4.75, 6.4, 7.95])
      box(trim, [side * 5.28, y, -1.6], [0.36, 0.14, 8.3], edge);
    // Shaded side colonnades frame the forecourt without crossing its central approach.
    box(trim, [side * 4.65, 3.05, 4.45], [1.6, 0.2, 3.7], edge, true);
    for (const z of [3.1, 4.6, 6.1])
      box(masonry, [side * 4.65, 1.6, z], [0.24, 2.72, 0.24], wall, true);
  }
  // Door and a small domed portico, recalling Istiqlal's lower entrance pavilion.
  box(glazing, [0, 1.55, 2.62], [2.5, 2.62, 0.06], "#214c3e");
  for (const x of [-1.3, 0, 1.3]) box(trim, [x, 1.55, 2.69], [0.07, 2.7, 0.08], "#bda66f");
  box(trim, [0, 3.3, 3.4], [3.7, 0.4, 2.1], wall, true);
  for (const x of [-1.55, 1.55]) box(masonry, [x, 1.7, 4.1], [0.28, 2.92, 0.28], wall, true);
  // Courtyard tile joints and a clear path from the public sidewalk to the portico.
  for (const x of [-3, -1.5, 0, 1.5, 3]) box(trim, [x, 0.246, 4.5], [0.025, 0.012, 3.8], "#998e79");
  for (const z of [2.8, 4, 5.2, 6.4]) box(trim, [0, 0.246, z], [8.4, 0.012, 0.025], "#998e79");
  // One slender minaret stands inside the courtyard perimeter.
  box(masonry, [-5.05, 0.49, 4.9], [1.3, 0.5, 1.3], stone, true);
  box(masonry, [-5.05, 6.3, 4.9], [0.95, 11.62, 0.95], wall, true);
  for (const side of [-1, 1]) {
    box(glazing, [-5.05 + side * 0.48, 6.45, 4.9], [0.02, 9.4, 0.34], "#b8ac8f");
    box(glazing, [-5.05, 6.45, 4.9 + side * 0.48], [0.34, 9.4, 0.02], "#b8ac8f");
  }
  box(trim, [-5.05, 11.95, 4.9], [1.55, 0.24, 1.55], edge);
  box(glazing, [-5.05, 12.9, 4.9], [0.8, 1.65, 0.8], glass);
  for (const dx of [-0.55, 0.55])
    for (const dz of [-0.55, 0.55])
      box(trim, [-5.05 + dx, 12.9, 4.9 + dz], [0.17, 1.75, 0.17], wall);
  box(trim, [-5.05, 13.85, 4.9], [1.65, 0.22, 1.65], edge, true);
  return { masonry, trim, glazing, colliders };
}
