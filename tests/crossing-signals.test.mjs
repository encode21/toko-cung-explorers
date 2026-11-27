import { test } from "node:test";
import assert from "node:assert/strict";
import { CROSSWALKS } from "../src/game/world/outdoor-layout.ts";
import { crossingPhase } from "../src/game/traffic/crossing-signals.ts";
import { crossingStopGap } from "../src/game/traffic/crossing-stop.ts";
import { crossingGap } from "../src/game/npc/ambient-profiles.ts";

test("perpendicular traffic alternates with an all-red clearance and a shared walk phase", () => {
  const green = new Set();
  for (let t = 0; t < 174_000; t += 100) {
    const x = crossingPhase(t, "x"),
      z = crossingPhase(t, "z");
    assert(x.vehicle === "red" || z.vehicle === "red");
    assert.equal(x.pedestrian, z.pedestrian);
    if (x.pedestrian === "walk") assert.equal(x.vehicle + z.vehicle, "redred");
    if (x.vehicle === "green") green.add("x");
    if (z.vehicle === "green") green.add("z");
  }
  assert.equal(green.size, 2);
  for (const t of [31_000, 33_999, 57_000, 60_999])
    assert.equal(crossingPhase(t, "x").vehicle + crossingPhase(t, "z").vehicle, "redred");
});

test("stop gaps follow the light facing the vehicle and amber allows safe clearance", () => {
  const east = { x: 90, z: 17.2, dx: 1, dz: 0, speed: 5, halfLength: 5.5 };
  const south = { x: -28.4, z: -3, dx: 0, dz: 1, speed: 5, halfLength: 5.5 };
  assert.equal(crossingStopGap(east, 0), Infinity);
  assert(Number.isFinite(crossingStopGap(south, 0)));
  assert(Number.isFinite(crossingStopGap(east, 35_000)));
  assert.equal(crossingStopGap(south, 35_000), Infinity);
  assert.equal(crossingStopGap({ ...east, x: 94 }, 28_000), Infinity);
  assert(Number.isFinite(crossingStopGap({ ...east, x: 80 }, 28_000)));
});

test("a pedestrian can finish crossing before the lights release traffic", () => {
  // Real route between Dek Nayla's two curb waiting points, at 1.2 m/s.
  const crossingTime = (14.8 / 1.2) * 1_000;
  let lastWalk;
  let sawAmber = false;
  for (let t = 0; t <= 122_000; t += 100) {
    const phase = crossingPhase(t);
    if (phase.pedestrian === "walk") {
      assert.equal(phase.vehicle, "red");
      lastWalk = t;
    } else if (phase.vehicle === "green" && lastWalk !== undefined) {
      assert.ok(t - lastWalk >= crossingTime);
    }
    if (phase.vehicle === "amber") sawAmber = true;
  }
  assert.ok(sawAmber && lastWalk !== undefined);
});

test("traffic stops before both edges on both road axes, with room for each bumper", () => {
  for (const cross of CROSSWALKS) {
    const x = (cross.minX + cross.maxX) / 2;
    const z = (cross.minZ + cross.maxZ) / 2;
    const roadX = cross.maxX - cross.minX < cross.maxZ - cross.minZ;
    for (const sign of [-1, 1]) {
      const dx = roadX ? sign : 0;
      const dz = roadX ? 0 : sign;
      for (const halfLength of [1, 2.05, 5.5]) {
        const fromCenter = 1.5 + 0.8 + halfLength;
        const pose = {
          x: x - dx * fromCenter,
          z: z - dz * fromCenter,
          dx,
          dz,
          halfLength,
          speed: 0,
        };
        assert.ok(crossingStopGap(pose) < 1e-8);
        assert.ok(
          Math.abs(crossingStopGap({ ...pose, x: pose.x - dx, z: pose.z - dz }) - 1) < 1e-8,
        );
        assert.ok(crossingStopGap({ ...pose, x, z }) > 0.1, "traffic on a zebra clears it");
        assert.equal(crossingGap(cross, 13, [pose]), true, "a stationary queue permits crossing");
        assert.equal(crossingGap(cross, 13, [{ ...pose, x, z }]), false, "occupied zebra");
        assert.equal(crossingGap(cross, 13, [{ ...pose, speed: 2 }]), false, "approaching vehicle");
      }
    }
  }
  assert.equal(crossingStopGap({ x: -43, z: 5, dx: 1, dz: 0, speed: 2 }), Infinity);
});
