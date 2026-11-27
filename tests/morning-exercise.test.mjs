import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { eventOpen } from "../src/game/town-events/model.ts";

const source = readFileSync(
  new URL("../src/game/town-events/morning-exercise.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
function setup(change = () => {}) {
  let now = 10000,
    dance = null,
    completed = 0;
  const club = { inside: false, outdoor: false, error: "" };
  const game = { playerPos: [41, 0.83, 2], pendingTeleport: null, setToast: () => {} };
  const event = {
    status: "active",
    event: { key: "senam_pagi", hours: [6, 9], points: [[41, 2]] },
  };
  const state = {
    game,
    event,
    vehicle: null,
    hour: 7,
    gang: false,
    hidden: false,
    elapsed: 0,
    cancel: () => {
      dance = null;
    },
  };
  const commands = [],
    exports = {};
  vm.runInNewContext(compiled, {
    exports,
    eventOpen,
    connectionId: "me",
    document: {
      get hidden() {
        return state.hidden;
      },
    },
    useGame: { getState: () => game },
    useGang: { getState: () => ({ inside: state.gang }) },
    useSceneTime: { getState: () => ({ hour: state.hour }) },
    useClub: { getState: () => club },
    ownVehicle: () => state.vehicle,
    townEvent: () => event,
    danceFor: () => dance,
    clubNow: () => now,
    Date: { now: () => now },
    setTimeout: (done, ms) => {
      now += ms;
      state.elapsed += ms;
      change(state);
      done();
    },
    clubCommand: async (action, extra) => {
      commands.push(action);
      if (action === "enter") {
        club.inside = true;
        club.outdoor = extra.outdoor;
      }
      if (action === "dance") dance = { id: extra.danceId, startedAt: now + 300 };
      if (action === "stop-dance") dance = null;
    },
    progressTownEvent: async () => {
      assert(dance, "dance remains live until server validation");
      assert(now - dance.startedAt >= 8000);
      completed++;
    },
  });
  return {
    state,
    commands,
    run: () => exports.startMorningExercise("walikota", 0),
    busy: exports.isMorningExercise,
    completed: () => completed,
  };
}
test("morning exercise plays before submitting progress and stops afterward", async () => {
  const s = setup();
  await s.run();
  assert.equal(s.completed(), 1);
  assert.deepEqual(s.commands, ["enter", "dance", "stop-dance"]);
  assert.equal(s.busy(), false);
});
test("movement, travel, vehicle boarding, closing hours and cancelled quests never complete exercise", async () => {
  for (const interrupt of [
    (s) => s.cancel(),
    (s) => {
      s.game.playerPos = [45, 0.83, 2];
    },
    (s) => {
      s.game.pendingTeleport = [0, 0, 0];
    },
    (s) => {
      s.vehicle = {};
    },
    (s) => {
      s.hour = 9;
    },
    (s) => {
      s.event.status = "available";
    },
    (s) => {
      s.gang = true;
    },
    (s) => {
      s.hidden = true;
    },
  ]) {
    const s = setup((state) => {
      if (state.elapsed >= 4000) interrupt(state);
    });
    await s.run();
    assert.equal(s.completed(), 0);
    assert.equal(s.busy(), false);
  }
});
test("riders cannot start and repeated interaction cannot submit two rewards", async () => {
  const rider = setup();
  rider.state.vehicle = {};
  await rider.run();
  assert.deepEqual(rider.commands, []);
  const s = setup();
  await Promise.all([s.run(), s.run()]);
  assert.equal(s.completed(), 1);
});
