import test from "node:test";
import assert from "node:assert/strict";
import { vehicleDoorPath } from "../src/game/vehicles/boarding-path.ts";

const pose = { x: 0, y: 0, z: 0, speed: 0, yaw: 0 };
const half = [1, 0.8, 2.2];
const door = [1.7, 0.93, 0.5];

function clearPath(from, to) {
  for (let i = 0; i <= 32; i++) {
    const x = from[0] + ((to[0] - from[0]) * i) / 32;
    const z = from[2] + ((to[2] - from[2]) * i) / 32;
    if (Math.abs(x) < 1.32 && Math.abs(z) < 2.52) return false;
  }
  return true;
}

test("a clear door approach walks straight to the assigned seat", () => {
  const from = [3.5, 0.83, 1];
  assert.deepEqual(vehicleDoorPath(from, door, pose, half, clearPath), [door]);
});

test("a player on the opposite side walks around the clear end of the car", () => {
  const from = [-1.7, 0.83, 0.5];
  assert.equal(clearPath(from, door), false);
  const clearBackOnly = (a, b) => Math.max(a[2], b[2]) <= 2.52 && clearPath(a, b);
  const path = vehicleDoorPath(from, door, pose, half, clearBackOnly);
  assert.equal(path.length, 3);
  assert.equal(path.at(-1), door);
  for (const [i, point] of path.entries())
    assert.equal(clearBackOnly(path[i - 1] ?? from, point), true);
});

test("a blocked door never produces a path to board", () => {
  const from = [-1.7, 0.83, 0.5];
  assert.equal(
    vehicleDoorPath(from, door, pose, half, (a, b) => b !== door && clearPath(a, b)),
    null,
  );
});
