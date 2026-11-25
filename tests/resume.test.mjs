import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(
  readFileSync(new URL("../src/game/player/resume.ts", import.meta.url), "utf8").replace(
    /^import [\s\S]*?;$/gm,
    "",
  ),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;

function setup({ prolog = null, dungeonSpawn = null, gangOk = true } = {}) {
  const calls = [];
  let game = { pendingTeleport: null };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    useGame: { setState: (s) => (game = { ...game, ...s }) },
    enterHome: () => calls.push("home"),
    enterGang: async () => (calls.push("gang"), gangOk),
    isGangPosition: (x) => x >= 5900 && x <= 6100,
    isHomeRoom: (x) => Math.abs(x - 9000) < 20,
    isMountainPosition: (x) => x > 400,
    useDungeon: { getState: () => ({ spawn: dungeonSpawn }) },
    useProlog: { getState: () => ({ data: prolog }) },
    IN_ROOM_STEPS: new Set(["wake", "window", "box", "phone", "sleep"]),
  });
  // JSON round-trip: arrays built inside the vm realm fail deepEqual on prototype.
  return { apply: exports.applyResume, calls, game: () => JSON.parse(JSON.stringify(game)), raw: () => game };
}
const lease = (resume, playerId = "p1") => ({ playerId, resume });

test("re-entry teleports back to the last city spot, once per account", async () => {
  const s = setup();
  await s.apply(lease({ scene: "city", position: [12, 0.83, -40] }));
  assert.deepEqual(s.game().pendingTeleport, [12, 0.83, -40]);
  s.raw().pendingTeleport = null;
  await s.apply(lease({ scene: "city", position: [1, 0.83, 1] }));
  assert.equal(s.game().pendingTeleport, null, "a channel switch keeps the live position");
});

test("gang and home rebuild the scene first, then return to the exact spot", async () => {
  const g = setup();
  await g.apply(lease({ scene: "gang", position: [6010, 0.83, 2990] }));
  assert.deepEqual([g.calls, g.game().pendingTeleport], [["gang"], [6010, 0.83, 2990]]);
  const h = setup();
  await h.apply(lease({ scene: "home", position: null }));
  assert.deepEqual([h.calls, h.game().pendingTeleport], [["home"], null], "away too long: Rumah default spot");
});

test("unsafe or owned placements are left alone", async () => {
  const mountain = setup();
  await mountain.apply(lease({ scene: "city", position: [450, 0.83, 0] }));
  assert.equal(mountain.game().pendingTeleport, null);
  const dungeon = setup({ dungeonSpawn: [0, 0, 0] });
  await dungeon.apply(lease({ scene: "home", position: null }));
  assert.deepEqual(dungeon.calls, []);
  const prolog = setup({ prolog: { version: 2, completedAt: null, step: "wake" } });
  await prolog.apply(lease({ scene: "city", position: [12, 0.83, -40] }));
  assert.equal(prolog.game().pendingTeleport, null, "the prolog places its own room steps");
  const failedGang = setup({ gangOk: false });
  await failedGang.apply(lease({ scene: "gang", position: [6010, 0.83, 2990] }));
  assert.equal(failedGang.game().pendingTeleport, null, "no gang data: stay at the city spawn");
});
