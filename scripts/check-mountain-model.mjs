import assert from "node:assert/strict";
import { advanceMountainProgress, emptyMountainProgress } from "../src/game/mountain/progress.ts";
import {
  CITY_HELIPAD,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_TRAIL,
  checkpointAt,
  isMountainPosition,
  mountainRespawn,
  nearestMountainTrail,
} from "../src/game/mountain/model.ts";

let state = emptyMountainProgress();
assert.equal(advanceMountainProgress(state, 2), state, "Cannot skip CP1");
assert.equal(advanceMountainProgress(state, 5), state, "Summit requires all checkpoints");
for (const invalid of [-1, 0, 1.1, NaN, Infinity, 6])
  assert.equal(advanceMountainProgress(state, invalid), state);
for (let cp = 1; cp <= 4; cp++) {
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
state = advanceMountainProgress(state, 5);
assert.equal(state.completed, true);
assert.equal(advanceMountainProgress(state, 5), state, "Summit is only awarded once per run");
assert.deepEqual(emptyMountainProgress(), { checkpoint: 0, completed: false });
assert.equal(isMountainPosition(...[CITY_HELIPAD.position[0], CITY_HELIPAD.position[2]]), false);
assert.equal(isMountainPosition(NaN, 0), false);
assert.ok(MOUNTAIN_HELIPAD.spawn[1] > 2, "Arrival does not snap into the city navigation graph");
assert.deepEqual(mountainRespawn(0), MOUNTAIN_HELIPAD.spawn);
for (const cp of MOUNTAIN_CHECKPOINTS) {
  const [x, y, z] = cp.position;
  assert.equal(checkpointAt(x, y, z), cp.id);
  assert.equal(checkpointAt(x, y + 2, z), null, "Flying above a CP cannot activate it");
  assert.equal(checkpointAt(x + 9, y, z), null, "Activation stays on the checkpoint");
  assert.deepEqual(mountainRespawn(cp.id), [x, y + 0.87, z]);
  assert.ok(
    MOUNTAIN_TRAIL.some((n) => n.every((v, i) => v === cp.position[i])),
    "Every CP belongs to the connected trail",
  );
}
assert.equal(checkpointAt(...MOUNTAIN_SUMMIT.position), 5);
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
assert.ok(length > 250, "A substantial winding hiking route");
console.log(
  `Mountain model passed: sequential CPs, one-time completion, safe respawns, connected ${Math.round(length)}m trail.`,
);
