import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(readFileSync(new URL("../src/game/weather/cycle.ts", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const forecast = {};
vm.runInNewContext(source, { exports: forecast });

test("one date lists only its rainy hours", () => {
  const hours = forecast.rainOnDate("2026-11-24");
  assert.ok(hours.every((hour) => hour >= 0 && hour < 24));
  assert.deepEqual(forecast.rainOnDate("2026-11-24"), hours);
  assert.equal(forecast.rainOnDate("not-a-date").length, 0);
});

test("rain hours collapse into ranges", () => {
  assert.equal(forecast.hourRanges([7, 8, 9, 14]), "07–09, 14");
  assert.equal(forecast.hourRanges([]), "");
});

test("a week of rain is stable and stays inside the day", () => {
  const now = Date.parse("2026-11-24T03:00:00Z");
  const days = forecast.rainForecast(now);
  assert.equal(days.length, 7);
  assert.equal(days[0].label, "Hari ini");
  assert.equal(days[1].label, "Besok");
  assert.deepEqual(forecast.rainForecast(now), days);
  for (const day of days) {
    assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual(forecast.rainOnDate(day.date), day.hours);
    assert.ok(day.hours.every((hour, index) => hour >= 0 && hour < 24 && (index === 0 || hour > day.hours[index - 1])));
  }
});
