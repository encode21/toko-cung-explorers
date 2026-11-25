import { test } from "node:test";
import assert from "node:assert/strict";
import { energyBand, napEnergy, parseEnergy, tiredSpeedFactor } from "../src/game/energy/model.ts";

test("tired slows by 0.8, rested does not", () => {
  assert.equal(tiredSpeedFactor(true), 0.8);
  assert.equal(tiredSpeedFactor(false), 1);
});
test("bar colour bands", () => {
  assert.equal(energyBand({ value: 80, max: 100, tired: false }), "ok");
  assert.equal(energyBand({ value: 25, max: 100, tired: true }), "tired");
  assert.equal(energyBand({ value: 9, max: 100, tired: true }), "critical");
});
test("parseEnergy reads optional energy field", () => {
  assert.deepEqual(parseEnergy({ energy: { value: 42, max: 100, tired: true } }), {
    value: 42,
    max: 100,
    tired: true,
  });
  assert.equal(parseEnergy({}), null);
  assert.equal(parseEnergy(null), null);
  assert.equal(parseEnergy({ energy: { value: "x", max: 100 } }), null);
});

test("nap estimate fills empty→full in fullSeconds, keeps partial progress and caps at max", () => {
  const nap = { startedAt: new Date(0).toISOString(), fullSeconds: 120 };
  const e = { value: 10, max: 100, tired: true };
  assert.equal(napEnergy(e, nap, 0), 10);
  assert.equal(napEnergy(e, nap, 60_000), 60);
  assert.equal(napEnergy(e, nap, 600_000), 100);
  assert.equal(napEnergy(e, nap, -5_000), 10, "clock skew never lowers energy");
});
