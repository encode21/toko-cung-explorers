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
  CITY_WATERLINE,
  beachTerrain,
  beachFloorY,
  waterAt,
  shouldSwim,
  swimVerticalVelocity,
  setGangCoast,
} from "../src/game/swimming/model.ts";
import { emitSplash, takeSplashes, clearSplashes } from "../src/game/swimming/splash-pool.ts";
test("water depth and hysteresis distinguish land, shallows, deep water, and a raised pier", () => {
  assert.equal(waterAt(0, 0), null);
  assert.equal(shouldSwim(waterAt(42, -45), -1.1, false), true, "Fishing lake supports swimming");
  assert.equal(shouldSwim(waterAt(35, -40), 0.2, false), false, "dock remains dry");
  assert.equal(shouldSwim(waterAt(52.8, -45), -0.1, true), false, "shallows allow exiting");
  const deep = waterAt(-45, -42);
  const s = deep.surface;
  assert.equal(shouldSwim(deep, s - 1.22, false), true);
  assert.equal(shouldSwim(deep, 0.2, true), false, "dry feet on a pier override water below");
  assert.equal(shouldSwim({ ...deep, depth: 0.9 }, s - 0.92, false), false);
  assert.equal(shouldSwim({ ...deep, depth: 0.9 }, s - 0.92, true), true);
  assert.equal(shouldSwim({ ...deep, depth: 0.6 }, s - 0.52, true), false);
  for (const dt of [1 / 30, 1 / 60]) {
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
    assert(
      x >= BEACH_BOUNDS.minX &&
        x <= BEACH_BOUNDS.maxX &&
        z >= BEACH_BOUNDS.minZ &&
        z <= BEACH_BOUNDS.maxZ,
    );
    assert(Math.abs(y - beachFloorY(x, z)) < 0.00001);
    if (
      x === BEACH_BOUNDS.minX ||
      x === BEACH_BOUNDS.maxX ||
      z === BEACH_BOUNDS.minZ ||
      z === BEACH_BOUNDS.maxZ
    )
      assert(
        Math.abs(y + BEACH.depth + 0.08) < 0.00001,
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
  // Mountain coast has its own terrain mesh; its centre is the shoreline, not deep water.
  for (const body of WATER_BODIES.filter((body) => !("mountain" in body))) {
    assert(shouldSwim(waterAt(body.x, body.z), body.surface - 1.1, false));
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
        assert(Math.abs(y + (body.kind === "ocean" ? BEACH.depth + 0.08 : 0.04)) < 0.00001);
    }
  }
});

test("the former pond opens north/west, with swimmable sea around the finite town", () => {
  for (const [x, z] of [
    [-53.5, -42],
    [-65, -42],
    [-120, -120],
    [-40, -120],
    [170, 0],
    [0, 95],
  ]) {
    assert(coastDistance(x, z) > 0);
    assert(shouldSwim(waterAt(x, z), BEACH.surface - 1.22, false), `open sea at ${x},${z}`);
  }
  for (const [x, z] of [
    [-45, -25],
    [-35, -45],
    [0, 0],
    [45, 40],
    [95, 0],
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
    assert(!(x > 92 && x < 120 && z > 77 && z < 99), "town terrain does not plug the city lake");
  }
});
test("east district coast slopes gradually into the sea instead of a cliff", () => {
  for (const [x0, z, dx] of [
    [148, 90, 1],
    [100, 132, 0],
    [100, -32, 0],
  ]) {
    const step = (d) => (dx ? beachFloorY(x0 + d, z) : beachFloorY(x0, z + (z > 0 ? d : -d)));
    assert(Math.abs(step(0) + 0.04) < 0.00001, "shore starts at land level");
    assert(step(2) > BEACH.surface, "dry sand slopes down to the waterline");
    assert(
      Math.abs(step(CITY_WATERLINE) - BEACH.surface) < 0.00001,
      "foam meets the actual waterline",
    );
    assert(step(6) < BEACH.surface, "water starts a few metres out");
    assert(Math.abs(step(12) + BEACH.depth + 0.08) < 0.00001, "deep water 12 m offshore");
  }
});
test("the city sea does not extend past its play walls into far-off maps", () => {
  assert.equal(waterAt(6040, 3060), null, "Gang beach is not city ocean");
  assert.notEqual(waterAt(-45, -42), null);
});
test("Gang ankle-deep water emits contacts without triggering city swimming, and clears on exit", () => {
  setGangCoast({ origin: [6000, 0, 3000], end: 130 });
  try {
    assert.equal(waterAt(6035, 3060), null, "sand above sea remains dry");
    const water = waterAt(6046, 3060);
    assert(water.depth > 0.1 && water.depth < 0.3);
    assert.equal(shouldSwim(water, water.floor, false), false);
    clearSplashes();
    assert(emitSplash(6046, 3060, 0.6, "entry"));
    const [splash] = takeSplashes();
    assert.equal(splash.kind, "entry");
    assert.equal(splash.y, water.surface + 0.025);
  } finally {
    setGangCoast(null);
    clearSplashes();
  }
  assert.equal(waterAt(6046, 3060), null, "unmounted Gang has no phantom water");
});
test("water entries retain impact strength and the shared effect queue stays bounded", () => {
  clearSplashes();
  assert.equal(emitSplash(0, 0, 1.5, "plunge"), false);
  assert(emitSplash(-45, -38, 3, "plunge"));
  for (let i = 0; i < 30; i++) emitSplash(-45, -38, 0.4);
  const events = takeSplashes();
  assert.equal(events.length, 16);
  assert.equal(events[0].kind, "plunge");
  assert.equal(events[0].strength, 1.5);
  assert(events.slice(1).every((e) => e.kind === "ripple" && e.strength === 0.4));
  assert.deepEqual(takeSplashes(), []);
});
