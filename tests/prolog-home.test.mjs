import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";
function compiled(file) {
  return ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8").replace(/^import [\s\S]*?;$/gm, ""),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText;
}
function load(file, context) {
  const exports = {};
  vm.runInNewContext(compiled(file), { exports, ...context });
  return exports;
}
const model = load("../src/game/home/model.ts", {});
const gangModel = load("../src/game/gang/model.ts", {});

test("home camera still publishes playerPos before it returns", () => {
  const src = readFileSync(new URL("../src/game/player/Player.tsx", import.meta.url), "utf8");
  const sync = src.indexOf("setPlayerPos([p.x, p.y, p.z]");
  const home = src.indexOf("if (isHomeRoom(p.x, p.z))");
  assert.ok(sync > 0 && home > sync, "sleep and leave read playerPos, which the home view used to skip");
});

test("Rumah is an off-grid private room, apart from city, warung and gang", () => {
  assert.equal(model.isHomeRoom(9000, 3000), true);
  for (const [x, z] of [
    [0, 12],
    [3000, 3000],
    [6000, 3000],
  ])
    assert.equal(model.isHomeRoom(x, z), false);
  const bed = model.homeWorld(model.HOME_SPOTS.bed);
  assert.equal(model.nearHomeSpot(bed, model.HOME_SPOTS.bed), true);
  assert.equal(model.nearHomeSpot(bed, model.HOME_SPOTS.door), false);
});

function homeStore(enterGang, timers = { setTimeout, clearTimeout }) {
  const useGame = create(() => ({ waypoint: "x", pendingTeleport: null }));
  const useGang = create(() => ({ inside: 3, customize: true, board: true }));
  const useHud = create(() => ({
    sheet: "notes",
    setSheet: (sheet) => useHud.setState({ sheet }),
  }));
  const s = load("../src/game/home/store.ts", {
    create,
    useGame,
    useHud,
    useGang,
    enterGang: () => enterGang(useGang),
    HOME_SPOTS: model.HOME_SPOTS,
    homeWorld: model.homeWorld,
    showLoader: () => {},
    cityHalteArrival: gangModel.cityHalteArrival,
    ...timers,
  });
  return { ...s, useGame, useGang, useHud };
}
test("entering the Rumah leaves the gang scene and teleports to the room", () => {
  const s = homeStore(async () => {});
  s.enterHome();
  assert.equal(s.useHome.getState().inside, true);
  assert.equal(s.useGang.getState().inside, null);
  assert.equal(s.useHud.getState().sheet, null);
  assert.deepEqual(s.useGame.getState().pendingTeleport, model.homeWorld(model.HOME_SPOTS.spawn));
});
test("the door always leaves: the city gate when the gang cannot be entered", async () => {
  const fail = homeStore(async () => {});
  fail.enterHome();
  await fail.leaveHome();
  assert.equal(fail.useHome.getState().inside, false);
  assert.deepEqual([...fail.useGame.getState().pendingTeleport], [-34.5, 0.83, -47]);
  const ok = homeStore(async (gang) => gang.setState({ inside: 1 }));
  ok.enterHome();
  await Promise.all([ok.leaveHome(), ok.leaveHome()]);
  assert.equal(ok.useHome.getState().inside, false);
  assert.equal(ok.useHome.getState().leaving, false);
});
test("a hung gang request still lets the player out", async () => {
  const hung = homeStore(() => new Promise(() => {}), {
    setTimeout: (fn) => (fn(), 0),
    clearTimeout: () => {},
  });
  hung.enterHome();
  await hung.leaveHome();
  assert.equal(hung.useHome.getState().inside, false);
  assert.equal(hung.useHome.getState().leaving, false);
});

// Every prolog v2 step (config/world-prolog.php v2.steps) must have a reachable trigger in the client.
const V2_STEPS = ["wake", "window", "box", "phone", "gang", "reveal", "map", "koko", "path", "goal", "return", "sleep"];
test("every prolog v2 step has a client trigger", () => {
  const src = ["../src/game/prolog/pulang/steps.ts", "../src/game/prolog/pulang/PrologHomeUI.tsx",
    "../src/game/prolog/pulang/PrologHomeRuntime.tsx", "../src/game/prolog/PrologUI.tsx"]
    .map((f) => readFileSync(new URL(f, import.meta.url), "utf8"))
    .join("\n");
  for (const step of V2_STEPS) {
    const direct = src.includes(`advance("${step}")`) || src.includes(`{ step: "${step}" }`);
    const viaPath = step === "path" && src.includes('"choose-path"');
    assert.ok(direct || viaPath, `step ${step} has no trigger`);
  }
});
test("room tasks outside the Rumah lead home instead of asking for a missing jendela", () => {
  const useHome = create(() => ({ inside: false }));
  const s = load("../src/game/prolog/pulang/steps.ts", { create, useHome, Set, Math });
  for (const step of ["window", "box", "sleep"]) assert.equal(s.needsHome(step), true, step);
  for (const step of ["wake", "phone", "gang", "koko", "return"]) assert.equal(s.needsHome(step), false, step);
  useHome.setState({ inside: true });
  assert.equal(s.needsHome("window"), false);
});
