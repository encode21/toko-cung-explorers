import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { create } from "zustand";
import * as motion from "../src/game/world/bus-motion.ts";
import * as routes from "../src/game/world/bus-routes.ts";
import * as timetable from "../src/game/world/bus-timetable.ts";
function runtime(time = 1000) {
  let clock = time;
  const require = (name) => {
    if (name === "zustand") return { create };
    if (name === "./bus-motion") return motion;
    if (name === "./bus-routes") return routes;
    if (name === "./bus-timetable") return timetable;
    if (name === "./bus-ride") return ride;
    if (name === "@/services/world/client")
      return {
        worldRequest: async () => ({ serverNow: clock, timetable: timetable.BUS_TIMETABLE }),
      };
    throw new Error(name);
  };
  const load = (file) => {
    const compiled = ts.transpileModule(
      readFileSync(new URL(`../src/game/world/${file}.ts`, import.meta.url), "utf8"),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      },
    ).outputText;
    const exports = {};
    new Function("require", "exports", "performance", compiled)(require, exports, {
      now: () => clock,
    });
    return exports;
  };
  const ride = load("bus-ride"),
    service = load("bus-service");
  return {
    ...service,
    ...ride,
    setTime: (t) => {
      clock = t;
    },
    tick(dt = 1 / 60, blocked = () => false, scene = "city", visible = () => false) {
      clock += dt * 1000;
      service.tickBusService(scene, dt, blocked, [200, 0.83, 200], visible);
    },
  };
}
test("each stop opens only inside its own schedule; departure belongs to next cycle", () => {
  for (const [stop, offset] of Object.entries(timetable.BUS_TIMETABLE.offsets)) {
    const arrival = 195000 + offset;
    assert.equal(timetable.busCanBoard(stop, arrival - 1), false);
    assert.equal(timetable.busCanBoard(stop, arrival), true);
    assert.equal(timetable.busCanBoard(stop, arrival + 19999), true);
    assert.equal(timetable.busCanBoard(stop, arrival + 20000), false);
    assert.equal(timetable.busWindow(stop, arrival + 20000).arrivalAt, arrival + 195000);
  }
});
test("pedestrian bus circles all city stops twice, keeps fare gate closed in motion", async () => {
  const s = runtime();
  await s.syncBusService();
  const visited = [];
  let previous = null,
    moved = false;
  for (let i = 0; i < 60 * 395; i++) {
    s.tick();
    await Promise.resolve();
    const state = s.useBusRide.getState();
    assert.equal(state.riding, false);
    assert.equal(state.active, true);
    if (state.stop?.id !== previous && state.stop) visited.push(state.stop.id);
    previous = state.stop?.id;
    if (s.busPose.speed > 0) {
      moved = true;
      for (const stop of Object.keys(routes.BUS_STOPS))
        assert.equal(s.busBoarding(stop).canBoard, false);
      assert.equal(s.busPose.door, 0);
    }
  }
  assert(moved);
  assert.deepEqual(visited, ["kota", "gerbang", "pasar", "kota", "gerbang", "pasar", "kota"]);
});
test("service holds during checkout, rejects after cutoff, and brakes for obstacles", async () => {
  const s = runtime();
  await s.syncBusService();
  s.tick();
  s.tick();
  assert(s.busBoarding("kota").canBoard);
  assert(s.holdBusBoarding("kota"));
  const before = { ...s.busPose };
  s.setTime(20000);
  s.tick();
  assert.equal(s.busBoarding("kota").canBoard, false);
  assert.equal(s.busPose.x, before.x);
  s.releaseBusBoarding();
  for (let i = 0; i < 600; i++) s.tick(1 / 60, (p) => p.x < -10);
  assert(s.busPose.x >= -10);
  assert.equal(s.busPose.speed, 0);
  for (let i = 0; i < 120; i++) s.tick();
  assert(s.busPose.x < -10);
});
test("boarding adopts the visible bus, dropoff resumes there, interiors hide the service", async () => {
  const s = runtime();
  await s.syncBusService();
  s.tick();
  s.tick();
  const before = { x: s.busPose.x, z: s.busPose.z };
  const ride = s.startBusRide({
    from: routes.BUS_STOPS.kota,
    legs: routes.cityBusLegs("kota", "pasar"),
    title: "Bus",
    arrive: async () => true,
  });
  assert.deepEqual({ x: s.busPose.x, z: s.busPose.z }, before);
  s.tick();
  assert.equal(s.useBusRide.getState().riding, true);
  s.skipBusRide();
  for (let i = 0; i < 40; i++) {
    s.tickBusRide(0.05);
    await Promise.resolve();
  }
  await ride;
  s.resumeBusService(routes.BUS_STOPS.pasar);
  s.tick();
  s.tick();
  assert.deepEqual({ x: s.busPose.x, z: s.busPose.z }, routes.BUS_STOPS.pasar.pose);
  assert.equal(s.useBusRide.getState().riding, false);
  s.tick(0.02, () => false, null);
  assert.equal(s.useBusRide.getState().active, false);
});
test("kampung bus departs visibly toward the bridge and returns for a later boarding window", async () => {
  const s = runtime();
  await s.syncBusService();
  const scene = { origin: [6000, 0, 3000], end: 160 };
  s.tick(0.02, () => false, scene);
  s.tick(0.02, () => false, scene);
  assert(s.busBoarding("kampung").canBoard);
  s.setTime(20000);
  for (let i = 0; i < 1200; i++) s.tick(1 / 60, () => false, scene);
  assert(s.busPose.z < 2993 - 40);
  assert.equal(s.busBoarding("kampung").canBoard, false);
  for (let i = 0; i < 60 * 160; i++) {
    s.tick(1 / 60, () => false, scene);
    await Promise.resolve();
  }
  assert(s.busBoarding("kampung").canBoard);
});

test("kampung does not recycle a bus while a pedestrian is looking at either bridge endpoint", async () => {
  const s = runtime();
  await s.syncBusService();
  const scene = { origin: [6000, 0, 3000], end: 160 };
  for (let i = 0; i < 60 * 80; i++) {
    s.tick(
      1 / 60,
      () => false,
      scene,
      () => true,
    );
    await Promise.resolve();
  }
  assert(Math.abs(s.busPose.z - 2835) < 0.03);
  s.tick(0.02, () => false, scene);
  assert.equal(s.busPose.z, 3305);
  assert.equal(s.useBusRide.getState().ready, false);
});
