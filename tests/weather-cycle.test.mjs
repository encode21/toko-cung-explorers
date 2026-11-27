import test from "node:test";
import assert from "node:assert/strict";
import { weatherAt, floodSpeedFactor, WEATHER_SLOT_MS } from "../src/game/weather/cycle.ts";
import { floodSurfaceAt, floodWaterY, mountFloodZone } from "../src/game/weather/flood-surface.ts";

test("weather stays in range and some slots rain while others are clear", () => {
  let rainy = 0;
  for (let slot = 0; slot < 200; slot++) {
    const mid = weatherAt(slot * WEATHER_SLOT_MS + WEATHER_SLOT_MS * 0.4);
    assert.ok(mid.rain >= 0 && mid.rain <= 1 && mid.flood >= 0 && mid.flood <= 1);
    if (mid.rain > 0) rainy++;
  }
  assert.ok(rainy > 40 && rainy < 120, `rainy slots: ${rainy}`);
});
test("a rainy slot ramps up, floods after the rain starts, and fully drains before the next slot", () => {
  let slot = 0;
  while (weatherAt(slot * WEATHER_SLOT_MS + WEATHER_SLOT_MS * 0.4).rain === 0) slot++;
  const at = (p) => weatherAt(slot * WEATHER_SLOT_MS + WEATHER_SLOT_MS * p);
  assert.equal(at(0).rain, 0);
  assert.equal(at(0.4).rain, 1);
  assert.equal(at(0.1).flood, 0);
  assert.equal(at(0.6).flood, 1);
  assert.ok(at(0.7).flood > at(0.7).rain);
  assert.deepEqual(at(0.97), { rain: 0, flood: 0 });
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
