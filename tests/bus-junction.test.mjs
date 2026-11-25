import test from "node:test";
import assert from "node:assert/strict";
import { createJunctionAdmission } from "../src/game/traffic/junctions.ts";
import {
  vehiclesOverlap,
  vehicleGapAhead,
  vehicleSweepOverlaps,
} from "../src/game/traffic/traffic-math.ts";
import { advanceBus, pathLength, sampleRide } from "../src/game/world/bus-motion.ts";
import { cityBusLegs } from "../src/game/world/bus-routes.ts";
import { INTERSECTIONS } from "../src/game/world/outdoor-layout.ts";
const pose = (p, speed, length) => ({
  ...p,
  dx: Math.sin(p.yaw),
  dz: Math.cos(p.yaw),
  speed,
  halfLength: length,
  halfWidth: length > 4 ? 1.25 : 0.92,
});
test("a player's vehicle releases the junction after reversing or turning away from the bus", () => {
  const point = INTERSECTIONS[0];
  for (const away of [
    { x: point.x, z: point.z - 30 },
    { x: point.x + 30, z: point.z },
  ]) {
    const junction = createJunctionAdmission();
    const bus = pose({ x: point.x - 16, z: point.z, yaw: Math.PI / 2 }, 0, 5.5);
    const car = pose({ ...point, yaw: 0 }, 0, 2.05);
    const vehicles = new Map([
      ["bus", bus],
      ["ride-player", car],
    ]);
    assert(
      Number.isFinite(junction.clearance("bus", bus, vehicles)),
      "bus waits while the car occupies the junction",
    );
    vehicles.set("ride-player", { ...car, ...away });
    assert.equal(
      junction.clearance("bus", bus, vehicles),
      Infinity,
      "a departed car cannot keep the bus waiting",
    );
  }
});
test("traffic waits outside the bus turnaround and continues after the bus clears it", () => {
  const junction = createJunctionAdmission();
  const bus = pose({ x: -41, z: -55, yaw: Math.PI / 2 }, 2, 5.5);
  const car = pose({ x: -31.6, z: -16, yaw: Math.PI }, 4, 2.05);
  const vehicles = new Map([
    ["bus", bus],
    ["car", car],
  ]);
  assert(
    Number.isFinite(junction.clearance("car", car, vehicles)),
    "incoming traffic must not trap the turning bus",
  );
  vehicles.set("bus", pose({ x: -28.4, z: -10, yaw: 0 }, 3, 5.5));
  assert.equal(junction.clearance("car", car, vehicles), Infinity);
});

test("bus and approaching NPCs clear the turn in both arrival orders without overlap or deadlock", () => {
  for (const headStart of [0, 8, 20]) {
    const junction = createJunctionAdmission();
    const busPath = cityBusLegs("kota", "keliling")
      .slice(0, 2)
      .flatMap((leg) => leg.path);
    const actors = [
      { id: "bus", path: busPath, length: 5.5, d: 0, speed: 0 },
      {
        id: "gate",
        path: [
          { x: -31.6, z: -15 },
          { x: -31.6, z: -100 },
        ],
        length: 2.75,
        d: headStart,
        speed: 3,
      },
      {
        id: "south",
        path: [
          { x: -28.4, z: -15 },
          { x: -28.4, z: 60 },
        ],
        length: 2.05,
        d: headStart,
        speed: 3,
      },
      {
        id: "west",
        path: [
          { x: -68, z: 17.2 },
          { x: 12, z: 17.2 },
        ],
        length: 2.05,
        d: headStart,
        speed: 3,
      },
      {
        id: "behind",
        path: [
          { x: 17, z: 22.8 },
          { x: -75, z: 22.8 },
        ],
        length: 2.05,
        d: 0,
        speed: 3,
      },
    ];
    const vehicles = new Map();
    for (const a of actors) vehicles.set(a.id, pose(sampleRide(a.path, a.d), a.speed, a.length));
    for (let frame = 0; frame < 60 * 140; frame++) {
      for (const a of actors) {
        if (!vehicles.has(a.id)) continue;
        const before = vehicles.get(a.id),
          gap = junction.clearance(a.id, before, vehicles),
          total = pathLength(a.path);
        if (a.id === "bus") {
          const next = advanceBus(
            a.path,
            a.d,
            total,
            a.speed,
            1 / 60,
            (p) =>
              Math.hypot(p.x - before.x, p.z - before.z) >= gap ||
              [...vehicles].some(
                ([id, v]) => id !== a.id && vehiclesOverlap(pose(p, 0, a.length), v, 0.15),
              ),
          );
          a.d = next.distance;
          a.speed = next.speed;
        } else {
          let target = Math.min(3.5, Math.sqrt(12 * Math.max(0, gap - 0.5)));
          for (const [id, v] of vehicles)
            if (id !== a.id)
              target = Math.min(
                target,
                Math.sqrt(12 * Math.max(0, vehicleGapAhead(before, v) - 0.8)),
              );
          a.speed += Math.max(-6 / 60, Math.min(2 / 60, target - a.speed));
          const d = Math.min(total, a.d + a.speed / 60),
            p = pose(sampleRide(a.path, d), a.speed, a.length);
          if ([...vehicles].some(([id, v]) => id !== a.id && vehicleSweepOverlaps(before, p, v)))
            a.speed = 0;
          else a.d = d;
        }
        const after = pose(sampleRide(a.path, a.d), a.speed, a.length);
        for (const [id, v] of vehicles)
          if (id !== a.id) assert(!vehiclesOverlap(after, v), `${a.id} overlaps ${id}`);
        if (total - a.d < 0.03) vehicles.delete(a.id);
        else vehicles.set(a.id, after);
      }
      if (!vehicles.size) break;
    }
    assert.equal(vehicles.size, 0, `traffic must clear: ${JSON.stringify([...vehicles])}`);
  }
});
