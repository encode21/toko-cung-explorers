import { test } from "node:test";
import assert from "node:assert/strict";
import {
  impactVelocity,
  vehicleOverlaps,
  canImpact,
  approachSpeed,
  hitDurationFor,
} from "../src/game/traffic/traffic-math.ts";

test("car impact is moderate fall-knock; truck launches farther", () => {
  const pose = { x: 0, z: 0, dx: 1, dz: 0, speed: 6 };
  assert.equal(vehicleOverlaps({ x: 1, z: 0 }, pose), true);
  const car = impactVelocity({ x: 1, z: 0 }, { ...pose, kind: "car" });
  const truck = impactVelocity({ x: 1, z: 0 }, { ...pose, kind: "truck" });
  assert.ok(car.x > 0 && car.y > 0);
  assert.ok(Math.hypot(car.x, car.z) <= 7);
  assert.ok(Math.hypot(truck.x, truck.z) > Math.hypot(car.x, car.z));
  assert.ok(truck.y > car.y);
  assert.equal(hitDurationFor("car"), 1.25);
  assert.equal(hitDurationFor("truck"), 0.55);
});

test("impact cooldown and city braking are bounded", () => {
  assert.equal(canImpact(3, 0), true);
  assert.equal(canImpact(1, 0), false);
  assert.ok(approachSpeed(6, 0, 0.05) < 6);
  assert.ok(approachSpeed(0, 6, 0.05) > 0);
});
