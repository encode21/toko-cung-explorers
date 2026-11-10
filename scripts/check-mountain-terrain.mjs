import assert from "node:assert/strict";
import {
  MOUNTAIN_TRAIL,
  MOUNTAIN_BRIDGE_SEGMENT,
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_CHALLENGES,
  mountainGroundHeight,
  mountainWorldPoint,
  mountainCheckpointTerrace,
  MOUNTAIN_SUMMIT_RADIUS,
  MOUNTAIN_COAST,
} from "../src/game/mountain/model.ts";
import { mountainGroundMesh, mountainMeshHeight } from "../src/game/mountain/terrain-mesh.ts";

const mesh = mountainGroundMesh();
assert.equal(MOUNTAIN_CHALLENGES.length, 0, "The route no longer contains mandatory jump gaps");
assert.equal(mesh.positions.length / 3, (mesh.columns + 1) * (mesh.rows + 1));
assert.equal(
  mesh.triangles.length,
  mesh.columns * mesh.rows * 6,
  "Every grid cell has two triangles",
);
for (let i = 0; i < mesh.triangles.length; i += 3) {
  const [a, b, c] = mesh.triangles.slice(i, i + 3);
  const ax = mesh.positions[a * 3],
    az = mesh.positions[a * 3 + 2];
  const bx = mesh.positions[b * 3],
    bz = mesh.positions[b * 3 + 2];
  const cx = mesh.positions[c * 3],
    cz = mesh.positions[c * 3 + 2];
  assert.equal(
    (bz - az) * (cx - ax) - (bx - ax) * (cz - az),
    mesh.stepX * mesh.stepZ,
    "Up-facing nondegenerate terrain triangles",
  );
}
let samples = 0,
  maxSlope = 0,
  maxInterpolationError = 0;
for (let i = 0; i < MOUNTAIN_TRAIL.length - 1; i++) {
  const a = MOUNTAIN_TRAIL[i],
    b = MOUNTAIN_TRAIL[i + 1];
  if (i === MOUNTAIN_BRIDGE_SEGMENT) continue;
  const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const dx = (b[0] - a[0]) / length,
    dz = (b[2] - a[2]) / length;
  for (const offset of [-2.8, -1.4, 0, 1.4, 2.8])
    for (let along = 0.2; along < length; along += 0.2) {
      const x = a[0] + dx * along - dz * offset;
      const z = a[2] + dz * along + dx * offset;
      const y = mountainMeshHeight(x, z, mesh);
      const previous = mountainMeshHeight(x - dx * 0.2, z - dz * 0.2, mesh);
      const slope = Math.abs(y - previous) / 0.2;
      assert(Number.isFinite(y) && y >= 3.8, `Solid support on route ${i}`);
      assert(slope < 0.7, `Walkable gradient on route ${i}, lane ${offset}: ${slope}`);
      maxSlope = Math.max(maxSlope, slope);
      maxInterpolationError = Math.max(
        maxInterpolationError,
        Math.abs(y - mountainGroundHeight(x, z)),
      );
      samples++;
    }
}
assert(maxInterpolationError < 0.18, "Two-metre mesh accurately follows natural grade");
for (const point of [...MOUNTAIN_CHECKPOINTS.map((cp) => cp.position), MOUNTAIN_SUMMIT.position])
  assert(
    Math.abs(mountainMeshHeight(point[0], point[2], mesh) - point[1]) < 0.001,
    "CP and summit surfaces meet their spawn heights",
  );
assert(
  mountainMeshHeight(MOUNTAIN_HELIPAD.position[0], MOUNTAIN_HELIPAD.position[2], mesh) < 3.95,
  "Earth sits below the helipad deck to avoid flickering coplanar surfaces",
);
for (const [x, z] of [
  [344, 68],
  [378, 74],
  [348, 78],
  [370, 78],
  [376, 55],
]) {
  const world = mountainWorldPoint([x, 8, z]);
  assert.equal(
    mountainMeshHeight(world[0], world[2], mesh),
    4,
    "Camp props rest on a flat clearing",
  );
}
for (const x of [344, 366]) {
  const world = mountainWorldPoint([x, 20, 18]);
  assert(
    Math.abs(mountainMeshHeight(world[0], world[2], mesh) - world[1]) < 0.05,
    "Bridge banks meet the deck",
  );
}
const valley = mountainWorldPoint([355, 8, 18]);
assert(
  mountainMeshHeight(valley[0], valley[2], mesh) < valley[1],
  "The bridge crosses a genuine ravine",
);
for (const cp of MOUNTAIN_CHECKPOINTS) {
  const [halfX, halfZ] = mountainCheckpointTerrace(cp.id);
  for (let dx = -halfX + 1; dx <= halfX - 1; dx += 1)
    for (let dz = -halfZ + 1; dz <= halfZ - 1; dz += 1)
      assert(
        Math.abs(
          mountainMeshHeight(cp.position[0] + dx, cp.position[2] + dz, mesh) - cp.position[1],
        ) < 0.08,
        `CP ${cp.id} camp footing is flat and supported`,
      );
}
for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
  const [x, y, z] = MOUNTAIN_SUMMIT.position;
  const radius = MOUNTAIN_SUMMIT_RADIUS - 2;
  assert(
    Math.abs(
      mountainMeshHeight(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius, mesh) - y,
    ) < 0.1,
    "Broad summit terrace is supported",
  );
}
for (const [z, expected] of [
  [MOUNTAIN_COAST.plateauEndZ, 4],
  [MOUNTAIN_COAST.shoreZ, 0],
  [MOUNTAIN_COAST.shallowEndZ, -3],
])
  assert(
    Math.abs(mountainMeshHeight(1000, z, mesh) - expected) < 0.03,
    "Coast slopes continuously from drycamp into shallows",
  );
assert(mesh.triangles.length / 3 < 130000, "Large island keeps a bounded terrain mesh budget");
console.log(
  `PASS continuous mountain terrain: ${samples} route samples across five lanes; maximum slope ${maxSlope.toFixed(3)}; mesh error ${maxInterpolationError.toFixed(3)}m.`,
);
