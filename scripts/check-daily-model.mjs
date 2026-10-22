import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
}
const { dailyMarker, dailyStep, dailyActionLabel } = await load("../src/game/daily/types.ts");
const { questGuidanceTarget } = await load("../src/game/core/quest-guidance.ts");
const state = (statuses) => ({
  quests: statuses.map((status) => ({ status })),
  claimedCount: statuses.filter((s) => s === "CLAIMED").length,
});
assert.equal(dailyMarker(null), "");
assert.equal(dailyMarker(state(["AVAILABLE"])), "!");
assert.equal(dailyMarker(state(["AVAILABLE", "CLAIMABLE"])), "!");
assert.equal(dailyMarker(state(["ACTIVE", "ACTIVE"])), "");
assert.equal(dailyMarker(state(Array(5).fill("CLAIMED"))), "✓");
const quest = {
  definition: {
    objectives: [
      { required: 1, targetId: "pickup" },
      { required: 1, targetId: "delivery" },
    ],
  },
  progress: [1, 0],
};
assert.equal(dailyStep(quest).objective.targetId, "delivery");
quest.progress = [1, 1];
assert.equal(dailyStep(quest).objective, undefined);
const daily = { objective: { targetId: "daily-target" }, position: [2, 0, 5], realm: "WORLD" };
const story = {
  active: { quest_id: "story", status: "ACTIVE", progress: [0] },
  quests: [{ id: "story", objectives: [{ required: 1, position: [6, 0, 9] }] }],
};
assert.equal(questGuidanceTarget(story, null, daily), daily);
assert.deepEqual(questGuidanceTarget(story, null).position, [6, 0, 9]);
const dungeon = {
  instance: { status: "ACTIVE", realm: "DUNGEON", progress: [0], found: [] },
  config: { objectives: [{ required: 1, position: [9, 0, 9], realm: "DUNGEON" }] },
};
assert.deepEqual(questGuidanceTarget(story, dungeon, daily).position, [9, 0, 9]);
console.log("PASS daily markers, objective steps and dungeon → daily → story guidance precedence");

assert.equal(dailyActionLabel({ type: "COLLECT", targetId: "parcel" }), "Ambil paket");
assert.equal(dailyActionLabel({ type: "VISIT", targetId: "warehouse" }), null);
assert.equal(dailyActionLabel({ type: "DISTANCE" }), null);
assert.equal(dailyActionLabel({ type: "DUNGEON_ENTERED", navigationTargetId: "entrance" }), null);
