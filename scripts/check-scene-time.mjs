import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/game/time/model.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { describeTime, jakartaMinutes, parseWorldTime, artificialLightLevels, sunDirection } =
  await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
assert.equal(describeTime(jakartaMinutes(Date.parse("2026-10-07T01:30:00Z"))).currentTime, "08:30");
assert.equal(describeTime(jakartaMinutes(Date.parse("2026-10-07T18:00:00Z"))).currentTime, "01:00");
for (const [time, period] of [
  ["06:00", "DAWN"],
  ["08:30", "MORNING"],
  ["12:00", "DAY"],
  ["16:00", "AFTERNOON"],
  ["17:30", "GOLDEN_HOUR"],
  ["19:00", "EVENING"],
  ["23:00", "NIGHT"],
]) {
  const state = describeTime(parseWorldTime(time));
  assert.equal(state.timeOfDay, period);
  assert.equal(state.currentTime, time);
  assert.ok(state.dayProgress >= 0 && state.dayProgress < 1);
}
for (const invalid of ["24:00", "8:30", "12:60", "noon", "-1:00"])
  assert.throws(() => parseWorldTime(invalid));
assert.equal(describeTime(1440).currentTime, "00:00");
assert.equal(describeTime(-1).currentTime, "23:59");
assert.equal(describeTime(19 * 60).isStoreOpen, true);
assert.equal(describeTime(22 * 60).isStoreOpen, false);
assert.equal(artificialLightLevels(1050).street, 0);
assert.equal(artificialLightLevels(1095).street, 1);
assert.ok(artificialLightLevels(1070).street > 0 && artificialLightLevels(1070).street < 1);
assert.ok(artificialLightLevels(1140).store > artificialLightLevels(1380).store);
assert.equal(artificialLightLevels(0).store, artificialLightLevels(1440).store);
// Fade continuity at every minute, including dawn, closing and midnight.
for (let m = 0; m < 1440; m++) {
  const a = artificialLightLevels(m),
    b = artificialLightLevels((m + 1) % 1440);
  assert.ok(Math.abs(a.street - b.street) < 0.06);
  assert.ok(Math.abs(a.store - b.store) < 0.06);
}
assert.ok(sunDirection(480)[0] > 0 && sunDirection(990)[0] < 0);
assert.ok(sunDirection(720)[1] > sunDirection(480)[1]);
assert.ok(sunDirection(1380)[1] < 0);
console.log(
  "SceneTime: WIB, presets, rollover, opening metadata, smooth light fades and sun trajectory passed.",
);
