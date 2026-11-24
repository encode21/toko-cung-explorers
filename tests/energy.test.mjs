import { test } from "node:test";
import assert from "node:assert/strict";
import { energyBand, parseEnergy, tiredSpeedFactor } from "../src/game/energy/model.ts";

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
