/** A finite coastal town, with an open north-west beach and ocean beyond every outer edge. */
export const ISLAND_EDGE = 64;
export const OCEAN_PLAY_LIMIT = 180;
export const OCEAN_VISUAL_EXTENT = 2000;
export const BEACH_BOUNDS = { minX: -80, maxX: 80, minZ: -80, maxZ: 80 };
export const BEACH = { kind: "ocean" as const, x: -45, z: -42, surface: -0.08, depth: 3.2 };
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
export const WATER_BODIES = [
  { ...BEACH, bounds: BEACH_BOUNDS },
  { ...FISHING_WATER, bounds: FISHING_WATER_BOUNDS },
];
export type WaterBody = (typeof WATER_BODIES)[number];
/** Positive offshore, negative inland. The bay connects to both north and west oceans. */
export function coastDistance(x: number, z: number) {
  return Math.max(Math.abs(x) - ISLAND_EDGE, Math.abs(z) - ISLAND_EDGE, Math.min(-38 - x, -29 - z));
}
export const waterRadius = (x: number, z: number, body: WaterBody) =>
  body.kind === "ocean"
    ? 1 - coastDistance(x, z) / 12
    : Math.hypot((x - body.x) / body.rx, (z - body.z) / body.rz);
export function waterFloorY(x: number, z: number, body: WaterBody) {
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
export function waterAt(x: number, z: number): WaterSample | null {
  for (const body of WATER_BODIES) {
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
  const axis = (extra: number[]) =>
    [...new Set([...Array.from({ length: 81 }, (_, i) => -80 + i * 2), ...extra])].sort(
      (a, b) => a - b,
    );
  const xs = axis([-38, -36, FISHING_WATER_BOUNDS.minX, FISHING_WATER_BOUNDS.maxX]);
  const zs = axis([-29, -27, FISHING_WATER_BOUNDS.minZ, FISHING_WATER_BOUNDS.maxZ]);
  const vertices: number[] = [],
    indices: number[] = [];
  for (const z of zs) for (const x of xs) vertices.push(x, beachFloorY(x, z), z);
  for (let iz = 0; iz < zs.length - 1; iz++)
    for (let ix = 0; ix < xs.length - 1; ix++) {
      const x = (xs[ix]! + xs[ix + 1]!) / 2,
        z = (zs[iz]! + zs[iz + 1]!) / 2,
        b = FISHING_WATER_BOUNDS;
      if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) continue;
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
    [e, e],
    [-e, e],
    [-e, -29 + inset],
    [-38 + inset, -29 + inset],
  ];
}
