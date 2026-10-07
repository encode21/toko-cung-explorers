import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Compile pure metadata modules recursively in memory, without build artifacts.
async function moduleUrl(url) {
  const source = await readFile(url, "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  for (const match of [...outputText.matchAll(/from ["'](\.[^"']+)["']/g)]) {
    const dependency = await moduleUrl(new URL(`${match[1]}.ts`, url));
    outputText = outputText.replace(match[0], `from "${dependency}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}
async function plan(path) {
  return import(await moduleUrl(new URL(path, import.meta.url)));
}
const { FLOORS, LIFT, WORLD_POINTS, FUTURE_TRIGGERS } = await plan(
  "../src/game/world/building/plan.ts",
);
const { validateLots, BUILDING_LOTS, ROADS, contains } = await plan(
  "../src/game/world/outdoor-layout.ts",
);
const { NPC_CONFIG, WORKER_IDS, populationForQuality } = await plan(
  "../src/game/npc/population.ts",
);
assert.equal(populationForQuality(true).length + WORKER_IDS.length, 14);
const { CROSSWALKS, DRIVEWAYS } = await plan("../src/game/world/outdoor-layout.ts");
const { ZONES } = await plan("../src/game/world/zones.ts");
assert.equal(NPC_CONFIG.length + WORKER_IDS.length, 20);
assert.deepEqual(
  ZONES.map((zone) => zone.id).sort(),
  ["entrance", "retail", "cashier", "promo", "warehouse", "loading", "sidewalk", "parking"].sort(),
);
for (const npc of NPC_CONFIG) {
  const a = npc.points[0],
    b = npc.points.at(-1);
  for (let t = 0; t <= 1; t += 0.05) {
    const x = a[0] + t * (b[0] - a[0]);
    const z = a[2] + t * (b[2] - a[2]);
    assert.ok(
      !ROADS.some((road) => contains(road, { x, z })) ||
        (npc.profile === "crossing-pedestrian" && CROSSWALKS.some((c) => contains(c, { x, z }))),
      "Ambient routes must stay on sidewalks or the assigned crossing",
    );
    assert.ok(!(Math.abs(x) < 1.7 && z > 2 && z < 7), "Patrol must leave entrance clear");
  }
}
assert.deepEqual(
  validateLots(),
  [],
  "Landmark must preserve reserved streets and pedestrian space",
);
assert.equal(FLOORS.length, 3);
for (let i = 1; i < FLOORS.length; i++) {
  assert.ok(FLOORS[i].base >= FLOORS[i - 1].base + FLOORS[i - 1].height);
  assert.equal(FLOORS[i].access, "future");
}
assert.ok(
  BUILDING_LOTS.find((lot) => lot.id === "toko-cung").height >= FLOORS[2].base + FLOORS[2].height,
);
assert.equal(new Set(WORLD_POINTS.map((point) => point.id)).size, WORLD_POINTS.length);
for (const point of [
  ...WORLD_POINTS,
  ...NPC_CONFIG.flatMap((npc) => npc.points.map((position) => ({ position }))),
]) {
  const [x, y, z] = point.position;
  assert.equal(y, 0, "Active anchors must remain on the playable ground floor");
  assert.ok(!ROADS.some((road) => contains(road, { x, z })), "Anchors must not spawn in traffic");
}
const liftPoint = WORLD_POINTS.find((point) => point.id === "service-lift");
assert.ok(liftPoint.position[2] > LIFT[2] + 1, "Lift action must be in front of its collider");
for (const trigger of FUTURE_TRIGGERS) {
  assert.equal(trigger.enabled, false);
  const floor = FLOORS.find((f) => f.level === trigger.floor);
  assert.ok(trigger.center[1] - trigger.size[1] / 2 >= floor.base);
  assert.ok(trigger.center[1] + trigger.size[1] / 2 <= floor.base + floor.height);
}
console.log(
  "World plan passed: three floors, reserved lots, safe anchors, lift access and future volumes.",
);

const { createBehavior, conversationStep, pauseDuration, turnToward } = await plan(
  "../src/game/npc/behavior.ts",
);
const brain = createBehavior(31);
brain.state = "WALK";
brain.target = 1;
for (let i = 0; i < 120; i++) assert.equal(conversationStep(brain, true, 1 / 60), true);
assert.equal(brain.state, "TALK");
assert.equal(brain.target, 1);
assert.equal(conversationStep(brain, false, 0), true);
assert.equal(brain.state, "RETURN");
for (let i = 0; i < 80; i++) assert.equal(conversationStep(brain, false, 1 / 60), true);
assert.equal(brain.state, "RETURN");
for (let i = 0; i < 12; i++) conversationStep(brain, false, 1 / 60);
assert.equal(brain.state, "WALK");
assert.equal(brain.target, 1);
const timingA = createBehavior(7),
  timingB = createBehavior(7);
for (let i = 0; i < 20; i++) {
  const a = pauseDuration(timingA);
  assert.equal(a, pauseDuration(timingB));
  assert.ok(a >= 2 && a < 8);
}
assert.ok(
  turnToward(Math.PI - 0.01, -Math.PI + 0.01, 0.1) > Math.PI - 0.01,
  "Turn takes the short arc",
);
const { ACTIVITY_PROPS, PROP_SIZES } = await plan("../src/game/world/props/activity-props.ts");
for (const npc of NPC_CONFIG) {
  for (let i = 0; i < npc.points.length - 1; i++) {
    for (let t = 0; t <= 1; t += 0.05) {
      const x = npc.points[i][0] + t * (npc.points[i + 1][0] - npc.points[i][0]);
      const z = npc.points[i][2] + t * (npc.points[i + 1][2] - npc.points[i][2]);
      for (const prop of ACTIVITY_PROPS.filter((p) => p.position[1] === 0)) {
        const size = PROP_SIZES[prop.kind];
        assert.ok(
          Math.abs(prop.position[0] - x) > size[0] / 2 + 0.35 ||
            Math.abs(prop.position[2] - z) > size[2] / 2 + 0.35,
          `${npc.id} must clear ${prop.id}`,
        );
      }
    }
  }
}
console.log(
  "Ambient checks passed: bounded props/routes, seeded pauses, conversation freeze and delayed resume.",
);

const { STAGED_VEHICLES, VEHICLE_SIZE, vehicleParts } = await plan(
  "../src/game/assets/vehicles.ts",
);
assert.deepEqual([...new Set(STAGED_VEHICLES.map((v) => v.kind))].sort(), [
  "car",
  "motorcycle",
  "pickup",
  "truck",
  "van",
]);
assert.equal(STAGED_VEHICLES.filter((v) => v.kind === "motorcycle").length, 2);
for (const vehicle of STAGED_VEHICLES) {
  const size = VEHICLE_SIZE[vehicle.kind];
  assert.ok(
    vehicleParts(vehicle.kind, vehicle.color).every((part) =>
      part.s.every((n) => Number.isFinite(n) && n > 0),
    ),
  );
  assert.ok(
    !ROADS.some(
      (road) =>
        vehicle.p[0] + size[0] / 2 > road.minX &&
        vehicle.p[0] - size[0] / 2 < road.maxX &&
        vehicle.p[2] + size[2] / 2 > road.minZ &&
        vehicle.p[2] - size[2] / 2 < road.maxZ,
    ),
    "Staged vehicles must stay outside roads",
  );
  for (const npc of NPC_CONFIG)
    for (let t = 0; t <= 1; t += 0.05) {
      const a = npc.points[0],
        b = npc.points.at(-1),
        x = a[0] + t * (b[0] - a[0]),
        z = a[2] + t * (b[2] - a[2]);
      assert.ok(
        Math.abs(vehicle.p[0] - x) > size[0] / 2 + 0.35 ||
          Math.abs(vehicle.p[2] - z) > size[2] / 2 + 0.35,
        `${vehicle.id} must clear ${npc.id}`,
      );
    }
  // Existing pedestrian approach from the side service path to the rear doorway.
  if (vehicle.p[2] < -22 && vehicle.p[0] > 0) assert.ok(vehicle.p[2] + size[2] / 2 + 0.38 < -23.8);
}
for (let i = 0; i < STAGED_VEHICLES.length; i++)
  for (let j = i + 1; j < STAGED_VEHICLES.length; j++) {
    const a = STAGED_VEHICLES[i],
      b = STAGED_VEHICLES[j],
      sa = VEHICLE_SIZE[a.kind],
      sb = VEHICLE_SIZE[b.kind];
    assert.ok(
      Math.abs(a.p[0] - b.p[0]) >= (sa[0] + sb[0]) / 2 ||
        Math.abs(a.p[2] - b.p[2]) >= (sa[2] + sb[2]) / 2,
      "Staged vehicles must not intersect",
    );
  }
console.log(
  "Asset checks passed: five vehicle types, parking separation, road and NPC clearances.",
);

const { AMBIENT_PROFILES, crossingGap } = await plan("../src/game/npc/ambient-profiles.ts");
for (const [low, count] of [
  [false, 8],
  [true, 6],
]) {
  const population = populationForQuality(low);
  assert.equal(population.filter((n) => n.role === "warga").length, count);
  assert.equal(new Set(population.map((n) => n.id)).size, population.length);
}
assert.deepEqual(
  [...new Set(NPC_CONFIG.map((n) => n.profile).filter(Boolean))].sort(),
  Object.keys(AMBIENT_PROFILES).sort(),
);
for (const npc of NPC_CONFIG.filter((n) => n.role === "warga")) {
  const a = npc.points[0],
    b = npc.points.at(-1);
  for (let t = 0; t <= 1; t += 0.02) {
    const p = { x: a[0] + (b[0] - a[0]) * t, z: a[2] + (b[2] - a[2]) * t };
    assert.ok(!DRIVEWAYS.some((d) => contains(d, p, -0.34)), npc.id + " blocks driveway/loading");
  }
}
const crossing = NPC_CONFIG.find((n) => n.profile === "crossing-pedestrian");
for (const p of crossing.points)
  assert.ok(
    !ROADS.some((r) => contains(r, { x: p[0], z: p[2] }, -0.5)),
    "Crossing waits must be off-road",
  );
assert.equal(crossingGap(-23.6, 8, [{ x: -40, z: 18.4, dx: 1, dz: 0, speed: 6 }]), false);
assert.equal(crossingGap(-23.6, 8, [{ x: -20, z: 21.6, dx: -1, dz: 0, speed: 0 }]), false);
assert.equal(crossingGap(-23.6, 8, [{ x: 40, z: 18.4, dx: 1, dz: 0, speed: 6 }]), true);
console.log(
  "Population: desktop 20 / mobile 14; residents 8 / 6; six profiles and access clearance passed.",
);
