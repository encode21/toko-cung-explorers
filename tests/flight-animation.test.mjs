import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createAvatarSource } from "../src/game/avatar/avatar-source.ts";
import { createExplorerRig } from "../src/game/avatar/explorer-rig.ts";
import { createFlightClips, flightAnimation } from "../src/game/avatar/flight-clips.ts";
const bytes = await readFile(
  new URL("../public/assets/characters/toko-cung-explorer.glb", import.meta.url),
);
const asset = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
test("vertical movement stays upright; only horizontal movement uses Superman", () => {
  assert.equal(flightAnimation(0, 0), "FlightHover");
  assert.equal(flightAnimation(7, 1), "FlightHover");
  assert.equal(flightAnimation(7, -1), "FlightHover");
  assert.equal(flightAnimation(0.03, 0), "FlightHover");
  assert.equal(flightAnimation(4, 0), "FlightForward");
});
for (const explorer of [false, true])
  test(`${explorer ? "Explorer" : "Base"} flight rig holds horizontal/vertical poses without moving the canonical root`, () => {
    const rig = explorer ? createExplorerRig(asset.scene, []) : null;
    const scene = rig?.scene ?? createAvatarSource().scene;
    const mixer = new T.AnimationMixer(scene);
    for (const clip of createFlightClips(explorer)) {
      assert(clip.validate());
      for (const track of clip.tracks) {
        assert(scene.getObjectByName(track.name.split(".")[0]), track.name);
        assert([...track.values].every(Number.isFinite));
      }
      mixer.clipAction(clip).play();
      mixer.update(0.5);
      scene.updateMatrixWorld(true);
      const body = scene.getObjectByName(explorer ? "Body" : "Hips");
      const axis = new T.Vector3(0, 1, 0).applyQuaternion(body.quaternion);
      if (clip.name === "FlightForward")
        assert(axis.z > 0.98 && Math.abs(axis.y) < 0.12, "torso horizontal");
      else assert(axis.y > 0.99, "torso upright");
      const arm = scene.getObjectByName(explorer ? "LeftArm" : "LeftUpperArm");
      const held = arm.quaternion.clone();
      mixer.update(3);
      assert(arm.quaternion.angleTo(held) < 1e-6, "no repeated jump flutter");
      assert.deepEqual(scene.position.toArray(), [0, 0, 0]);
      assert.deepEqual(scene.scale.toArray(), [1, 1, 1]);
      mixer.stopAllAction();
    }
    rig?.dispose();
  });
