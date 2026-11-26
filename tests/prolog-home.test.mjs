import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";
import * as travel from "../src/ui/hud/travel-loader.ts";
afterEach(() => travel.stopTravelRuntime());
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
const { createHomeBedMotion } = load("../src/game/home/bed-motion.ts", model);
const gangModel = load("../src/game/gang/model.ts", {});
const { KIOSK } = load("../src/game/interactions/kiosk.ts", {});

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
    enterGang: (_warungId, _target, request) => enterGang(useGang, request),
    HOME_SPOTS: model.HOME_SPOTS,
    homeWorld: model.homeWorld,
    ...travel,
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
  const ok = homeStore(async (gang) => {
    gang.setState({ inside: 1 });
    return true;
  });
  ok.enterHome();
  await Promise.all([ok.leaveHome(), ok.leaveHome()]);
  assert.equal(ok.useHome.getState().inside, false);
  assert.equal(ok.useHome.getState().leaving, false);
  assert.equal(ok.useGang.getState().inside, 1);
});
test("city fallback invalidates the shared gang ticket before a late response", async () => {
  let ticket, expire, respond;
  const hung = homeStore((_gang, request) => {
    ticket = request;
    return new Promise((resolve) => { respond = resolve; });
  }, {
    setTimeout: (fn) => { expire = fn; return 0; },
    clearTimeout: () => {},
  });
  hung.enterHome();
  const leaving = hung.leaveHome();
  assert.equal(travel.travelRequestCurrent(ticket), true);
  expire();
  await leaving;
  assert.equal(hung.useHome.getState().inside, false);
  assert.equal(hung.useHome.getState().leaving, false);
  assert.equal(travel.travelRequestCurrent(ticket), false);
  respond(true);
  await new Promise(setImmediate);
  assert.equal(hung.useGang.getState().inside, null);
  assert.deepEqual([...hung.useGame.getState().pendingTeleport], [-34.5, 0.83, -47]);
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

test("the sleep action starts climbing and waits for a held pose before the summary", () => {
  const [x, y, z] = model.homeWorld(model.HOME_SPOTS.bed);
  const start = { x, y, z: z + model.HOME_BED.halfDepth + 0.65 };
  const useHome = create(() => ({ inside: true, leaving: false }));
  const useGame = create(() => ({ playerPos: [start.x, start.y, start.z] }));
  const useProlog = create(() => ({
    data: { version: 2, step: "sleep", completedAt: null, text: { sleep: "Tidur" } },
  }));
  const s = load("../src/game/prolog/pulang/steps.ts", {
    create,
    useGame,
    useHome,
    useProlog,
    ...model,
  });
  const actions = s.prologHomeActions();
  const sleep = actions.find((action) => action.id === "pulang:bed");
  assert.ok(sleep);
  sleep.execute();
  assert.equal(s.usePulang.getState().sleepMotion, "climbing");
  assert.equal(s.usePulang.getState().sleeping, false);
  assert.equal(s.prologHomeActions().length, 0, "prevent interactions during the sequence");

  const motion = createHomeBedMotion(start);
  const step = motion.update(0.35);
  assert.ok(step.position.y > start.y, "raise the character before lying down");
  assert.equal(step.lying, false);
  const lying = motion.update(0.8);
  assert.equal(lying.lying, true);
  assert.equal(lying.ready, false);
  assert.equal(lying.yaw, 0, "head points toward the pillow on the negative z side");
  assert.ok(lying.position.y >= y + model.HOME_BED.top);
  assert.equal(motion.update(0).ready, false, "no frame time elapses while the page is hidden");
  assert.equal(motion.update(0.95).ready, true);

  s.endPrologSleep();
  assert.equal(s.usePulang.getState().sleepMotion, null);
  assert.equal(s.usePulang.getState().sleeping, false);
});

test("prolog routes start on new legs, stay stopped after a poll and preserve other waypoints", async () => {
  const useProlog = create(() => ({
    data: {
      version: 2,
      step: "window",
      completedAt: null,
      goal: { kind: "serve", done: false },
      text: {},
    },
  }));
  const useHome = create(() => ({ inside: true }));
  const useGang = create(() => ({
    inside: null,
    data: {
      gang: 1,
      home: { gang: 1, number: 1 },
      layout: { origin: [6000, 0, 3000], house_offset: 12, house_spacing: 18 },
      houses: [{ number: 1, mine: true, warung: { lot: null, name: "Warungku" } }],
    },
  }));
  const useGame = create((set) => ({
    waypoint: null,
    guidanceMuted: false,
    setWaypoint: (waypoint) => set({ waypoint, ...(waypoint ? { guidanceMuted: false } : {}) }),
  }));
  const home = load("../src/game/prolog/pulang/steps.ts", {
    create, useHome, useGang, useProlog, ...model, ...gangModel,
  });
  const guide = load("../src/game/prolog/guidance.ts", {
    useProlog, useHome, useGang, useGame, ...home, queueMicrotask,
    useChannels: create(() => ({ playing: true })),
    useOjek: create(() => ({})),
    useWarung: create(() => ({ inside: null, data: null, lots: [] })),
  });
  const setStep = (step) => useProlog.setState((s) => ({ data: { ...s.data, step } }));
  const waypoint = () => useGame.getState().waypoint;
  const stop = guide.startPrologGuidance();
  await Promise.resolve();
  assert.equal(waypoint(), "prolog-home-window");
  const [x, , z] = model.homeWorld(model.HOME_SPOTS.window);
  assert.deepEqual([...guide.prologDestination(waypoint()).position], [x, 0, z]);

  useGame.setState({ waypoint: null, guidanceMuted: true });
  setStep("window");
  await Promise.resolve();
  assert.equal(waypoint(), null);
  assert.equal(useGame.getState().guidanceMuted, true);
  setStep("box");
  await Promise.resolve();
  assert.equal(waypoint(), "prolog-home-box");
  assert.equal(useGame.getState().guidanceMuted, false);

  useGame.getState().setWaypoint("venue-park");
  setStep("gang");
  await Promise.resolve();
  assert.equal(waypoint(), "venue-park");
  useHome.setState({ inside: false });
  useGame.getState().setWaypoint(null);
  useGang.setState({ inside: 1 });
  await Promise.resolve();
  assert.equal(waypoint(), "prolog-home-romlah");
  home.usePulang.setState({ talked: ["romlah", "kosim"] });
  await Promise.resolve();
  assert.equal(waypoint(), "prolog-home-mouth");

  setStep("goal");
  await Promise.resolve();
  assert.equal(waypoint(), "prolog-home-shop");
  const shop = guide.prologDestination(waypoint()).position;
  const door = guide.prologDestination("prolog-home-door").position;
  assert.ok(Math.hypot(shop[0] - door[0], shop[2] - door[2]) > 2);

  useGang.setState({ inside: 2 });
  setStep("return");
  await Promise.resolve();
  assert.equal(waypoint(), "prolog-gate");
  assert.equal(guide.prologDestination("prolog-home-door"), undefined);
  useProlog.setState((s) => ({ data: { ...s.data, completedAt: "done" } }));
  await Promise.resolve();
  assert.equal(waypoint(), null);

  useGame.getState().setWaypoint("venue-park");
  stop();
  assert.equal(waypoint(), "venue-park");
});

test("restock guidance switches between the Grosir entrance and the actual kiosk", async () => {
  const useGame = create((set) => ({
    inside: false,
    waypoint: null,
    guidanceMuted: false,
    setWaypoint: (waypoint) => set({ waypoint, guidanceMuted: false }),
  }));
  const useProlog = create(() => ({
    data: { version: 2, step: "goal", completedAt: null, goal: { kind: "restock", done: false } },
  }));
  const guide = load("../src/game/prolog/guidance.ts", {
    KIOSK,
    needsHome: () => false,
    queueMicrotask,
    useGame,
    useProlog,
    useChannels: create(() => ({ playing: true })),
    useHome: create(() => ({ inside: false })),
    useGang: create(() => ({ inside: null })),
    usePulang: create(() => ({})),
    useOjek: create(() => ({})),
    useWarung: create(() => ({})),
  });
  const stop = guide.startPrologGuidance();
  await Promise.resolve();
  assert.equal(useGame.getState().waypoint, "prolog-restock");

  useGame.setState({ inside: true });
  await Promise.resolve();
  const kiosk = guide.prologDestination(useGame.getState().waypoint);
  assert.equal(kiosk?.id, "prolog-restock-kiosk");
  assert.equal(kiosk.position, KIOSK.position);
  assert.equal(kiosk.interior, true);

  useGame.setState({ guidanceMuted: true, playerPos: [2, 0, 1] });
  useProlog.setState((state) => ({ data: { ...state.data } }));
  await Promise.resolve();
  assert.equal(useGame.getState().guidanceMuted, true);

  useGame.setState({ inside: false });
  await Promise.resolve();
  assert.equal(useGame.getState().waypoint, "prolog-restock");
  stop();
});

test("serve travel goes to the own warung porch and preserves city shop guidance", async () => {
  const useGame = create((set) => ({
    waypoint: null,
    setWaypoint: (waypoint) => set({ waypoint }),
  }));
  const useGameUi = create(() => ({ traveling: false }));
  const useWarung = create(() => ({ inside: null, data: null, lots: [] }));
  const useHome = create(() => ({ inside: false }));
  const homeShop = { lot: null };
  const useGang = create(() => ({ data: { houses: [{ mine: true, warung: homeShop }] } }));
  const trips = [];
  const guide = load("../src/game/prolog/guidance.ts", {
    useGame,
    useGameUi,
    useWarung,
    useHome,
    useGang,
    useProlog: create(() => ({
      data: { version: 2, step: "goal", completedAt: null, goal: { kind: "serve", done: false } },
    })),
    needsHome: () => false,
    enterGang: (...args) => {
      trips.push(args);
      useGameUi.setState({ traveling: true });
    },
    leaveHome: () => trips.push("home"),
  });
  await guide.goToPrologWarung();
  await guide.goToPrologWarung();
  assert.deepEqual(trips, [[]], "use the default own-porch arrival and ignore a double tap");

  useGameUi.setState({ traveling: false });
  homeShop.lot = 0;
  await guide.goToPrologWarung();
  assert.equal(useGame.getState().waypoint, "prolog-serve");
  assert.deepEqual(trips, [[]], "a relocated shop does not send the player to an empty porch");

  useHome.setState({ inside: true });
  await guide.goToPrologWarung();
  assert.deepEqual(trips, [[], "home"]);
});
