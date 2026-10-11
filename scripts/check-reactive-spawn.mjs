import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { Scene, PerspectiveCamera, Mesh, BoxGeometry, MeshBasicMaterial } from "three";
const source = await readFile(
  new URL("../src/game/reactive-world/npc-effects.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const code = outputText.replace('from "three"', `from "${import.meta.resolve("three")}"`);
const { hiddenSpawn, rushNpc, CUSTOMER_ENTRIES } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const scene = new Scene(),
  camera = new PerspectiveCamera(60, 1.5, 0.1, 200);
camera.position.set(0, 2, 10);
camera.lookAt(0, 1, 0);
camera.updateMatrixWorld();
assert.equal(hiddenSpawn(camera, [0, 0, 0], scene), false, "no popping into an unobstructed view");
assert.equal(hiddenSpawn(camera, [-30, 0, 0], scene), true, "offscreen sidewalk entrance");
const wall = new Mesh(new BoxGeometry(10, 8, 0.3), new MeshBasicMaterial());
wall.position.set(0, 2, 4);
scene.add(wall);
scene.updateMatrixWorld(true);
assert.equal(hiddenSpawn(camera, [0, 0, 0], scene), true, "opaque building hides the full body");
wall.material.transparent = true;
wall.material.opacity = 0.5;
assert.equal(hiddenSpawn(camera, [0, 0, 0], scene), false, "glass is not cover");
wall.material.transparent = false;
wall.material.opacity = 1;
wall.name = "AvatarV2Visual";
assert.equal(hiddenSpawn(camera, [0, 0, 0], scene), false, "avatars are not spawn cover");
wall.name = "wall";
wall.visible = false;
assert.equal(hiddenSpawn(camera, [0, 0, 0], scene), false, "hidden geometry is not cover");
for (const entry of CUSTOMER_ENTRIES) {
  const c = rushNpc("test", 0, false, entry);
  assert.ok(c.points.length >= 2);
  assert.deepEqual(c.points.at(-1), [18, 0, 13.3], "every route exits beyond the entrance view");
  for (const stop of c.workStops) assert.ok(stop >= 0 && stop < c.points.length);
  assert.ok(
    c.points.every((p) => p[2] < 16),
    "customers stay off the road",
  );
}
console.log(
  "PASS reactive spawn: visible/occluded/offscreen anchors, glass/avatar rejection, valid activity stops and sidewalk exits",
);
