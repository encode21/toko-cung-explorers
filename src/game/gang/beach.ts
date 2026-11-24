/** Grass plot is |x| <= LAND_HALF, z in [LAND_START, end]; the beach drops from its edge into the sea. */
export const LAND_HALF = 90;
/** Walkable half-width: past it the kampung continues (kali on the east, packed houses both sides). */
export const PLAY_HALF = 50;
/** The kali (canal) that floods the gang in heavy rain: east side, just past the walkable edge. */
export const KALI = { x0: 52, x1: 58 };
export const LAND_START = -15;
/** Sea sits below the plot so the sand visibly slopes down to it, like the mountain coast. */
export const GANG_SEA_Y = -1.6;
/** Metres from the grass edge to the waterline; walls stand just past it (ankle-deep). */
export const GANG_SHORE = 10;
export const GANG_WALL = GANG_SHORE + 1;
const SEA_FLOOR = GANG_SEA_Y - 3;
const BEACH_REACH = GANG_SHORE + 16;
export function gangCoastContains(x: number, z: number, end: number) {
  return (
    Math.abs(x) <= LAND_HALF + GANG_WALL + 1 &&
    z >= LAND_START - GANG_WALL - 1 &&
    z <= end + GANG_WALL + 1
  );
}

/** Positive outside the grass plot, negative inside. */
const edgeDistance = (x: number, z: number, end: number) =>
  Math.max(Math.abs(x) - LAND_HALF, LAND_START - z, z - end);

/** Grass→sand blend over ~8 m with a wavy (not ruler-straight) edge, like the mountain coast. */
export const LAWN_INSET = 7;
export function gangGrassBlend(x: number, z: number, end: number) {
  const wobble = Math.sin(x * 0.37 + z * 0.11) * 1.2 + Math.sin(z * 0.23 - x * 0.41) * 0.8;
  const t = Math.max(0, Math.min(1, (edgeDistance(x, z, end) + wobble + 5) / 8));
  return 1 - t * t * (3 - 2 * t);
}

/** Plot-local beach height: flat grass, sand slope to the waterline, then a steeper seabed. */
export function gangBeachY(x: number, z: number, end: number) {
  const d = edgeDistance(x, z, end);
  if (d <= 0) return -0.04;
  if (d <= GANG_SHORE) return -0.04 + (GANG_SEA_Y + 0.04) * (d / GANG_SHORE);
  return GANG_SEA_Y + (SEA_FLOOR - GANG_SEA_Y) * Math.min(1, (d - GANG_SHORE) / 14);
}

export function gangBeachTerrain(end: number) {
  const step = 2;
  const xs: number[] = [],
    zs: number[] = [];
  for (let x = -LAND_HALF - BEACH_REACH; x <= LAND_HALF + BEACH_REACH; x += step) xs.push(x);
  for (let z = LAND_START - BEACH_REACH; z <= end + BEACH_REACH; z += step) zs.push(z);
  const vertices: number[] = [],
    indices: number[] = [],
    coverage: number[] = [];
  for (const z of zs)
    for (const x of xs) {
      const y = gangBeachY(x, z, end);
      vertices.push(x, y, z);
      coverage.push(gangGrassBlend(x, z, end));
    }
  for (let iz = 0; iz < zs.length - 1; iz++)
    for (let ix = 0; ix < xs.length - 1; ix++) {
      // The inset lawn box covers the middle; the rim (blend) and beach need triangles.
      if (edgeDistance(xs[ix]! + step / 2, zs[iz]! + step / 2, end) < -LAWN_INSET - 1) continue;
      const a = iz * xs.length + ix,
        c = a + xs.length;
      indices.push(a, c, a + 1, a + 1, c, c + 1);
    }
  return {
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
    coverage,
  };
}
