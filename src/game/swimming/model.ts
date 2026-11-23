import { CITY_LAKE } from "../world/expansion-plan";
import { gangBeachY, gangCoastContains, GANG_SEA_Y } from "../gang/beach";
import {
  MOUNTAIN_COAST,
  MOUNTAIN_BOUNDS,
  isMountainPosition,
  mountainGroundHeight,
} from "../mountain/model";
/** A finite coastal town, with an open north-west beach and ocean beyond every outer edge. */
export const ISLAND_EDGE = 64;
export const OCEAN_PLAY_LIMIT = 220;
export const OCEAN_VISUAL_EXTENT = 2000;
/** Covers the east districts too, so every coast (not only the old ±80 town) slopes into the sea. */
export const BEACH_BOUNDS = { minX: -80, maxX: 160, minZ: -80, maxZ: 144 };
/** Sea sits 1.2 m below the town so the coast visibly slopes down to it (like the mountain coast). */
export const BEACH = { kind: "ocean" as const, x: -45, z: -42, surface: -1.2, depth: 4.2 };
/** Metres offshore (coastDistance) where the sloped seabed meets the sea surface. */
export const CITY_WATERLINE = (12 * (-0.04 - BEACH.surface)) / (BEACH.depth + 0.04);
export const FISHING_WATER_BOUNDS = { minX: 30.5, maxX: 54, minZ: -54, maxZ: -35.5 };
export const FISHING_WATER = {
  kind: "pond" as const,
  x: 42,
  z: -45,
  rx: 11,
  rz: 8.5,
  surface: 0.025,
  depth: 2.2,
};
export const MOUNTAIN_WATER = {
  kind: "ocean" as const,
  mountain: true as const,
  x: (MOUNTAIN_COAST.minX + MOUNTAIN_COAST.maxX) / 2,
  z: MOUNTAIN_COAST.shoreZ,
  surface: MOUNTAIN_COAST.waterLevel,
  depth: 3,
  bounds: MOUNTAIN_BOUNDS,
};
export const WATER_BODIES = [
  { ...BEACH, bounds: BEACH_BOUNDS },
  { ...FISHING_WATER, bounds: FISHING_WATER_BOUNDS },
  CITY_LAKE,
  MOUNTAIN_WATER,
];
export type WaterBody = (typeof WATER_BODIES)[number];
/** Positive offshore, negative inland. The bay connects to both north and west oceans. */
export function coastDistance(x: number, z: number) {
  return Math.min(
    Math.max(Math.abs(x) - ISLAND_EDGE, Math.abs(z) - ISLAND_EDGE, Math.min(-38 - x, -29 - z)),
    Math.max(60 - x, x - 148, -32 - z, z - 132),
  );
}
export const waterRadius = (x: number, z: number, body: WaterBody) =>
  "mountain" in body
    ? isMountainPosition(x, z) && mountainGroundHeight(x, z) < body.surface
      ? 0
      : 2
    : body.kind === "ocean"
      ? 1 - coastDistance(x, z) / 12
      : Math.hypot((x - body.x) / body.rx, (z - body.z) / body.rz);
