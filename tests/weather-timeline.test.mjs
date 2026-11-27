import test from "node:test";
import assert from "node:assert/strict";
import { weatherAt } from "../src/game/weather/cycle.ts";
import { FLOOD_VISIBLE_AT } from "../src/game/weather/flood-surface.ts";
import { buildWeatherTimeline } from "../src/game/weather/timeline.ts";

const MINUTE_MS = 60_000;

test("forecast shows two hours of half-hour ticks across the Jakarta date boundary", () => {
  const now = Date.parse("2026-11-27T23:47:11+07:00");
  const timeline = buildWeatherTimeline(now);
  const start = Date.parse("2026-11-27T23:30:00+07:00");
  const end = Date.parse("2026-11-28T01:30:00+07:00");

  assert.equal(timeline.start, start);
  assert.equal(timeline.end, end);
  assert.deepEqual(
    timeline.ticks,
    Array.from({ length: 5 }, (_, i) => start + i * 30 * MINUTE_MS),
  );
  assert.deepEqual(buildWeatherTimeline(now + MINUTE_MS), timeline);
});

test("forecast periods match outdoor weather and only Kampung receives flood periods", () => {
  const { start, end, rows } = buildWeatherTimeline(Date.parse("2026-11-27T11:40:20+07:00"));
  assert.deepEqual(
    rows.map(({ id }) => id),
    ["city", "gang", "mountain"],
  );
  const [city, kampung, mountain] = rows;
  assert.ok(kampung.periods.some(({ condition }) => condition === "flood"));
  assert.deepEqual(mountain.periods, []);

  for (const row of [city, kampung]) {
    let boundary = start;
    let previous;
    for (const period of row.periods) {
      assert.equal(period.start, boundary);
      assert.notEqual(period.condition, previous);
      for (let minute = period.start; minute < period.end; minute += MINUTE_MS) {
        const { rain, flood } = weatherAt(minute + MINUTE_MS / 2);
        const expected =
          row === kampung && flood > FLOOD_VISIBLE_AT ? "flood" : rain > 0 ? "rain" : "clear";
        assert.equal(period.condition, expected);
      }
      boundary = period.end;
      previous = period.condition;
    }
    assert.equal(boundary, end);
  }
});
