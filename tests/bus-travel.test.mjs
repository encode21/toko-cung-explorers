import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { create } from "zustand";
import * as road from "../src/game/world/road-path.ts";
import * as motion from "../src/game/world/bus-motion.ts";
import * as routes from "../src/game/world/bus-routes.ts";
const compiled = ts.transpileModule(
  readFileSync(new URL("../src/game/world/halte-actions.ts", import.meta.url), "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  },
).outputText;
function setup(from, fail = false, simulate = false) {
  const ride = {};
  if (simulate) {
    const code = ts.transpileModule(
      readFileSync(new URL("../src/game/world/bus-ride.ts", import.meta.url), "utf8"),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      },
    ).outputText;
    new Function("require", "exports", code)((name) => {
      if (name === "zustand") return { create };
      if (name === "./bus-motion") return motion;
      throw new Error(name);
    }, ride);
  }
  const data = {
    enabled: true,
    houses: Array(10),
    layout: { origin: [6000, 0, 3000], house_spacing: 24 },
  };
  const stop =
    from === "kampung" ? routes.kampungBusStop(data.layout.origin) : routes.BUS_STOPS[from];
  const useGang = create(() => ({ data, inside: from === "kampung" ? 1 : null }));
  const useGame = create(() => ({
    playerPos: stop.board,
    pendingTeleport: null,
    setToast: () => {},
  }));
  const useWarung = create(() => ({ data: { warung: { cash: 10000 } } }));
  let available = true;
  const requests = [],
    trips = [];
  const exports = {};
  new Function("require", "exports", compiled)((name) => {
    if (name === "zustand") return { create };
    if (name === "./road-path") return road;
    if (name === "./bus-routes") return routes;
    if (name === "./bus-service")
      return {
        busBoarding: () => ({
          canBoard: available,
          arrivalAt: 0,
          departureAt: 20000,
          boardingToken: "signed",
        }),
        holdBusBoarding: () => available,
        releaseBusBoarding: () => {},
        resumeBusService: () => {},
        busNow: () => 10000,
        serviceWindow: () => ({ arrivalAt: 0, departureAt: 20000, boardingToken: "signed" }),
      };
    if (name === "@/game/gang/store")
      return {
        useGang,
        busToGangBlocked: () => null,
        gangCommand: async () => data,
        enterGang: async (_, target) => {
          useGang.setState({ inside: target?.gang ?? 1 });
          return true;
        },
        leaveGang: () => useGang.setState({ inside: null }),
      };
    if (name === "@/lib/id") return { createId: () => "test-id" };
    if (name === "@/state/game-store") return { useGame };
    if (name === "@/game/warung/store") return { useWarung };
    if (name === "@/services/world/client")
      return {
        worldRequest: async (...args) => {
          requests.push(args);
          if (fail) throw new Error("Kas tidak cukup");
          return { kas: { cash: 6500 } };
        },
      };
    if (name === "./bus-ride")
      return {
        useBusRide: simulate ? ride.useBusRide : create(() => ({ riding: false })),
        startBusRide: async (trip) => {
          trips.push(trip);
          return simulate ? ride.startBusRide(trip) : trip.arrive();
        },
      };
    throw new Error(name);
  }, exports);
  return {
    ...exports,
    useGame,
    useGang,
    useWarung,
    requests,
    trips,
    ride,
    depart: () => {
      available = false;
    },
  };
}

