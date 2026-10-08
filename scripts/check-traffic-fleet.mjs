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
      `from "${await moduleUrl(new URL(`${match[1]}.ts`, url))}"`,
    );
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}
const load = async (path) => import(await moduleUrl(new URL(path, import.meta.url)));
const { AMBIENT_FLEET, VEHICLE_IDS } = await load("../src/game/traffic/fleet.ts");
const { trafficWindow } = await load("../src/game/traffic/traffic-window.ts");
const { TRAFFIC_LANES, pathLength, samplePath } = await load("../src/game/world/outdoor-layout.ts");
const { validRoadPose } = await load("../src/game/traffic/route-safety.ts");
const { vehicleOverlaps } = await load("../src/game/traffic/traffic-math.ts");
assert.equal(new Set(VEHICLE_IDS).size, 33);
assert.equal(AMBIENT_FLEET.filter((v) => v.kind === "car").length, 21);
assert.equal(AMBIENT_FLEET.filter((v) => v.kind === "motorcycle").length, 11);
for (const lane of TRAFFIC_LANES) {
  const window = trafficWindow(lane);
  assert.ok(window.start >= 90);
  assert.ok(window.end < pathLength(lane.points) - 90);
  assert.ok(window.end > window.start + 300);
  for (const d of [window.start, window.end]) {
    const pose = { ...samplePath(lane.points, d), speed: 0 };
    assert.ok(validRoadPose(pose, true));
    assert.ok(Math.max(Math.abs(pose.x), Math.abs(pose.z)) >= 178);
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
