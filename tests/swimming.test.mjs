import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as T from "three";
import { createExplorerRig } from "../src/game/avatar/explorer-rig.ts";
import { createAvatarSource } from "../src/game/avatar/avatar-source.ts";
import { createSwimClips } from "../src/game/avatar/swim-clips.ts";
import {
  WATER_BODIES,
  coastDistance,
  waterFloorY,
  beachApproach,
  BEACH,
  BEACH_BOUNDS,
  beachTerrain,
  beachFloorY,
  waterAt,
  shouldSwim,
  swimVerticalVelocity,
} from "../src/game/swimming/model.ts";
test("water depth and hysteresis distinguish land, shallows, deep water, and a raised pier", () => {
  assert.equal(waterAt(0, 0), null);
  assert.equal(shouldSwim(waterAt(42, -45), -1.1, false), true, "Fishing lake supports swimming");
  assert.equal(shouldSwim(waterAt(35, -40), 0.2, false), false, "dock remains dry");
  assert.equal(shouldSwim(waterAt(52.8, -45), -0.1, true), false, "shallows allow exiting");
  const deep = waterAt(-45, -42);
  assert.equal(shouldSwim(deep, -1.3, false), true);
  assert.equal(shouldSwim(deep, 0.2, true), false, "dry feet on a pier override water below");
  assert.equal(shouldSwim({ ...deep, depth: 0.9 }, -1, false), false);
  assert.equal(shouldSwim({ ...deep, depth: 0.9 }, -1, true), true);
  assert.equal(shouldSwim({ ...deep, depth: 0.6 }, -0.6, true), false);
  for (const dt of [1 / 40, 1 / 60]) {
    let y = -1.2;
    for (let i = 0; i < 5 / dt; i++) y += swimVerticalVelocity(y, BEACH.surface, 0) * dt;
    assert(Math.abs(y - (BEACH.surface - 0.1)) < 0.001, "buoyancy converges without sinking");
  }
});
test("open coast seabed has dry inland edges and remains deep toward the ocean", () => {
  const { vertices, indices } = beachTerrain();
  assert(vertices.every(Number.isFinite));
  assert(indices.every((i) => i < vertices.length / 3));
  for (let i = 0; i < vertices.length; i += 3) {
    const [x, y, z] = vertices.slice(i, i + 3);
    assert(Math.abs(x) <= 80 && Math.abs(z) <= 80);
    assert(Math.abs(y - beachFloorY(x, z)) < 0.00001);
    if (
      x === BEACH_BOUNDS.minX ||
      x === BEACH_BOUNDS.maxX ||
      z === BEACH_BOUNDS.minZ ||
      z === BEACH_BOUNDS.maxZ
    )
      assert(
        Math.abs(y + 3.28) < 0.00001,
        "outer edge stays submerged instead of forming a closed rim",
      );
  }
});
const bytes = await readFile(
  new URL("../public/assets/characters/toko-cung-explorer.glb", import.meta.url),
);
const asset = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
for (const explorer of [false, true])
  test(`${explorer ? "Explorer" : "Base"} Swim clips bind existing joints, animate limbs, loop, and preserve root`, () => {
    const scene = explorer ? createExplorerRig(asset.scene, []).scene : createAvatarSource().scene;
    for (const clip of createSwimClips(explorer)) {
      assert(clip.validate());

      for (const t of clip.tracks) {
        assert(scene.getObjectByName(t.name.split(".")[0]), t.name);
        assert([...t.values].every(Number.isFinite));
        const width = t.getValueSize();
        for (let j = 0; j < width; j++)
          assert(
            Math.abs(t.values[j] - t.values[t.values.length - width + j]) < 1e-5,
            "seamless loop",
          );
      }
      const mixer = new T.AnimationMixer(scene);
      mixer.clipAction(clip).play();
      const limbs = ["Left", "Right"].flatMap((s) => [
        s + (explorer ? "Arm" : "UpperArm"),
        s + (explorer ? "Leg" : "UpperLeg"),
      ]);
      mixer.update(0.06);
      const before = limbs.map((n) => scene.getObjectByName(n).quaternion.clone());
      mixer.update(0.22);
      limbs.forEach((n, i) =>
        assert(scene.getObjectByName(n).quaternion.angleTo(before[i]) > 0.02, n),
      );
      assert.deepEqual(scene.position.toArray(), [0, 0, 0]);
    }
  });

test("Plaza guidance first clears the stage wall, then uses the north and west pavements", () => {
  assert.deepEqual(beachApproach([41, 0.83, 10]), [26.2, 0, 10]);
  assert.deepEqual(beachApproach([26.2, 0.83, 10]), [26.2, 0, -36.2]);
  assert.deepEqual(beachApproach([26.2, 0.83, -36.2]), [-34.2, 0, -36.2]);
  assert.deepEqual(beachApproach([-34.2, 0.83, -36.2]), [-34.2, 0, -29]);
  assert.deepEqual(beachApproach([-34.2, 0.83, -29]), [-38, 0, -29]);
});

test("every water body matches its mesh; the pond stays enclosed and ocean stays open", () => {
  for (const body of WATER_BODIES) {
    assert(shouldSwim(waterAt(body.x, body.z), -1.1, false));
    const { vertices, indices } = beachTerrain(48, body);
    assert(indices.every((i) => i < vertices.length / 3));
    for (let i = 0; i < vertices.length; i += 3) {
      const [x, y, z] = vertices.slice(i, i + 3);
      assert(Math.abs(y - waterFloorY(x, z, body)) < 0.00001);
      if (
        x === body.bounds.minX ||
        x === body.bounds.maxX ||
        z === body.bounds.minZ ||
        z === body.bounds.maxZ
      )
        assert(Math.abs(y + (body.kind === "ocean" ? 3.28 : 0.04)) < 0.00001);
    }
  }
});

test("the former pond opens north/west, with swimmable sea around the finite town", () => {
  for (const [x, z] of [
    [-53.5, -42],
    [-65, -42],
    [-120, -120],
    [-40, -120],
    [95, 0],
    [0, 95],
  ]) {
    assert(coastDistance(x, z) > 0);
    assert(shouldSwim(waterAt(x, z), -1.3, false), `open sea at ${x},${z}`);
  }
  for (const [x, z] of [
    [-45, -25],
    [-35, -45],
    [0, 0],
    [45, 40],
  ])
    assert.equal(waterAt(x, z), null, `town remains dry at ${x},${z}`);
  const { vertices, indices } = beachTerrain();
  for (let i = 0; i < indices.length; i += 3) {
    const ids = [indices[i], indices[i + 1], indices[i + 2]];
    const x = ids.reduce((s, j) => s + vertices[j * 3], 0) / 3,
      z = ids.reduce((s, j) => s + vertices[j * 3 + 2], 0) / 3;
    assert(
      !(x > 30.5 && x < 54 && z > -54 && z < -35.5),
      "town terrain does not plug the fishing pond",
    );
  }
});
