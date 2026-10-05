import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { createAvatarSource, AVATAR_ANIMATIONS } from "../src/game/avatar/avatar-source.ts";

const source = createAvatarSource();
const bytes = await readFile(
  new URL("../public/assets/characters/base-avatar-v2.glb", import.meta.url),
);
const glb = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
for (const [label, asset] of [
  ["authored source", source],
  ["shipped GLB", glb],
]) {
  test(`${label}: shared 20-joint rig, metre scale and planted origin`, () => {
    const bones = [],
      meshes = [];
    asset.scene.traverse((o) => {
      if (o.isBone) bones.push(o.name);
      if (o.isSkinnedMesh) meshes.push(o);
    });
    assert.equal(new Set(bones).size, 20);
    for (const name of [
      "Root",
      "Hips",
      "Spine",
      "Chest",
      "Neck",
      "Head",
      "LeftLowerArm",
      "RightHand",
      "LeftFoot",
      "RightLowerLeg",
    ])
      assert.ok(bones.includes(name), name);
    assert.ok(meshes.length > 0);
    for (const m of meshes) {
      assert.equal(m.skeleton.bones.length, 20);
      assert.ok(m.material.roughness >= 0.6);
      assert.equal(m.material.metalness, 0);
      const p = m.geometry.getAttribute("position"),
        w = m.geometry.getAttribute("skinWeight");
      for (let i = 0; i < p.count; i++) {
        assert.ok(Number.isFinite(p.getY(i)));
        assert.ok(Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-5);
      }
    }
    const head = asset.scene.getObjectByName("BodySkin");
    head.geometry.computeBoundingBox();
    assert.ok(head.geometry.boundingBox.max.y <= 1.7);
    const soles = asset.scene.getObjectByName("BodySoles");
    soles.geometry.computeBoundingBox();
    assert.ok(Math.abs(soles.geometry.boundingBox.min.y) < 1e-6);
  });
  test(`${label}: complete clips animate every joint without invalid transforms`, () => {
    assert.deepEqual(
      asset.animations.map((c) => c.name),
      [...AVATAR_ANIMATIONS],
    );
    for (const clip of asset.animations) {
      const instance = clone(asset.scene),
        mixer = new T.AnimationMixer(instance);
      assert.equal(clip.tracks.filter((t) => t.name.endsWith(".quaternion")).length, 20);
      mixer.clipAction(clip).play();
      for (let i = 0; i < 10; i++) {
        mixer.update(clip.duration / 11);
        instance.updateMatrixWorld(true);
        instance.traverse((o) => {
          if (o.isBone) assert.ok(o.matrixWorld.elements.every(Number.isFinite));
        });
      }
      mixer.stopAllAction();
      mixer.uncacheRoot(instance);
    }
  });
  test(`${label}: nine interchangeable hair modules share the head rig`, () => {
    for (const name of [
      "short",
      "spiky",
      "bob",
      "buns",
      "cap",
      "buzz",
      "sidepart",
      "ponytail",
      "hijab",
    ])
      assert.ok(asset.scene.getObjectByName(`Hair_${name}`)?.isSkinnedMesh);
    assert.ok(!asset.scene.getObjectByName("BodySkin").geometry.type.includes("Sphere"));
  });
}
test("avatar payload remains under 750 KB", () => assert.ok(bytes.length < 750_000));
