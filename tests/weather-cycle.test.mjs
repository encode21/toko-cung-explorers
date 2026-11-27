import test from "node:test";
import assert from "node:assert/strict";
import {
  weatherAt,
  floodSpeedFactor,
  WEATHER_SLOT_MS,
  CLEAR_WEATHER,
} from "../src/game/weather/cycle.ts";
import { floodSurfaceAt, floodWaterY, mountFloodZone } from "../src/game/weather/flood-surface.ts";

test("weather stays in range and some slots rain while others are clear", () => {
  let rainy = 0;
  for (let slot = 0; slot < 200; slot++) {
    const mid = weatherAt(slot * WEATHER_SLOT_MS + WEATHER_SLOT_MS * 0.4);
    assert.ok(mid.rain >= 0 && mid.rain <= 1 && mid.flood >= 0 && mid.flood <= 1);
    if (mid.rain > 0) rainy++;
  }
  assert.ok(rainy > 20 && rainy < 60, `rainy slots: ${rainy}`);
});
test("a rainy slot ramps up, floods after the rain starts, and fully drains before the next slot", () => {
  let slot = 0;
  while (weatherAt(slot * WEATHER_SLOT_MS + WEATHER_SLOT_MS * 0.4).rain === 0) slot++;
  const at = (p) => weatherAt(slot * WEATHER_SLOT_MS + WEATHER_SLOT_MS * p);
  assert.equal(at(0).rain, 0);
  assert.equal(at(0.5).rain, 1);
  assert.deepEqual(
    [0.1, 0.3, 0.5, 0.7, 0.87, 0.995].map((p) => at(p).phase),
    ["drizzle", "rain", "heavy", "clearing", "rainbow", "clear"],
  );
  assert.ok(at(0.1).rain < at(0.3).rain && at(0.3).rain < at(0.5).rain);
  assert.ok(at(0.7).rain > at(0.75).rain);
  assert.equal(at(0.79).rainbow, 0);
  assert.equal(at(0.87).rain, 0);
  assert.equal(at(0.87).rainbow, 1);
  assert.equal(at(0.1).flood, 0);
  assert.equal(at(0.6).flood, 1);
  assert.ok(at(0.7).flood > at(0.7).rain);
  assert.deepEqual(at(0.995), CLEAR_WEATHER);
  for (const boundary of [0.2, 0.4, 0.48, 0.6, 0.8, 0.84, 0.92, 0.95, 0.99]) {
    for (const key of ["rain", "flood", "rainbow"])
      assert.ok(Math.abs(at(boundary - 0.00001)[key] - at(boundary + 0.00001)[key]) < 0.001);
  }
});
test("flood slows walking up to 45%", () => {
  assert.equal(floodSpeedFactor(0), 1);
  assert.equal(floodSpeedFactor(1), 0.55);
  assert.equal(floodSpeedFactor(5), 0.55);
});

test("Kampung flood contacts use the mounted surface and leave the bridge dry", () => {
  const unmount = mountFloodZone({ origin: [6000, 0.1, 3000], width: 100, from: -15, to: 130 });
  try {
    assert.equal(floodSurfaceAt(6000, 3016, 0), null);
    assert.equal(floodSurfaceAt(6000, 3016, 1), floodWaterY(1) + 0.1);
    assert(floodWaterY(0.5) < floodWaterY(1));
    assert.equal(floodSurfaceAt(6000, 2984, 1), null);
    assert.equal(floodSurfaceAt(6051, 3016, 1), null);
  } finally {
    unmount();
  }
  assert.equal(floodSurfaceAt(6000, 3016, 1), null);
});
