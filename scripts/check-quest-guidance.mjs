import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/game/core/quest-guidance.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { questGuidanceTarget: target } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const clue = { target: "clue", position: [4, 0, 8], required: 1, realm: "WORLD", secret: {} };
const next = { ...clue, target: "next", position: [10, 0, 12] };
const snapshot = {
  active: { quest_id: "quest", status: "ACTIVE", progress: [0, 0] },
  quests: [{ id: "quest", objectives: [clue, next] }],
};
assert.equal(target(null, null), null);
assert.equal(target(snapshot, null).objective, clue);
snapshot.active.progress = [1, 0];
assert.equal(target(snapshot, null).objective, next);
snapshot.active.progress = [1, 1];
assert.equal(target(snapshot, null), null);
snapshot.active.progress = [0, 0];
for (const status of ["COMPLETED", "CANCELLED", "FAILED", "EXPIRED"]) {
  snapshot.active.status = status;
  assert.equal(target(snapshot, null), null);
}
snapshot.active.status = "ACTIVE";
const dungeon = {
  instance: { status: "ACTIVE", realm: "DUNGEON", progress: [0], found: ["clue-0"] },
  config: {
    objectives: [
      {
        ...clue,
        realm: "DUNGEON",
        positions: [
          [1, 0, 1],
          [2, 4, 2],
        ],
      },
    ],
    entrance: [35, 0, 28],
    spawn: [0, 0, 7],
    worldExit: [0, 0, 10],
  },
};
assert.deepEqual(target(snapshot, dungeon).position, [2, 4, 2]);
dungeon.instance.found.push("clue-1");
assert.equal(target(snapshot, dungeon), null);
dungeon.config.objectives = [clue];
assert.deepEqual(target(snapshot, dungeon).position, dungeon.config.worldExit);
assert.equal(target(snapshot, dungeon).objective, null);
dungeon.instance.realm = "WORLD";
assert.equal(target(snapshot, dungeon).objective, clue);
dungeon.config.objectives = [{ ...clue, realm: "DUNGEON" }];
assert.deepEqual(target(snapshot, dungeon).position, dungeon.config.entrance);
dungeon.instance.status = "COMPLETED";
assert.equal(target(snapshot, dungeon), null);
console.log(
  "PASS quest guidance: active clue, progression, terminal states, dungeon precedence, unfound clues and realm travel",
);

const motionSource = await readFile(
  new URL("../src/game/core/guidance-motion.ts", import.meta.url),
  "utf8",
);
const motionJs = ts.transpileModule(motionSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { guidanceAngle, guidanceDirectionVisible } = await import(
  "data:text/javascript;base64," + Buffer.from(motionJs).toString("base64")
);
const from = Math.PI - 0.02,
  to = -Math.PI + 0.02;
const turned = guidanceAngle(from, to, 1 / 60);
assert(turned > from && turned - from < 0.04, "cross ±PI by the short arc");
const turns = [30, 60, 120].map((fps) => {
  let angle = 0;
  for (let i = 0; i < fps / 2; i++) angle = guidanceAngle(angle, 1.8, 1 / fps);
  return angle;
});
assert(Math.max(...turns) - Math.min(...turns) < 1e-10, "frame-rate independent rotation");
assert.equal(guidanceDirectionVisible(0.79, true), false);
assert.equal(guidanceDirectionVisible(0.9, false), false);
assert.equal(guidanceDirectionVisible(1.16, false), true);
assert.equal(guidanceDirectionVisible(0.9, true), true);
console.log("PASS guidance damping: shortest arc, 30/60/120fps equivalence, arrival hysteresis");
