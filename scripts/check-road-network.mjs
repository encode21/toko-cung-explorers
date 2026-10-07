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
const layout = await plan("../src/game/world/outdoor-layout.ts");
const { surfaceContours, onSurface } = await plan("../src/game/world/road-geometry.ts");
const {
  ROADS,
  DRIVEWAYS,
  PARKING,
  INTERSECTIONS,
  ROAD_NODES,
  ROAD_EDGES,
  TRAFFIC_LANES,
  DELIVERY_IN,
  DELIVERY_OUT,
  pathLength,
  samplePath,
} = layout;
const surface = surfaceContours([...ROADS, ...DRIVEWAYS, ...PARKING]);
assert.deepEqual(layout.validateLots(), []);
for (const node of INTERSECTIONS) {
  for (const dx of [-2.5, 0, 2.5])
    for (const dz of [-2.5, 0, 2.5])
      assert.ok(
        onSurface({ x: node.x + dx, z: node.z + dz }, surface),
        "Missing intersection quadrant",
      );
}
const seen = new Set(["west"]);
let changed = true;
while (changed) {
  changed = false;
  for (const [a, b] of ROAD_EDGES) {
    if (seen.has(a) && !seen.has(b)) {
      seen.add(b);
      changed = true;
    }
    if (seen.has(b) && !seen.has(a)) {
      seen.add(a);
      changed = true;
    }
  }
}
assert.equal(seen.size, Object.keys(ROAD_NODES).length, "Disconnected road graph");
for (const lane of [...TRAFFIC_LANES, DELIVERY_IN, DELIVERY_OUT]) {
  const total = pathLength(lane.points);
  let prev;
  for (let d = 0; d <= total; d += 0.1) {
    const p = samplePath(lane.points, d);
    assert.ok(Number.isFinite(p.dx) && Number.isFinite(p.dz), lane.id + " invalid tangent");
    assert.ok(onSurface(p, surface), lane.id + " leaves road at " + JSON.stringify(p));
    for (const along of [-2.2, 2.2])
      for (const side of [-1, 1]) {
        const corner = { x: p.x + p.dx * along - p.dz * side, z: p.z + p.dz * along + p.dx * side };
        assert.ok(
          onSurface(corner, surface),
          lane.id + " vehicle clips curb at " + JSON.stringify(corner),
        );
      }
    if (prev) assert.ok(prev.dx * p.dx + prev.dz * p.dz > 0.97, lane.id + " snaps heading");
    prev = p;
  }
  console.log(lane.id, total.toFixed(1), "meters: swept body and heading passed");
}
console.log(
  "Road network: junction surfaces, connected graph, lot clearance and all routes passed.",
);

const { validRoadPose, clearanceAt, stalled } = await plan("../src/game/traffic/route-safety.ts");
const { smoothVehicleYaw } = await plan("../src/game/traffic/traffic-math.ts");
for (const lane of TRAFFIC_LANES) {
  const start = { ...samplePath(lane.points, 0), speed: 0 };
  assert.ok(validRoadPose(start, true));
  assert.ok(!clearanceAt(start, [start], []), "Occupied spawns must wait");
  assert.ok(!clearanceAt(start, [], [start]), "Pedestrian spawns must wait");
}
assert.ok(!validRoadPose({ x: 22, z: 20, dx: 1, dz: 0, speed: 0 }, true), "No intersection spawns");
assert.ok(!validRoadPose({ x: 0, z: 0, dx: 1, dz: 0, speed: 0 }, true), "No sidewalk/store spawns");
const watch = { x: 0, z: 0, seconds: 0 };
for (let i = 0; i < 239; i++) assert.equal(stalled(watch, { x: 0, z: 0 }, true, 1 / 60), false);
for (let i = 0; i < 3; i++) stalled(watch, { x: 0, z: 0 }, true, 1 / 60);
assert.ok(watch.seconds >= 4);
assert.equal(
  stalled(watch, { x: 0, z: 0 }, false, 1 / 60),
  false,
  "Pedestrian/loading holds do not recover",
);
assert.equal(stalled(watch, { x: 1, z: 0 }, true, 1 / 60), false, "Movement resets watchdog");
assert.ok(
  Math.abs(smoothVehicleYaw(Math.PI - 0.01, -Math.PI + 0.01, 1 / 60) - Math.PI) < 0.02,
  "Shortest yaw wrap",
);
console.log("Spawn clearance, four-second watchdog, intentional waits and heading wrap passed.");
