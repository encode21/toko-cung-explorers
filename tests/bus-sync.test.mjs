import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { create } from "zustand";
import * as motion from "../src/game/world/bus-motion.ts";
import * as routes from "../src/game/world/bus-routes.ts";
import * as timetable from "../src/game/world/bus-timetable.ts";
import { validBusSnapshot } from "../src/game/world/bus-protocol.ts";
const compiled = Object.fromEntries(
  ["bus-ride", "bus-service", "bus-sync"].map((name) => [
    name,
    ts.transpileModule(
      readFileSync(new URL(`../src/game/world/${name}.ts`, import.meta.url), "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
    ).outputText,
  ]),
);
function room() {
  let clock = 1000,
    serial = 0;
  const peers = new Map(),
    queue = [],
    windows = new Map(),
    history = [];
  const presence = () => {
    const roster = [...peers].map(([id, p], i) => ({
      id,
      joinedAt: i + 1,
      available: true,
      ...p.sync.busPresence(),
    }));
    for (const p of peers.values()) p.net.setState({ roster });
  };
  function add(id, scene = "city") {
    const modules = {},
      net = create(() => ({ connected: true, roster: [] }));
    const api = {
      worldRequest: async (_, data) => {
        if (data.action === "read") return { serverNow: clock, timetable: timetable.BUS_TIMETABLE };
        if (!windows.has(data.requestId))
          windows.set(data.requestId, { arrivalAt: clock, departureAt: clock + 20000 });
        return { ...windows.get(data.requestId), boardingToken: `signed-${id}` };
      },
    };
    const req = (name) => {
      if (name === "zustand") return { create };
      if (name === "@/lib/id") return { createId: () => `id-${++serial}` };
      if (name === "@/net/net-store") return { useNet: net };
      if (name === "@/net/useWorldChannel")
        return {
          playerId: id,
          refreshWorldPresence: presence,
          getActiveChannel: () => ({
            send: ({ payload }) => {
              queue.push(structuredClone(payload));
              history.push(structuredClone(payload));
            },
          }),
        };
      if (name === "@/services/world/client") return api;
      if (name === "./bus-motion") return motion;
      if (name === "./bus-routes") return routes;
      if (name === "./bus-timetable") return timetable;
      if (name === "./bus-protocol") return { validBusSnapshot };
      if (modules[name.slice(2)]) return modules[name.slice(2)];
      throw new Error(name);
    };
    for (const [name, code] of Object.entries(compiled)) {
      modules[name] = {};
      new Function("require", "exports", "performance", code)(req, modules[name], {
        now: () => clock,
      });
    }
    const p = {
      net,
      ride: modules["bus-ride"],
      service: modules["bus-service"],
      sync: modules["bus-sync"],
      scene,
    };
    peers.set(id, p);
    p.sync.followNetworkBus(scene);
    presence();
    return p;
  }
  function deliver() {
    while (queue.length) {
      const m = queue.shift();
      for (const [id, p] of peers) if (id !== m.peer) p.sync.handleBusMessage(structuredClone(m));
    }
  }
  async function tick(frames = 1, obstacle = () => false) {
    for (let i = 0; i < frames; i++) {
      clock += 1000 / 60;
      for (const p of peers.values()) {
        if (!p.sync.followNetworkBus(p.scene)) {
          p.ride.tickBusRide(1 / 60, obstacle);
          p.service.tickBusService(p.scene, 1 / 60, obstacle, [200, 0.83, 200]);
          p.sync.publishBus();
        }
      }
      deliver();
      await Promise.resolve();
    }
  }
  return {
    add,
    tick,
    deliver,
    history,
    drop(id) {
      peers.get(id).sync.resetBusSync();
      peers.delete(id);
      presence();
    },
    presence,
  };
}
function near(a, b) {
  assert(
    Math.hypot(a.ride.busPose.x - b.ride.busPose.x, a.ride.busPose.z - b.ride.busPose.z) < 1.5,
    "observer follows the physical bus",
  );
}
test("two pedestrians share boarding deadline, missed departure and traffic stops; late join catches up", async () => {
  const r = room(),
    a = r.add("a"),
    b = r.add("b");
  await r.tick(30);
  assert(a.service.busBoarding("kota").canBoard);
  assert(b.service.busBoarding("kota").canBoard);
  assert.equal(
    a.service.busBoarding("kota").departureAt,
    b.service.busBoarding("kota").departureAt,
  );
  assert.notEqual(
    a.service.busBoarding("kota").boardingToken,
    b.service.busBoarding("kota").boardingToken,
  );
  await r.tick(1800, (p) => p.x < -12);
  near(a, b);
  assert.equal(a.ride.busPose.speed, 0);
  assert(a.ride.busPose.x >= -12);
  assert(!b.service.busBoarding("kota").canBoard);
  const c = r.add("c");
  await r.tick(30, (p) => p.x < -12);
  near(a, c);
  await r.tick(180);
  near(a, b);
  near(a, c);
  assert(a.ride.busPose.x < -12);
  const pose = { ...b.ride.busPose };
  b.sync.handleBusMessage(r.history.find((m) => m.type === "snapshot"));
  b.sync.followNetworkBus("city");
  assert(Math.hypot(pose.x - b.ride.busPose.x, pose.z - b.ride.busPose.z) < 1);
  r.drop("a");
  await r.tick(120);
  near(b, c);
  assert(b.ride.busPose.speed > 0);
});
test("one rider reserves before payment; spectators and late join see that trip; disconnect hands bus back", async () => {
  const r = room(),
    a = r.add("a"),
    b = r.add("b"),
    c = r.add("c");
  await r.tick(30);
  assert(b.service.holdBusBoarding("kota"));
  const first = b.sync.claimBusControl(),
    second = c.sync.claimBusControl();
  r.deliver();
  assert.equal(await first, true);
  assert.equal(await second, false);
  void b.ride.startBusRide({
    title: "Keliling kota",
    from: routes.BUS_STOPS.kota,
    legs: routes.cityBusLegs("kota", "keliling"),
    arrive: async () => true,
  });
  await r.tick(600);
  near(a, b);
  near(c, b);
  assert.equal(a.ride.useBusRide.getState().riding, false);
  assert(b.ride.busPose.speed > 0);
  assert(!a.service.busBoarding("kota").canBoard);
  const d = r.add("d");
  await r.tick(30);
  near(b, d);
  const before = { ...a.ride.busPose };
  r.drop("b");
  await r.tick(120);
  near(a, c);
  near(a, d);
  assert(
    Math.hypot(before.x - a.ride.busPose.x, before.z - a.ride.busPose.z) < 15,
    "handoff does not teleport to a timetable seed",
  );
});
test("kampung observers share one compact bus independently of the city service", async () => {
  const r = room(),
    a = r.add("a"),
    scene = { origin: [6000, 0, 3000], end: 160 },
    b = r.add("b", scene),
    c = r.add("c", scene);
  await r.tick(1800);
  near(b, c);
  assert(b.ride.busPose.x > 5000);
  assert(a.ride.busPose.x < 500);
  assert(b.ride.useBusRide.getState().compact);
});
test("snapshot boundary rejects malformed geometry, NaN, excessive arrays and invalid service progress", async () => {
  const r = room();
  r.add("a");
  await r.tick(30);
  const sample = r.history.find((m) => m.type === "snapshot");
  assert(validBusSnapshot(sample));
  for (const mutate of [
    (s) => (s.pose.x = NaN),
    (s) => (s.pose.speed = -1),
    (s) => (s.state.queues = Array(100).fill({})),
    (s) => (s.service.index = 100),
    (s) => (s.service.window = { arrivalAt: 0, departureAt: 1e10 }),
  ]) {
    const bad = structuredClone(sample);
    mutate(bad);
    assert.equal(validBusSnapshot(bad), false);
  }
});

test("returning control after checkout failure reopens the same boarding window", async () => {
  const r = room(),
    a = r.add("a"),
    b = r.add("b");
  await r.tick(30);
  const departure = a.service.busBoarding("kota").departureAt;
  const claim = b.sync.claimBusControl();
  r.deliver();
  assert(await claim);
  await r.tick(15);
  b.sync.releaseBusControl();
  r.deliver();
  await r.tick(30);
  assert(a.service.busBoarding("kota").canBoard);
  assert(b.service.busBoarding("kota").canBoard);
  assert.equal(a.service.busBoarding("kota").departureAt, departure);
});
test("identical kampung coordinates in different gangs elect separate service hosts", async () => {
  const r = room();
  r.add("a", { origin: [6000, 0, 3000], end: 160, gang: 1 });
  r.add("b", { origin: [6000, 0, 3000], end: 160, gang: 2 });
  await r.tick(30);
  const arrivals = new Set(
    r.history
      .filter((m) => m.type === "snapshot" && m.service.arrivalId)
      .map((m) => m.service.arrivalId),
  );
  assert.equal(arrivals.size, 2);
});
