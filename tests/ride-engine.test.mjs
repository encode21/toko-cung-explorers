import { test } from "node:test";
import assert from "node:assert/strict";
import { rideEngineParams, rideRpmTarget } from "../src/game/audio/ride-engine-params.ts";

test("gas revs the engine louder and higher", () => {
  const idle = rideEngineParams("car", 0, 0, false, rideRpmTarget(0, 0));
  const gas = rideEngineParams("car", 0, 1, false, rideRpmTarget(0, 1));
  assert(gas.pitch > idle.pitch && gas.motor > idle.motor && gas.cutoff > idle.cutoff);
  assert(rideRpmTarget(10, 1) <= 1 && rideRpmTarget(-3, 0) > 0, "rpm clamped, reverse revs");
});

test("motorcycle pitches above car above truck", () => {
  const at = (kind) => rideEngineParams(kind, 5, 0.5, false, 0.5).pitch;
  assert(at("motorcycle") > at("car") && at("car") > at("truck"));
});

test("brake squeal only while braking above 2 m/s; values stay finite", () => {
  assert.equal(rideEngineParams("car", 8, 0, false, 0.6).squeal, 0);
  assert.equal(rideEngineParams("car", 1.5, 0, true, 0.1).squeal, 0);
  assert(rideEngineParams("car", 8, 0, true, 0.6).squeal > 0);
  for (const v of Object.values(rideEngineParams("truck", NaN, Infinity, true, NaN)))
    assert(Number.isFinite(v));
});
