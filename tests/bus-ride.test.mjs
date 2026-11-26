import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { create } from "zustand";
import * as motion from "../src/game/world/bus-motion.ts";
import { MARKET_HALTE, HALTE_JPO_ZONES } from "../src/game/world/halte-jpo.ts";
import { KIOSKS, EXTRA_STALLS } from "../src/game/pasar/model.ts";
import {
  vehiclesOverlap,
  vehicleGapAhead,
  vehicleSweepOverlaps,
} from "../src/game/traffic/traffic-math.ts";
import {
  BUS_STOPS,
  busDestinations,
  cityBusLegs,
  kampungBusStop,
} from "../src/game/world/bus-routes.ts";
import {
  ROADS,
  CROSSWALKS,
  rect,
  BUILDING_LOTS,
  contains,
  buildingBounds,
  intersects,
} from "../src/game/world/outdoor-layout.ts";

const compiled = ts.transpileModule(
  readFileSync(new URL("../src/game/world/bus-ride.ts", import.meta.url), "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  },
).outputText;
function runtime() {
  const exports = {};
  new Function("require", "exports", compiled)((name) => {
    if (name === "zustand") return { create };
    if (name === "./bus-motion") return motion;
    throw new Error(name);
  }, exports);
  return exports;
}
async function run(ride, max = 60000, inspect = () => {}) {
  for (let i = 0; i < max; i++) {
    ride.tickBusRide(1 / 60);
    inspect();
    await Promise.resolve();
    if (!ride.useBusRide.getState().riding) return;
  }
  assert.fail("ride must finish");
}

test("city circuit visits every halt once and returns to each possible origin", () => {
  for (const from of Object.keys(BUS_STOPS)) {
    const legs = cityBusLegs(from, "keliling");
    assert.equal(legs.length, 3);
    assert.equal(new Set(legs.map((leg) => leg.stop.id)).size, 3);
    assert.equal(legs.at(-1).stop.id, from);
    for (let i = 1; i < legs.length; i++)
      assert.deepEqual(legs[i].path[0], legs[i - 1].path.at(-1));
  }
  assert.deepEqual(
    busDestinations("kampung").map((d) => d.id),
    // "gang" from a kampung = another kampung, picked by number.
    ["kota", "gerbang", "pasar", "gang", "keliling"],
  );
});

test("full bus footprint stays on the road through all city bends and the turnaround is clear", () => {
  for (const leg of cityBusLegs("kota", "keliling")) {
    const length = motion.pathLength(leg.path);
    let previous = motion.sampleRide(leg.path, 0);
    for (let d = 0; d <= length; d += 0.25) {
      const p = motion.sampleRide(leg.path, d);
      assert(Math.abs(motion.angleDelta(previous.yaw, p.yaw)) < 0.22, "no heading snap");
      for (const along of [-5.4, 0, 5.4])
        for (const side of [-1.2, 1.2]) {
          const q = {
            x: p.x + Math.sin(p.yaw) * along + Math.cos(p.yaw) * side,
            z: p.z + Math.cos(p.yaw) * along - Math.sin(p.yaw) * side,
          };
          assert(
            ROADS.some((road) => contains(road, q, -0.08)),
            `${leg.stop.id} at ${d}: ${JSON.stringify(q)}`,
          );
        }
      previous = p;
    }
  }
  const bay = ROADS.find((r) => r.id === "bus-turnaround");
  assert(!BUILDING_LOTS.some((lot) => intersects(buildingBounds(lot), bay)));
});

test("the full westbound bus leaves the zebra clear while boarding at Toko Cung", () => {
  const { x, z } = BUS_STOPS.kota.pose;
  const parked = rect(x, z, 11, 2.5);
  assert(!CROSSWALKS.some((cross) => intersects(parked, cross)));
});

test("kampung departure follows its lane straight over the bridge", () => {
  const stop = kampungBusStop([6000, 0, 3000]);
  const path = [stop.pose, { x: stop.pose.x, z: stop.pose.z - 30 }];
  for (let d = 0; d <= 30; d++) {
    const p = motion.sampleRide(path, d);
    assert.equal(p.x, 5998.4);
    assert(Math.abs(motion.angleDelta(p.yaw, Math.PI)) < 0.00001);
    assert(p.x - 1.25 >= 5996.8 && p.x + 1.25 <= 6003.2);
  }
});

test("market shelter, waiting area and boarding point clear every stall, crates and roads", () => {
  const zone = HALTE_JPO_ZONES[0];
  const stalls = [...KIOSKS.map((k) => ({ x: k.table[0], z: k.table[1] })), ...EXTRA_STALLS];
  for (const stall of stalls) {
    const bounds = {
      minX: stall.x - 2.4,
      maxX: stall.x + 2.4,
      minZ: stall.z - 1.5,
      maxZ: stall.z + 1.5,
    };
    assert(
      !intersects(zone, bounds),
      `shelter/waiting area overlaps stall at ${stall.x},${stall.z}`,
    );
    assert(!contains(bounds, { x: BUS_STOPS.pasar.board[0], z: BUS_STOPS.pasar.board[2] }, 0.5));
  }
  assert(!ROADS.some((road) => intersects(zone, road)), "shelter stays off the roadway");
  assert.equal(MARKET_HALTE.x, BUS_STOPS.pasar.board[0]);
});

test("bus brakes for a parked/crossing vehicle, waits without opening doors, and resumes when clear", async () => {
  for (const compact of [false, true]) {
    const ride = runtime();
    const length = compact ? 4 : 5.5;
    const obstacle = { x: 0, z: 25, dx: 1, dz: 0, speed: 0, halfWidth: 1, halfLength: 4 };
    const result = ride.startBusRide({
      title: "Collision",
      legs: [
        {
          compact,
          path: [
            { x: 0, z: 0 },
            { x: 0, z: 50 },
          ],
        },
      ],
      arrive: async () => true,
    });
    let maxDecel = 0;
    for (let frame = 0; frame < 1500; frame++) {
      const before = ride.busPose.speed;
      ride.tickBusRide(1 / 60, (p) =>
        vehiclesOverlap(
          {
            ...p,
            dx: Math.sin(p.yaw),
            dz: Math.cos(p.yaw),
            speed: 0,
            halfWidth: 1.25,
            halfLength: length,
          },
          obstacle,
          0.15,
        ),
      );
      maxDecel = Math.max(maxDecel, before - ride.busPose.speed);
      assert(ride.busPose.z + length < 24, "bus never crosses into the vehicle");
    }
    assert.equal(ride.busPose.speed, 0);
    assert.equal(ride.busPose.door, 0);
    assert.equal(ride.useBusRide.getState().phase, "driving");
    assert(ride.busPose.z > 17, "approaches the obstacle before stopping");
    assert(maxDecel < 0.1, "normal braking stays smooth");
    await run(ride);
    assert.equal(await result, true);
  }
});

test("long buses block vehicles at the tail, at a crossing and across a network catch-up step", () => {
  const bus = { x: 0, z: 0, dx: 0, dz: 1, speed: 0, halfWidth: 1.25, halfLength: 5.5 };
  const car = { x: 0, z: -9, dx: 0, dz: 1, speed: 6, halfWidth: 0.9, halfLength: 2.1 };
  assert(Math.abs(vehicleGapAhead(car, bus) - 1.4) < 1e-8);
  assert(vehiclesOverlap({ ...car, z: -7 }, bus));
  assert(
    vehicleSweepOverlaps(car, { ...car, z: 12 }, bus),
    "cannot jump through a bus between frames",
  );
  assert(
    vehicleSweepOverlaps(
      { ...car, x: -8, z: 4, dx: 1, dz: 0 },
      { ...car, x: 8, z: 4, dx: 1, dz: 0 },
      bus,
    ),
  );
  assert(
    !vehicleSweepOverlaps({ ...car, x: 3.5 }, { ...car, x: 3.5, z: 12 }, bus),
    "adjacent lane remains usable",
  );
});

test("traffic cannot sweep through the solid thief, and removal releases the route", async () => {
  const math = await import("../src/game/traffic/traffic-math.ts");
  const source = readFileSync(
    new URL("../src/game/traffic/traffic-runtime.ts", import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", output)((name) => {
    if (name === "./traffic-math") return math;
    if (name.endsWith("bus-collision")) return { BUS_TRAFFIC_ID: "transjakarta-ride" };
    if (name.endsWith("game-store") || name.endsWith("world-acoustics") || name.endsWith("/sfx"))
      return {};
    throw new Error(name);
  }, exports);
  const from = { x: 0, z: 0, dx: 0, dz: 1, speed: 6, halfLength: 4, halfWidth: 1.2 };
  const to = { ...from, z: 25 };
  exports.trafficActors.set("thief", {
    solid: true,
    position: () => ({ x: 0, z: 12 }),
    hit: () => false,
  });
  assert.equal(
    exports.solidTrafficBlocked(from, to),
    true,
    "also catches a long remote catch-up step",
  );
  assert.equal(exports.solidTrafficBlocked({ ...from, x: 4 }, { ...to, x: 4 }), false);
  exports.trafficActors.delete("thief");
  assert.equal(exports.solidTrafficBlocked(from, to), false);
});

test("occupied departure waits before boarding and still allows skip", async () => {
  const ride = runtime();
  const result = ride.startBusRide({
    title: "Occupied stop",
    from: BUS_STOPS.kota,
    legs: cityBusLegs("kota", "gerbang"),
    arrive: async () => true,
  });
  for (let i = 0; i < 300; i++) ride.tickBusRide(1 / 60, () => true);
  assert.equal(ride.useBusRide.getState().ready, false);
  assert.equal(ride.busPose.door, 0);
  assert.equal(ride.busPose.stopElapsed, 0);
  ride.skipBusRide();
  for (let i = 0; i < 60; i++) {
    ride.tickBusRide(1 / 60, () => true);
    await Promise.resolve();
  }
  assert.equal(await result, true);
});

test("bus accelerates, slows for bends, fully stops, boards NPCs, and clears its final fade", async () => {
  const ride = runtime();
  const legs = cityBusLegs("kota", "gerbang");
  let arrived = 0,
    sawDoors = false,
    sawDrive = false;
  const result = ride.startBusRide({
    from: BUS_STOPS.kota,
    title: "Test",
    legs,
    arrive: async () => {
      arrived++;
      return true;
    },
  });
  let previousSpeed = 0;
  await run(ride, 20000, () => {
    const s = ride.useBusRide.getState();
    assert(ride.busPose.speed <= 7.001);
    assert(ride.busPose.speed - previousSpeed <= 1.8 / 60 + 0.00001);
    previousSpeed = ride.busPose.speed;
    if (s.phase === "boarding") {
      assert.equal(ride.busPose.speed, 0);
      sawDoors ||= ride.busPose.door > 0.5;
    }
    if (ride.busPose.speed > 3) sawDrive = true;
  });
  assert.equal(await result, true);
  assert.equal(arrived, 1);
  assert(sawDoors && sawDrive);
  assert(ride.useBusRide.getState().queues.every((q) => q.boarded));
  for (let i = 0; i < 35; i++) ride.tickBusRide(1 / 60);
  assert.equal(ride.useBusRide.getState().fade, 0);
});

test("boarding takes at most five seconds, finishes NPC boarding, and gains speed promptly", async () => {
  for (const fps of [30, 60]) {
    for (const count of [0, 1, 3]) {
      const ride = runtime();
      const random = Math.random;
      let result;
      try {
        Math.random = () => (count + 0.1) / 4;
        result = ride.startBusRide({
          from: BUS_STOPS.kota,
          title: "Prompt departure",
          legs: cityBusLegs("kota", "gerbang"),
          arrive: async () => true,
        });
      } finally {
        Math.random = random;
      }
      const start = { ...ride.busPose };
      let stoppedFor = 0,
        maxStop = 0;
      for (let frame = 0; ride.useBusRide.getState().riding && frame < fps * 90; frame++) {
        const before = ride.useBusRide.getState();
        ride.tickBusRide(1 / fps);
        const after = ride.useBusRide.getState();
        if (before.phase === "boarding") {
          stoppedFor += 1 / fps;
          maxStop = Math.max(maxStop, stoppedFor);
          assert(after.departureIn <= before.departureIn, "countdown never restarts");
          if (after.phase !== "boarding") {
            assert.equal(ride.busPose.door, 0);
            assert(
              ride.busPose.stopElapsed >= 0.6 + count * 1.2,
              "last NPC reaches the door before leaving",
            );
          }
        } else stoppedFor = 0;
        if (frame === fps * 7)
          assert(
            Math.hypot(ride.busPose.x - start.x, ride.busPose.z - start.z) > 3,
            "already moving visibly within seven seconds",
          );
        await Promise.resolve();
      }
      assert(maxStop < 5, `longest stop: ${maxStop}s at ${fps}fps with ${count} NPCs`);
      assert.equal(ride.useBusRide.getState().riding, false);
      assert.equal(await result, true);
      assert.equal(ride.useBusRide.getState().boarded, count * 2);
    }
  }
});

test("scene transfer happens once, and skip goes directly to the chosen destination", async () => {
  for (const skip of [false, true]) {
    const ride = runtime();
    let transfers = 0,
      arrivals = 0;
    const result = ride.startBusRide({
      title: "Transfer",
      legs: [
        {
          path: [
            { x: 0, z: 0 },
            { x: 0, z: 8 },
          ],
          transfer: async () => {
            transfers++;
            return true;
          },
        },
        {
          path: [
            { x: 6000, z: 3000 },
            { x: 6000, z: 2992 },
          ],
        },
      ],
      arrive: async () => {
        arrivals++;
        return true;
      },
    });
    if (skip) ride.skipBusRide();
    await run(ride, 4000);
    assert.equal(await result, true);
    assert.equal(transfers, skip ? 0 : 1);
    assert.equal(arrivals, 1);
  }
});

test("a second start cannot replace a running paid trip, and a failed transfer exits cleanly", async () => {
  const ride = runtime();
  const job = {
    title: "Paid",
    legs: [
      {
        path: [
          { x: 0, z: 0 },
          { x: 0, z: 2 },
        ],
        transfer: async () => false,
      },
    ],
    arrive: async () => {
      assert.fail("must not arrive after failed transfer");
    },
  };
  const first = ride.startBusRide(job);
  assert.equal(await ride.startBusRide(job), false);
  await run(ride, 3000);
  assert.equal(await first, false);
  assert.equal(ride.busPose.speed, 0);
});
