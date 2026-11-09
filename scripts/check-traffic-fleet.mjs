import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
async function moduleUrl(url) {
  const source = await readFile(url, "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  for (const match of [...outputText.matchAll(/from ["'](\.[^"']+)["']/g)])
    outputText = outputText.replace(
      match[0],
      `from "${await moduleUrl(new URL(match[1].endsWith(".ts") ? match[1] : `${match[1]}.ts`, url))}"`,
    );
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}
const load = async (path) => import(await moduleUrl(new URL(path, import.meta.url)));
const { AMBIENT_FLEET, VEHICLE_IDS } = await load("../src/game/traffic/fleet.ts");
const { trafficWindow } = await load("../src/game/traffic/traffic-window.ts");
const { TRAFFIC_LANES, pathLength, samplePath } = await load("../src/game/world/outdoor-layout.ts");
const { validRoadPose } = await load("../src/game/traffic/route-safety.ts");
const { vehicleOverlaps } = await load("../src/game/traffic/traffic-math.ts");
// Front-street density needs the full shared roster (FEAT-082: do not thin count for thermal).
assert.equal(AMBIENT_FLEET.length, 32);
assert.equal(new Set(VEHICLE_IDS).size, 33);
assert.equal(AMBIENT_FLEET.filter((v) => v.kind === "car").length, 21);
assert.equal(AMBIENT_FLEET.filter((v) => v.kind === "motorcycle").length, 11);
for (const kind of ["convertible", "bajaj", "jeepney"])
  assert(AMBIENT_FLEET.some(v => v.variant === kind), `${kind} is represented in automatic traffic`);
const { vehicleParts } = await load("../src/game/assets/vehicles.ts");
const { VEHICLE_DEFINITIONS } = await load("../src/game/vehicles/definitions.ts");
for (const [kind, definition] of Object.entries(VEHICLE_DEFINITIONS)) {
  assert(!vehicleParts(kind, "#fff").some(p => p.npc), "Parked/player vehicles have no duplicate driver");
  const npc = vehicleParts(kind, "#fff", true).filter(p => p.npc);
  assert(npc.length >= 20 && npc.every(p => p.detail), `${kind} has a complete near-detail NPC`);
  for (const grip of definition.seats[0].grips)
    assert(npc.some(p => p.shape === "sphere" && p.p.every((n,i) => n === grip[i])), `${kind}: hands reach controls`);
}
for (const lane of TRAFFIC_LANES) {
  const window = trafficWindow(lane);
  if (lane.id === "jalan-lingkar") {
    assert.equal(window.start, 0);
    assert.equal(window.end, pathLength(lane.points));
    assert.equal(AMBIENT_FLEET.filter((v) => v.lane === 3).length, 4);
    assert.deepEqual(lane.points[0], lane.points.at(-1));
    continue;
  }
  assert.ok(window.start >= 50);
  assert.ok(window.end < pathLength(lane.points) - 50);
  assert.ok(window.end > window.start + 300);
  for (const d of [window.start, window.end]) {
    const pose = { ...samplePath(lane.points, d), speed: 0 };
    assert.ok(validRoadPose(pose, true));
    assert.ok(Math.max(Math.abs(pose.x), Math.abs(pose.z)) >= 218);
  }
}
const pose = { x: 0, z: 0, dx: 0, dz: 1, speed: 3 };
assert.equal(vehicleOverlaps({ x: 1, z: 0 }, { ...pose, kind: "motorcycle" }), false);
assert.equal(vehicleOverlaps({ x: 1, z: 0 }, { ...pose, kind: "car" }), true);
console.log(
  "PASS 33 shared IDs, 21 cars/11 motorcycles, shortened road-safe remote windows and motorcycle footprint",
);
const { createJunctionAdmission } = await load("../src/game/traffic/junctions.ts");
const junction = createJunctionAdmission();
const east = { x: -43, z: 18.4, dx: 1, dz: 0, speed: 3 };
const west = { x: -17, z: 21.6, dx: -1, dz: 0, speed: 3 };
const vehicles = new Map([
  ["east", east],
  ["west", west],
]);
assert.equal(junction.hold("east", east, vehicles), false);
assert.equal(junction.hold("west", west, vehicles), true);
vehicles.set("east", { ...east, x: -12 });
assert.equal(junction.hold("west", west, vehicles), false);
junction.clear();
vehicles.set("resident", { ...east, x: -29 });
assert.equal(junction.hold("west", west, vehicles), true);
console.log("PASS conflicting approach queues, FIFO release and handoff resident clearance");
