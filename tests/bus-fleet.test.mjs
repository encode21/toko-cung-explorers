import { test } from "node:test";
import assert from "node:assert/strict";
import { CITY_FLEET, fleetPose } from "../src/game/world/bus-fleet.ts";
import { BUS_STOPS } from "../src/game/world/bus-routes.ts";
import { BUS_TIMETABLE } from "../src/game/world/bus-timetable.ts";

// Bus footprint 2.5 x 11 m; a corner of one inside the other means they touch.
const inside = (p, x, z) => {
  const dx = x - p.x,
    dz = z - p.z;
  const along = dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw);
  const across = dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw);
  return Math.abs(along) < 5.5 && Math.abs(across) < 1.25;
};
const corners = (p) =>
  [-1, 1].flatMap((l) =>
    [-1, 1].map((w) => [
      p.x + Math.sin(p.yaw) * 5.5 * l + Math.cos(p.yaw) * 1.25 * w,
      p.z + Math.cos(p.yaw) * 5.5 * l - Math.sin(p.yaw) * 1.25 * w,
    ]),
  );
const bodiesTouch = (a, b) =>
  corners(b).some(([x, z]) => inside(a, x, z)) || corners(a).some(([x, z]) => inside(b, x, z));

test("TransCung fleet dwells at every halte on schedule and keeps its distance", () => {
  const { cycleMs, offsets } = BUS_TIMETABLE;
  for (const { shift } of CITY_FLEET)
    for (const stop of ["kota", "gerbang", "pasar"]) {
      const at = fleetPose(shift, shift * cycleMs + offsets[stop] + 5000, BUS_TIMETABLE);
      assert.equal(at.speed, 0);
      assert.equal(at.door, 1);
      assert.ok(Math.hypot(at.x - BUS_STOPS[stop].pose.x, at.z - BUS_STOPS[stop].pose.z) < 0.01);
    }
  // Continuous motion, and never on top of the boardable bus's timetable slot or each other.
  let prev = fleetPose(CITY_FLEET[0].shift, 0, BUS_TIMETABLE);
  for (let now = 100; now < cycleMs * 2; now += 100) {
    const poses = [0, ...CITY_FLEET.map((b) => b.shift)].map((s) =>
      fleetPose(s, now, BUS_TIMETABLE),
    );
    assert.ok(Math.hypot(poses[1].x - prev.x, poses[1].z - prev.z) < 3, `jump at ${now}`);
    prev = poses[1];
    for (let a = 0; a < poses.length; a++)
      for (let b = a + 1; b < poses.length; b++)
        assert.ok(!bodiesTouch(poses[a], poses[b]), `overlap ${now}`);
  }
});
