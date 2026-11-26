import { test } from "node:test";
import assert from "node:assert/strict";
import { CROSSWALKS } from "../src/game/world/outdoor-layout.ts";
import { crossingPhase } from "../src/game/traffic/crossing-signals.ts";
import { crossingStopGap } from "../src/game/traffic/crossing-stop.ts";
import { crossingGap } from "../src/game/npc/ambient-profiles.ts";

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
