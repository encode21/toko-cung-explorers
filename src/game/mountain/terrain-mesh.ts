import { MOUNTAIN_BOUNDS, mountainGroundHeight } from "./model.ts";

export const MOUNTAIN_TERRAIN_CELL_SIZE = 2;

/** A two-metre closed grid is shared verbatim by rendering, Rapier and route QA. */
export function mountainGroundMesh() {
  const bounds = MOUNTAIN_BOUNDS;
  const columns = Math.ceil((bounds.maxX - bounds.minX) / MOUNTAIN_TERRAIN_CELL_SIZE);
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / MOUNTAIN_TERRAIN_CELL_SIZE);
  const stepX = (bounds.maxX - bounds.minX) / columns;
  const stepZ = (bounds.maxZ - bounds.minZ) / rows;
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const triangles = new Uint32Array(columns * rows * 6);
  for (let z = 0; z <= rows; z++)
    for (let x = 0; x <= columns; x++) {
      const offset = (z * (columns + 1) + x) * 3;
      const wx = bounds.minX + x * stepX,
        wz = bounds.minZ + z * stepZ;
      positions.set([wx, mountainGroundHeight(wx, wz), wz], offset);
    }
  for (let z = 0; z < rows; z++)
    for (let x = 0; x < columns; x++) {
      const a = z * (columns + 1) + x,
        c = a + columns + 1;
      triangles.set([a, c, a + 1, a + 1, c, c + 1], (z * columns + x) * 6);
    }
  return { positions, triangles, columns, rows, stepX, stepZ };
}

/** Sample the exact triangle plane, including diagonals; used to verify feet-height support. */
export function mountainMeshHeight(
  x: number,
  z: number,
  mesh: ReturnType<typeof mountainGroundMesh>,
) {
  const gx = Math.max(0, Math.min(mesh.columns - 1e-6, (x - MOUNTAIN_BOUNDS.minX) / mesh.stepX));
  const gz = Math.max(0, Math.min(mesh.rows - 1e-6, (z - MOUNTAIN_BOUNDS.minZ) / mesh.stepZ));
  const ix = Math.floor(gx),
    iz = Math.floor(gz),
    tx = gx - ix,
    tz = gz - iz;
  const index = iz * (mesh.columns + 1) + ix;
  const height = (i: number) => mesh.positions[i * 3 + 1]!;
  const a = height(index),
    b = height(index + 1);
  const c = height(index + mesh.columns + 1),
    d = height(index + mesh.columns + 2);
  return tx + tz <= 1
    ? a + (b - a) * tx + (c - a) * tz
    : d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
}