export function waterFloorY(x: number, z: number, body: WaterBody) {
  if ("mountain" in body) return mountainGroundHeight(x, z);
  const slope =
    body.kind === "ocean" ? coastDistance(x, z) / 12 : (1 - waterRadius(x, z, body)) / 0.6;
  return -0.04 - (body.depth + 0.04) * Math.min(1, Math.max(0, slope));
}
export const BEACH_DESTINATION = {
  id: "venue-beach" as const,
  label: "Pantai Cung",
  position: [-38, 0, -29] as [number, number, number],
  detail: "Pantai tepi kota · pesisir luas dan laut terbuka",
};
export const SWIM_SPEED = 2.8;
export const SWIM_ENTER_DEPTH = 1.05;
export const SWIM_EXIT_DEPTH = 0.72;
export const inBeach = (x: number, z: number) => coastDistance(x, z) > -2;
/** Shared by the actual triangulated floor, avatar grounding, depth queries, and tests. */
export function beachFloorY(x: number, z: number) {
  return waterFloorY(x, z, WATER_BODIES[0]!);
}
export interface WaterSample {
  surface: number;
  floor: number;
  depth: number;
}
let gangCoast: { origin: [number, number, number]; end: number } | null = null;
/** Only the currently mounted Gang has water; never treat all far-away rooms as city ocean. */
export function setGangCoast(coast: typeof gangCoast) {
  gangCoast = coast;
}
export function waterAt(x: number, z: number): WaterSample | null {
  if (gangCoast) {
    const localX = x - gangCoast.origin[0],
      localZ = z - gangCoast.origin[2];
    if (gangCoastContains(localX, localZ, gangCoast.end)) {
      const floor = gangCoast.origin[1] + gangBeachY(localX, localZ, gangCoast.end);
      const surface = gangCoast.origin[1] + GANG_SEA_Y;
      return surface > floor ? { surface, floor, depth: surface - floor } : null;
    }
  }
  if (isMountainPosition(x, z)) {
    const floor = mountainGroundHeight(x, z);
    const depth = MOUNTAIN_WATER.surface - floor;
    return depth > 0 ? { surface: MOUNTAIN_WATER.surface, floor, depth } : null;
  }
  // The city sea is walled at OCEAN_PLAY_LIMIT; far-off maps (Gang etc.) have their own water level.
  const pastCitySea = Math.max(Math.abs(x), Math.abs(z)) > OCEAN_PLAY_LIMIT;
  for (const body of WATER_BODIES) {
    if (pastCitySea && body.kind === "ocean") continue;
    if (waterRadius(x, z, body) >= 1) continue;
    const floor = waterFloorY(x, z, body);
    const depth = body.surface - floor;
    if (depth > 0) return { surface: body.surface, floor, depth };
  }
  return null;
}
export function shouldSwim(water: WaterSample | null, feetY: number, previous: boolean) {
  if (!water || !Number.isFinite(feetY)) return false;
  return (
    water.depth >= (previous ? SWIM_EXIT_DEPTH : SWIM_ENTER_DEPTH) &&
    water.surface - feetY > (previous ? 0.45 : 0.9)
  );
}
/** Bounded buoyancy velocity rather than a teleport; works at both production physics rates. */
export function swimVerticalVelocity(y: number, surface: number, stroke: number) {
  const target = surface - 0.1 + Math.sin(Math.PI * Math.min(1, Math.max(0, stroke / 0.45))) * 0.32;
  return Math.max(-2, Math.min(3.2, (target - y) * 7));
}
/** Use the clear north pavement and west pavement; never direct the trail through the shop. */
export function beachApproach(p: readonly number[]): [number, number, number] {
  if (p[0]! > 27.1 && p[2]! > -32) return [26.2, 0, Math.max(-11.5, p[2]!)];
  if (p[0]! > 24.8 && p[2]! > -35) return [26.2, 0, -36.2];
  if (p[0]! > -33 && p[2]! > -35) return [p[0]! > 0 ? 26.2 : -25.8, 0, -36.2];
  if (p[0]! > -34) return [-34.2, 0, -36.2];
  if (p[2]! < -30.2) return [-34.2, 0, -29];
  return BEACH_DESTINATION.position;
}
/** One grid is shared by rendering and Rapier, so there is no invisible flat floor under the water. */
export function beachTerrain(segments = 48, body: WaterBody = WATER_BODIES[0]!) {
  if (body.kind === "ocean") return coastalTerrain();
  const bounds = body.bounds;
  const vertices: number[] = [],
    indices: number[] = [];
  for (let iz = 0; iz <= segments; iz++)
    for (let ix = 0; ix <= segments; ix++) {
      const x = bounds.minX + ((bounds.maxX - bounds.minX) * ix) / segments;
      const z = bounds.minZ + ((bounds.maxZ - bounds.minZ) * iz) / segments;
      vertices.push(x, waterFloorY(x, z, body), z);
    }
  for (let iz = 0; iz < segments; iz++)
    for (let ix = 0; ix < segments; ix++) {
      const a = iz * (segments + 1) + ix,
        b = a + 1,
        c = a + segments + 1,
        d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}

/** Uniform two-metre grid plus exact coastline/pond edges; pond is a separate submerged mesh. */
export function coastalTerrain() {
  const axis = (min: number, max: number, extra: number[]) =>
    [
      ...new Set([...Array.from({ length: (max - min) / 2 + 1 }, (_, i) => min + i * 2), ...extra]),
    ].sort((a, b) => a - b);
  const B = BEACH_BOUNDS,
    lake = CITY_LAKE.bounds;
  const xs = axis(B.minX, B.maxX, [-38, -36, FISHING_WATER_BOUNDS.minX, FISHING_WATER_BOUNDS.maxX]);
  const zs = axis(B.minZ, B.maxZ, [
    -29,
    -27,
    FISHING_WATER_BOUNDS.minZ,
    FISHING_WATER_BOUNDS.maxZ,
    lake.minZ,
    lake.maxZ,
  ]);
  const vertices: number[] = [],
    indices: number[] = [];
  for (const z of zs) for (const x of xs) vertices.push(x, beachFloorY(x, z), z);
  for (let iz = 0; iz < zs.length - 1; iz++)
    for (let ix = 0; ix < xs.length - 1; ix++) {
      const x = (xs[ix]! + xs[ix + 1]!) / 2,
        z = (zs[iz]! + zs[iz + 1]!) / 2,
        b = FISHING_WATER_BOUNDS;
      if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) continue;
      if (x > lake.minX && x < lake.maxX && z > lake.minZ && z < lake.maxZ) continue;
      const a = iz * xs.length + ix,
        c = a + xs.length;
      indices.push(a, c, a + 1, a + 1, c, c + 1);
    }
  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}
/** Shared outline for detailed and compact maps. Positive inset is the dry grass edge. */
export function islandOutline(inset = 0): [number, number][] {
  const e = ISLAND_EDGE - inset;
  return [
    [-38 + inset, -e],
    [e, -e],
    [e, -32 + inset],
    [148 - inset, -32 + inset],
    [148 - inset, 132 - inset],
    [60 + inset, 132 - inset],
    [60 + inset, e],
    [-e, e],
    [-e, -29 + inset],
    [-38 + inset, -29 + inset],
  ];
}
