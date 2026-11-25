import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rideEngineKind,
  rideEngineParams,
  rideRpmTarget,
} from "../src/game/audio/ride-engine-params.ts";

test("gas revs the engine louder and higher", () => {
  const idle = rideEngineParams("car", 0, 0, false, rideRpmTarget("car", 0, 0));
  const gas = rideEngineParams("car", 0, 1, false, rideRpmTarget("car", 0, 1));
  assert(gas.pitch > idle.pitch && gas.motor > idle.motor && gas.cutoff > idle.cutoff);
  assert(
    rideRpmTarget("car", 10, 1) <= 1 && rideRpmTarget("car", -3, 0) > 0,
    "clamped, reverse revs",
  );
});

test("pitch and volume follow road speed", () => {
  for (const kind of ["bebek", "matic", "car", "diesel", "truck"]) {
    const slow = rideEngineParams(kind, 1, 0.5, false, rideRpmTarget(kind, 1, 0.5));
    const fast = rideEngineParams(kind, 9.5, 0.5, false, rideRpmTarget(kind, 9.5, 0.5));
    assert(fast.pitch > slow.pitch && fast.motor > slow.motor, kind);
  }
});

test("geared bebek drops revs on a shift, matic CVT never does", () => {
  const rpm = (kind, v) => rideRpmTarget(kind, v, 1);
  assert(rpm("bebek", 3.4) < rpm("bebek", 3.2), "1st -> 2nd shift");
  for (let v = 0; v < 10; v += 0.5) assert(rpm("matic", v + 0.5) >= rpm("matic", v));
});

test("models map to distinct characters; bebek above car above truck", () => {
  assert.equal(rideEngineKind("motorcycle"), "matic");
  assert.equal(rideEngineKind("scooter"), "matic");
  assert.equal(rideEngineKind("sport-bike"), "sporty");
  assert.equal(rideEngineKind("mpv"), "car");
  const at = (kind) => rideEngineParams(kind, 5, 0.5, false, 0.5).pitch;
  assert(at("bebek") > at("car") && at("car") > at("truck"));
});

test("brake squeal only while braking above 2 m/s; values stay finite", () => {
  assert.equal(rideEngineParams("car", 8, 0, false, 0.6).squeal, 0);
  assert.equal(rideEngineParams("car", 1.5, 0, true, 0.1).squeal, 0);
  assert(rideEngineParams("car", 8, 0, true, 0.6).squeal > 0);
  for (const v of Object.values(rideEngineParams("truck", NaN, Infinity, true, NaN)))
    assert(Number.isFinite(v));
  assert(Number.isFinite(rideRpmTarget("bajaj", NaN, NaN)));
});
