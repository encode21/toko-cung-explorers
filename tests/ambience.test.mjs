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

test("birds and crickets belong to the kampung, never the city", () => {
  assert.equal(birdIntervalMs(base), Infinity);
  assert.equal(ambienceLevels({ ...base, hour: 23 }).cricketGain, 0);
  const gang = { ...base, gang: true };
  assert(birdIntervalMs(gang) <= 3500);
  assert(birdIntervalMs({ ...gang, hour: 7 }) < birdIntervalMs(gang));
  assert.equal(birdIntervalMs({ ...gang, hour: 23 }), Infinity);
  assert.equal(birdIntervalMs({ ...gang, rain: 0.9 }), Infinity);
  assert.equal(birdIntervalMs({ ...gang, indoor: true }), Infinity);
  assert.equal(ambienceLevels({ ...gang, hour: 23 }).cricketGain, 1);
  assert.equal(ambienceLevels(gang).cricketGain, 0);
});

test("city has traffic, passing cars, horns and wind; kampung has conversations", () => {
  const city = ambienceLevels(base);
  const gang = ambienceLevels({ ...base, gang: true });
  assert(city.trafficGain > 0 && city.windGain > 0);
  assert(Number.isFinite(city.carIntervalMs) && Number.isFinite(city.hornIntervalMs));
  assert.equal(city.chatterIntervalMs, Infinity);
  assert.equal(gang.trafficGain, 0);
  assert.equal(gang.windGain, 0);
  assert.equal(gang.carIntervalMs, Infinity);
  assert.equal(gang.hornIntervalMs, Infinity);
  assert(gang.chatterIntervalMs < 6000);
});

test("indoor areas stop street voices, nights reduce traffic and quiet the kampung", () => {
  for (const gang of [false, true]) {
    const inside = ambienceLevels({ ...base, gang, indoor: true });
    assert.equal(inside.windGain, 0);
    assert.equal(inside.carIntervalMs, Infinity);
    assert.equal(inside.hornIntervalMs, Infinity);
    assert.equal(inside.chatterIntervalMs, Infinity);
  }
  const day = ambienceLevels(base),
    night = ambienceLevels({ ...base, hour: 23 });
  assert(night.trafficGain < day.trafficGain);
  assert(night.carIntervalMs > day.carIntervalMs);
  assert(night.hornIntervalMs > day.hornIntervalMs);
  assert.equal(ambienceLevels({ ...base, hour: 23, gang: true }).chatterIntervalMs, Infinity);
});
