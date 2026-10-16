/** North-west empty parcel. +X is east; the user selected the left (-X) side of the map. */
export const BEACH_BOUNDS = { minX: -54.5, maxX: -35.5, minZ: -54.5, maxZ: -27.5 };
export const BEACH = { x: -45, z: -42, rx: 7.6, rz: 10.3, surface: -0.08, depth: 2.2 };
export const BEACH_DESTINATION = {
  id: "venue-beach" as const,
  label: "Pantai Cung",
  position: [-38, 0, -29] as [number, number, number],
  detail: "Pantai kiri-utara · air dangkal dan area berenang",
};
export const SWIM_SPEED = 2.8;
export const SWIM_ENTER_DEPTH = 1.05;
export const SWIM_EXIT_DEPTH = 0.72;
export const inBeach = (x: number, z: number) =>
  x >= BEACH_BOUNDS.minX &&
  x <= BEACH_BOUNDS.maxX &&
  z >= BEACH_BOUNDS.minZ &&
  z <= BEACH_BOUNDS.maxZ;
export const beachRadius = (x: number, z: number) =>
  Math.hypot((x - BEACH.x) / BEACH.rx, (z - BEACH.z) / BEACH.rz);
/** Shared by the actual triangulated floor, avatar grounding, depth queries, and tests. */
export function beachFloorY(x: number, z: number) {
  const r = beachRadius(x, z);
  if (r >= 1) return -0.04;
  return -0.04 - (BEACH.depth + 0.04) * Math.min(1, (1 - r) / 0.6);
}
export interface WaterSample {
  surface: number;
  floor: number;
  depth: number;
}
export function waterAt(x: number, z: number): WaterSample | null {
  if (inBeach(x, z) && beachRadius(x, z) < 1) {
    const floor = beachFloorY(x, z);
    const depth = BEACH.surface - floor;
    return depth > 0 ? { surface: BEACH.surface, floor, depth } : null;
  }
  // Existing Fishing Spot remains shallow. Do not carve its terrain or interfere with the dock.
  if (Math.hypot((x - 42) / 11, (z + 45) / 8.5) < 1)
    return { surface: 0.025, floor: -0.04, depth: 0.065 };
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
export function beachTerrain(segments = 48) {
  const vertices: number[] = [],
    indices: number[] = [];
  for (let iz = 0; iz <= segments; iz++)
    for (let ix = 0; ix <= segments; ix++) {
      const x = BEACH_BOUNDS.minX + ((BEACH_BOUNDS.maxX - BEACH_BOUNDS.minX) * ix) / segments;
      const z = BEACH_BOUNDS.minZ + ((BEACH_BOUNDS.maxZ - BEACH_BOUNDS.minZ) * iz) / segments;
      vertices.push(x, beachFloorY(x, z), z);
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
