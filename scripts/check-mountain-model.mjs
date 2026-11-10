import assert from "node:assert/strict";
import { advanceMountainProgress, emptyMountainProgress } from "../src/game/mountain/progress.ts";
import {
  CITY_HELIPAD,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_CHECKPOINT_COUNT,
  MOUNTAIN_SUMMIT_ID,
  mountainCheckpointTerrace,
  mountainWorldPoint,
  mountainLocalPoint,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_TRAIL,
  MOUNTAIN_CHALLENGES,
  mountainGroundHeight,
  checkpointAt,
  isMountainPosition,
  mountainRespawn,
  nearestMountainTrail,
} from "../src/game/mountain/model.ts";

let state = emptyMountainProgress();
assert.equal(advanceMountainProgress(state, 2), state, "Cannot skip CP1");
assert.equal(
  advanceMountainProgress(state, MOUNTAIN_SUMMIT_ID),
  state,
  "Summit requires all checkpoints",
);
for (const invalid of [-1, 0, 1.1, NaN, Infinity, MOUNTAIN_SUMMIT_ID + 1])
  assert.equal(advanceMountainProgress(state, invalid), state);
for (let cp = 1; cp <= MOUNTAIN_CHECKPOINT_COUNT; cp++) {
  const next = advanceMountainProgress(state, cp);
  assert.equal(next.checkpoint, cp);
  assert.equal(next.completed, false);
  assert.equal(
    advanceMountainProgress(next, cp),
    next,
    "Remaining at a CP cannot replay chime/pulse",
  );
  assert.equal(advanceMountainProgress(next, cp - 1), next, "Backtracking does not lose progress");
  state = next;
}
state = advanceMountainProgress(state, MOUNTAIN_SUMMIT_ID);
assert.equal(state.completed, true);
assert.equal(
  advanceMountainProgress(state, MOUNTAIN_SUMMIT_ID),
  state,
  "Summit is only awarded once per run",
);
assert.deepEqual(emptyMountainProgress(), { checkpoint: 0, completed: false });
assert.equal(isMountainPosition(...[CITY_HELIPAD.position[0], CITY_HELIPAD.position[2]]), false);
assert.equal(isMountainPosition(NaN, 0), false);
assert.ok(MOUNTAIN_HELIPAD.spawn[1] > 2, "Arrival does not snap into the city navigation graph");
assert.deepEqual(mountainRespawn(0), MOUNTAIN_HELIPAD.spawn);
assert.deepEqual(
  MOUNTAIN_CHECKPOINTS.map((cp) => cp.id),
  Array.from({ length: 10 }, (_, i) => i + 1),
);
assert.equal(MOUNTAIN_SUMMIT_ID, 11);
assert.deepEqual(mountainRespawn(99), mountainRespawn(MOUNTAIN_CHECKPOINT_COUNT));
for (const cp of MOUNTAIN_CHECKPOINTS) {
  const [x, y, z] = cp.position;
  const [halfX, halfZ] = mountainCheckpointTerrace(cp.id);
  assert.equal(checkpointAt(x, y, z), cp.id);
  assert.equal(checkpointAt(x, y + 2, z), null, "Flying above a CP cannot activate it");
  assert.equal(
    checkpointAt(x + halfX + 1, y, z),
    null,
    "Activation stays in the checkpoint terrace",
  );
  assert.equal(checkpointAt(x + halfX - 1, y, z), cp.id, "Walking beside the marker still counts");
  assert.equal(
    checkpointAt(x, y + 1, z - halfZ + 1),
    cp.id,
    "A normal jump across the terrace counts",
  );
  assert.deepEqual(mountainRespawn(cp.id), [x, y + 0.87, z]);
  assert.ok(nearestMountainTrail(x, z).distance < 0.001, "Every CP belongs to the connected trail");
}
assert.equal(checkpointAt(...MOUNTAIN_SUMMIT.position), MOUNTAIN_SUMMIT_ID);
let length = 0;
for (let i = 1; i < MOUNTAIN_TRAIL.length; i++) {
  const a = MOUNTAIN_TRAIL[i - 1],
    b = MOUNTAIN_TRAIL[i];
  const distance = Math.hypot(b[0] - a[0], b[2] - a[2]);
  assert.ok(distance > 0);
  assert.ok(Math.abs(b[1] - a[1]) / distance <= 0.5, "Ramp at most 26.6 degrees");
  for (let j = 0; j <= 10; j++) {
    const t = j / 10,
      x = a[0] + (b[0] - a[0]) * t,
      z = a[2] + (b[2] - a[2]) * t;
    assert.ok(isMountainPosition(x, z), "Full trail stays inside recovery bounds");
    assert.ok(nearestMountainTrail(x, z).distance < 0.001);
  }
  length += distance;
}
assert.ok(length > 1800 && length < 1850, "Expanded trail is about 1.8km");
const cross = (a, b, c) => (b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]);
const pointSegmentDistance = (p, a, b) => {
  const dx = b[0] - a[0],
    dz = b[2] - a[2];
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[2] - a[2]) * dz) / (dx * dx + dz * dz)),
  );
  return Math.hypot(p[0] - a[0] - t * dx, p[2] - a[2] - t * dz);
};
let minTrailSeparation = Infinity;
for (let i = 0; i < MOUNTAIN_TRAIL.length - 1; i++)
  for (let j = i + 2; j < MOUNTAIN_TRAIL.length - 1; j++) {
    const [a, b, c, d] = [
      MOUNTAIN_TRAIL[i],
      MOUNTAIN_TRAIL[i + 1],
      MOUNTAIN_TRAIL[j],
      MOUNTAIN_TRAIL[j + 1],
    ];
    assert(
      !(cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0),
      "Separate switchbacks must not cross",
    );
    minTrailSeparation = Math.min(
      minTrailSeparation,
      pointSegmentDistance(a, c, d),
      pointSegmentDistance(b, c, d),
      pointSegmentDistance(c, a, b),
      pointSegmentDistance(d, a, b),
    );
  }
assert.ok(
  minTrailSeparation >= 18 - 1e-6,
  "Non-adjacent 6m-wide trails retain at least 12m between edges",
);
assert(
  MOUNTAIN_CHECKPOINTS.every((cp) => cp.rest),
  "All ten checkpoints have broad campgrounds",
);
for (const point of [
  [360, 8, 65],
  [334, 12, 54],
  [360, 54, -69],
])
  assert.deepEqual(
    mountainLocalPoint(mountainWorldPoint(point)),
    point,
    "Coordinate helper round trip",
  );
assert.equal(MOUNTAIN_CHECKPOINTS.length, 10);
assert.equal(MOUNTAIN_CHALLENGES.length, 0, "No deliberately broken jump sections remain");
for (const cp of MOUNTAIN_CHECKPOINTS) {
  const [halfX, halfZ] = mountainCheckpointTerrace(cp.id);
  for (const dx of [-halfX + 1, 0, halfX - 1])
    for (const dz of [-halfZ + 1, 0, halfZ - 1])
      assert(
        Math.abs(mountainGroundHeight(cp.position[0] + dx, cp.position[2] + dz) - cp.position[1]) <
          0.05,
        "Rest terraces are part of the solid mountain",
      );
}
console.log(
  `Mountain model passed: sequential CPs, one-time completion, safe respawns, connected ${Math.round(length)}m trail, ${minTrailSeparation}m minimum switchback separation.`,
);
