import { test } from "node:test";
import assert from "node:assert/strict";
import { ambienceLevels, birdIntervalMs } from "../src/game/audio/ambience-levels.ts";

const base = { rain: 0, indoor: false, hour: 12, gang: false };

test("rain scales gain, drizzle is brighter-thinner than heavy", () => {
  const dry = ambienceLevels(base);
  const drizzle = ambienceLevels({ ...base, rain: 0.2 });
  const heavy = ambienceLevels({ ...base, rain: 1 });
  assert.equal(dry.rainGain, 0);
  assert(drizzle.rainGain > 0 && heavy.rainGain > drizzle.rainGain);
  assert(heavy.rainLowpass > drizzle.rainLowpass && heavy.rainHighpass < drizzle.rainHighpass);
  assert(heavy.bgmDuck < dry.bgmDuck && dry.bgmDuck === 1);
  assert(heavy.thunder && !drizzle.thunder);
});

test("indoors rain is muffled and everything else is silent", () => {
  const out = ambienceLevels({ ...base, rain: 0.8, hour: 22 });
  const inn = ambienceLevels({ ...base, rain: 0.8, hour: 22, indoor: true });
  assert(inn.rainGain < out.rainGain && inn.rainLowpass < out.rainLowpass);
  assert.equal(inn.cricketGain, 0);
  assert.equal(inn.trafficGain, 0);
  assert.equal(birdIntervalMs({ ...base, indoor: true }), Infinity);
});

test("birds by day (gang denser), crickets and no birds at night, traffic city only", () => {
  assert(birdIntervalMs({ ...base, gang: true }) < birdIntervalMs(base));
  assert.equal(birdIntervalMs({ ...base, hour: 23 }), Infinity);
  assert.equal(birdIntervalMs({ ...base, rain: 0.9 }), Infinity);
  assert.equal(ambienceLevels({ ...base, hour: 23 }).cricketGain, 1);
  assert.equal(ambienceLevels(base).cricketGain, 0);
  assert(ambienceLevels(base).trafficGain > 0);
  assert.equal(ambienceLevels({ ...base, gang: true }).trafficGain, 0);
});