test("paying at a newly arrived bus starts movement without waiting out its 20-second ticket window", async () => {
  for (const from of ["kota", "kampung"]) {
    const s = setup(from, false, true);
    s.openBusMenu(from);
    const paid = s.rideBus("pasar");
    await Promise.resolve();
    assert.equal(s.ride.useBusRide.getState().riding, true);
    const start = { ...s.ride.busPose };
    for (let i = 0; i < 420; i++) s.ride.tickBusRide(1 / 60);
    assert(Math.hypot(s.ride.busPose.x - start.x, s.ride.busPose.z - start.z) > 3);
    assert.equal(s.requests.length, 1, "fare is charged only once");
    s.ride.skipBusRide();
    for (let i = 0; i < 60; i++) {
      s.ride.tickBusRide(1 / 60);
      await Promise.resolve();
    }
    await paid;
  }
});
for (const to of ["kota", "gerbang", "pasar", "keliling"])
  test(`kampung chooser reaches ${to} and charges one boarding only`, async () => {
    const s = setup("kampung");
    s.openBusMenu("kampung");
    await s.rideBus(to);
    assert.equal(s.requests.length, 1);
    assert.deepEqual(s.requests[0], [
      "bus",
      {
        action: "ride",
        from: "kampung",
        to,
        requestId: "test-id",
        departureAt: 20000,
        boardingToken: "signed",
      },
    ]);
    assert.equal(s.trips.length, 1);
    assert.equal(s.useGang.getState().inside, to === "keliling" ? 1 : null);
    assert.deepEqual(
      s.useGame.getState().pendingTeleport,
      to === "keliling" ? routes.kampungBusStop([6000, 0, 3000]).board : routes.BUS_STOPS[to].board,
    );
    assert.equal(s.useWarung.getState().data.warung.cash, 6500);
  });
test("city tour includes all stops without recharging per stop", async () => {
  const s = setup("pasar");
  s.openBusMenu("pasar");
  await s.rideBus("keliling");
  assert.equal(s.requests.length, 1);
  assert.deepEqual(
    s.trips[0].legs.map((l) => l.stop.id),
    ["kota", "gerbang", "pasar"],
  );
});
test("failed payment keeps destination chooser open and never starts the bus", async () => {
  const s = setup("kota", true);
  s.openBusMenu("kota");
  await s.rideBus("pasar");
  assert.equal(s.trips.length, 0);
  assert.equal(s.useBusTravel.getState().from, "kota");
  assert.match(s.useBusTravel.getState().error, /Kas tidak cukup/);
  assert.equal(s.useWarung.getState().data.warung.cash, 10000);
});
test("leaving the halt or selecting the same halt never charges", async () => {
  const s = setup("kota");
  s.openBusMenu("kota");
  await s.rideBus("kota");
  s.useGame.setState({ playerPos: [100, 0.83, 100] });
  await s.rideBus("pasar");
  assert.equal(s.requests.length, 0);
  assert.equal(s.trips.length, 0);
});
test("skipping a city-to-kampung ride still enters the right scene", async () => {
  const s = setup("kota");
  s.openBusMenu("kota");
  await s.rideBus("gang");
  assert.equal(s.useGang.getState().inside, 1);
  assert.deepEqual(
    s.useGame.getState().pendingTeleport,
    routes.kampungBusStop([6000, 0, 3000]).board,
  );
});

test("a tour returns to the visited kampung rather than changing to the player's home gang", async () => {
  const s = setup("kampung");
  s.useGang.setState({ inside: 7 });
  s.openBusMenu("kampung");
  await s.rideBus("keliling");
  s.useGang.setState({ inside: null });
  const transfer = s.trips[0].legs.filter((leg) => leg.transfer).at(-1);
  await transfer.transfer();
  assert.equal(s.useGang.getState().inside, 7);
});

test("departure while destination chooser is open blocks payment and ride", async () => {
  const s = setup("kota");
  s.openBusMenu("kota");
  s.depart();
  await s.rideBus("pasar");
  assert.equal(s.requests.length, 0);
  assert.equal(s.trips.length, 0);
  assert.equal(s.useWarung.getState().data.warung.cash, 10000);
  assert.match(s.useBusTravel.getState().error, /sudah berangkat/);
});

test("kampung transfer exits one bridge and enters the city from the other, continuing south", async () => {
  const s = setup("kampung");
  s.openBusMenu("kampung");
  await s.rideBus("kota");
  const legs = s.trips[0].legs;
  assert.equal(legs[0].path.at(-1).z, 2840);
  assert.equal(legs[1].path[0].z, -200);
  assert.equal(legs[1].path.at(-1).z, -47);
  assert.deepEqual(legs[1].path.at(-1), legs[2].path[0]);
  assert(legs[2].path[1].z > -47, "continue toward the city, never reverse into the gate");
});
