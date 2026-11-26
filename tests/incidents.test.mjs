import test from "node:test";
import assert from "node:assert/strict";
import {
  liveIncident,
  visibleIncident,
  incidentNear,
  incidentScene,
} from "../src/game/incidents/model.ts";
const event = {
  id: "100-1",
  type: "red-light-crash",
  startsAt: 100000,
  endsAt: 220000,
  at: [104, 0, 20],
  location: "Pasar",
};
test("notice starts 30 seconds early, activity ends exactly on time", () => {
  assert.equal(visibleIncident([event], 69999), null);
  assert.equal(visibleIncident([event], 70000), event);
  assert.equal(liveIncident([event], 99999), null);
  assert.equal(liveIncident([event], 100000), event);
  assert.equal(liveIncident([event], 220000), null);
});
test("recording is local to the incident and ground level", () => {
  assert.equal(incidentNear(event, [104, 0.83, 39]), true);
  assert.equal(incidentNear(event, [104, 0.83, 41]), false);
  assert.equal(incidentNear(event, [104, -10, 20]), false);
});
test("late join and host handoff produce the exact same scene from absolute time", () => {
  const first = incidentScene(event, 110000);
  for (const time of [101000, 105000, 109000]) incidentScene(event, time);
  assert.deepEqual(first, incidentScene({ ...event }, 110000));
  assert.equal(first.a.animation, "Fall");
  assert.ok(first.motor.lean < 0);
  assert.equal(incidentScene(event, 118000).a.animation, "Talk");
  assert.equal(incidentScene(event, 205000).a.animation, "Walk");
});
test("each variant has the expected actors and the road clears after the incident impact", () => {
  for (const type of ["bump-fight", "parking-fight", "motorcycle-fall", "red-light-crash"]) {
    const e = { ...event, type };
    const scene = incidentScene(e, e.startsAt + 30000);
    assert.equal(scene.showTruck, type === "red-light-crash");
    assert.equal(scene.showMotor, type !== "bump-fight");
    assert.ok(scene.line);
    if (scene.traffic) {
      assert.equal(scene.motor.z, -7);
      assert.equal(scene.truck.z, -7);
    }
  }
});
