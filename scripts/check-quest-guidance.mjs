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
