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
const { audioZoneAt, footSurfaceAt, distanceGain, footTravel } = await load(
  "../src/game/audio/world-acoustics.ts",
);
for (const [x, z, zone, surface] of [
  [0, 20, "outdoor", "asphalt"],
  [0, 11.7, "outdoor", "concrete"],
  [0, 2, "retail", "tile"],
  [0, -6, "retail", "tile"],
  [5.6, 1.2, "cashier", "tile"],
  [0, -17.5, "warehouse", "warehouse"],
  [0, -26, "loading", "asphalt"],
  [12.8, 10.5, "loading", "asphalt"],
]) {
  assert.equal(audioZoneAt(x, z), zone);
  assert.equal(footSurfaceAt(x, z), surface);
}
assert.equal(distanceGain(24, 24), 0);
assert.equal(distanceGain(50, 24), 0);
assert.equal(distanceGain(0, 24), 1);
assert.ok(distanceGain(4, 24) > distanceGain(12, 24));
assert.equal(footTravel(0, 1 / 60, true), 0); // pressing against a wall
assert.equal(footTravel(0.1, 1 / 60, false), 0); // airborne/seated/locked
assert.equal(footTravel(10, 1 / 60, true), 0); // teleport
assert.equal(footTravel(0.1, 1, true), 0); // resumed tab
assert.equal(footTravel(0.05, 1 / 60, true), 0.05);
console.log(
  "PASS route zones, floor surfaces, distance attenuation, grounded displacement and teleport guards",
);
const { vehicleSound } = await load("../src/game/audio/vehicle-sound.ts");
for (const kind of ["car", "truck", "motorcycle"]) {
  const idle = vehicleSound(0, kind),
    creep = vehicleSound(0.2, kind),
    cruise = vehicleSound(6.5, kind);
  assert.equal(idle.tires, 0);
  assert.ok(idle.motor < creep.motor && creep.motor < cruise.motor);
  assert.ok(idle.pitch < creep.pitch && creep.pitch < cruise.pitch);
  assert.ok(cruise.motor < 0.12 / 3);
  assert.ok(vehicleSound(0.21, kind).motor - vehicleSound(0.19, kind).motor < 0.001);
  assert.deepEqual(vehicleSound(-10, kind), idle);
  assert.deepEqual(vehicleSound(NaN, kind), idle);
  assert.deepEqual(vehicleSound(100, kind), cruise);
}
console.log(
  "PASS quieter speed-driven motor/tire curves, silent stationary tires and smooth creeping transition",
);
