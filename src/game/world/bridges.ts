import { ROAD_SEGMENTS } from "./outdoor-layout.ts";
import type { OutdoorPart } from "./OutdoorBatch";

export const GANG_BRIDGE_LENGTH = 160;
const mainWidth = ROAD_SEGMENTS.find((r) => r.id === "utama")!.width;
const gangWidth = ROAD_SEGMENTS.find((r) => r.id === "kampung")!.width;

/** Local +Z points offshore; decks meet the existing roads at their original height. */
export const CITY_BRIDGES = [
  { id: "west", position: [-64, 0, 20], yaw: -Math.PI / 2, length: 236, roadWidth: mainWidth },
  { id: "east", position: [148, 0, 20], yaw: Math.PI / 2, length: 152, roadWidth: mainWidth },
  { id: "north", position: [-30, 0, -64], yaw: Math.PI, length: 236, roadWidth: gangWidth },
  { id: "south", position: [-30, 0, 64], yaw: 0, length: 236, roadWidth: gangWidth },
] as const;

/** Keep the road, two 2m sidewalks, railings and physical towers aligned at either lane count. */
export function bridgeSection(roadWidth = 6.4) {
  const half = roadWidth / 2;
  return {
    deckHalf: half + 2.4,
    railX: half + 2.3,
    towerX: half + 3.7,
    pierX: half + 1.1,
    cableX: half + 2.45,
    crossbeam: roadWidth + 5.1,
  };
}

/** Low-poly stone towers, blue suspension ironwork and piers down to the seabed. */
export function bridgeParts(length: number, roadWidth = 6.4) {
  const section = bridgeSection(roadWidth);
  const stone: OutdoorPart[] = [],
    iron: OutdoorPart[] = [];
  const box = (items: OutdoorPart[], p: OutdoorPart["p"], s: OutdoorPart["s"], color: string) =>
    items.push({ p, s, color });
  const cream = "#c4b99f",
    trim = "#e1d3b9",
    blue = "#548d9b",
    dark = "#354b55";
  box(stone, [0, -0.35, length / 2], [section.deckHalf * 2, 0.6, length + 0.4], cream);
  for (let z = 0; z <= length; z += 20) {
    box(stone, [0, -0.75, z], [section.deckHalf * 2 + 0.1, 0.4, 1.4], trim);
    for (const x of [-section.pierX, section.pierX]) {
      box(stone, [x, -2.9, z], [1.4, 4.3, 1.9], cream);
      box(stone, [x, -4.7, z], [2.2, 0.6, 2.7], dark);
    }
  }
  for (const x of [-section.railX, section.railX]) {
    for (const y of [0.35, 1.15]) box(iron, [x, y, length / 2], [0.16, 0.16, length], blue);
    for (let z = 0; z <= length; z += 2) box(iron, [x, 0.65, z], [0.12, 1.2, 0.12], blue);
  }
  for (const z of [12, 52]) {
    for (const x of [-section.towerX, section.towerX]) {
      box(stone, [x, -1.5, z], [3.1, 7, 4.1], cream);
      box(stone, [x, 6.2, z], [2.3, 8.4, 3.3], cream);
      for (const y of [2, 7.3, 10.5]) box(stone, [x, y, z], [2.7, 0.35, 3.7], trim);
      for (const dz of [-1.67, 1.67])
        for (const y of [4.5, 8.7]) box(iron, [x, y, z + dz], [0.65, 1.4, 0.08], dark);
      // Stepped slate spires keep the silhouette without extra meshes or roof assets.
      for (let tier = 0; tier < 5; tier++)
        box(iron, [x, 10.9 + tier * 0.4, z], [2.9 - tier * 0.5, 0.4, 3.9 - tier * 0.65], dark);
    }
    box(stone, [0, 7.5, z], [section.crossbeam, 0.65, 2.1], trim);
    box(iron, [0, 8.05, z], [section.crossbeam, 0.35, 1.7], blue);
  }
  for (const x of [-section.cableX, section.cableX]) {
    box(iron, [x, 9.5, 32], [0.4, 0.7, 40], blue);
    const height = (z: number) =>
      z < 12
        ? 1.3 + (z * 8.7) / 12
        : z <= 52
          ? 4 + 6 * ((z - 32) / 20) ** 2
          : 10 - ((z - 52) * 8.7) / 20;
    for (let z = 0; z < 72; z += 2) {
      const a = height(z),
        b = height(z + 2);
      iron.push({
        p: [x, (a + b) / 2, z + 1],
        s: [0.2, 0.2, Math.hypot(2, b - a)],
        rx: -Math.atan2(b - a, 2),
        color: blue,
      });
      box(iron, [x, (a + 1.2) / 2, z], [0.07, a - 1.2, 0.07], blue);
    }
  }
  return { stone, iron };
}
