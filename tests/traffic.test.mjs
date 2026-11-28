import { test } from "node:test";
import assert from "node:assert/strict";
import {
  atTrafficHeight,
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

test("NPC falls, stays down, and returns to its safe standing point", async () => {
  const { npcImpactPose, NPC_KNOCK_SECONDS, NPC_KNOCK_COOLDOWN } =
    await import("../src/game/traffic/npc-impact.ts");
  assert.ok(npcImpactPose(0.2).lift > 0);
  assert.ok(npcImpactPose(0.6).lean < -1.4);
  assert.equal(npcImpactPose(1).lift, 0);
  assert.ok(npcImpactPose(1.6).slide < npcImpactPose(1).slide);
  assert.deepEqual(npcImpactPose(NPC_KNOCK_SECONDS), { lift: 0, lean: 0, slide: 0 });
  assert.ok(NPC_KNOCK_COOLDOWN > NPC_KNOCK_SECONDS);
});

test("road cars neither hit nor obstruct actors on the JPO or below street level", () => {
  const car = { x: 2.5, z: 20, dx: 0, dz: 1, speed: 5 };
  for (const y of [5.83, 7.83, -13.17]) {
    const actor = { x: 2.5, y, z: 20 };
    assert.equal(atTrafficHeight(actor), false);
    assert.equal(vehicleOverlaps(actor, car, 0.6), false);
  }
  for (const y of [0.83, 1.03, 2.2]) assert.equal(vehicleOverlaps({ x: 2.5, y, z: 20 }, car), true);
});
