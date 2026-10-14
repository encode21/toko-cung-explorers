import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createExplorerRig } from "../src/game/avatar/explorer-rig.ts";
import { createSocialClips } from "../src/game/avatar/social-clips.ts";
import { createDanceClips } from "../src/game/club/dance-clips.ts";
const bytes = await readFile(
  new URL("../public/assets/characters/toko-cung-explorer.glb", import.meta.url),
);
const asset = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
test("wave reaches above the shoulder, has wrist articulation and returns to a neutral pose", () => {
  const rig = createExplorerRig(asset.scene, createSocialClips(true));
  const action = rig.actions.get("Wave").setLoop(T.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  rig.mixer.setTime(1.2);
  rig.scene.updateMatrixWorld(true);
  const palm = rig.scene.getObjectByName("RightWrist").getWorldPosition(new T.Vector3());
  const shoulder = rig.scene.getObjectByName("RightArm").getWorldPosition(new T.Vector3());
  assert(palm.y > shoulder.y + 0.15);
  assert(palm.x > shoulder.x + 0.2, "raised hand stays outside torso");
  assert(createSocialClips(true)[0].tracks.some((t) => t.name === "RightWrist.quaternion"));
  rig.mixer.setTime(2.4);
  for (const name of ["RightArm", "RightElbow", "RightWrist"])
    assert(rig.scene.getObjectByName(name).quaternion.angleTo(new T.Quaternion()) < 0.001);
  rig.dispose();
});
test("sip carries an attached cup toward the face without translating the player root", () => {
  const rig = createExplorerRig(asset.scene, createSocialClips(true));
  rig.actions.get("Drink").play();
  rig.mixer.setTime(1.4);
  rig.scene.updateMatrixWorld(true);
  const cup = rig.scene.getObjectByName("DrinkCup");
  assert.equal(cup.parent.name, "RightWrist");
  const position = cup.getWorldPosition(new T.Vector3());
  assert(position.y > 1.5 && position.y < 2.1);
  assert(position.z > 0.2);
  assert.deepEqual(rig.scene.position.toArray(), [0, 0, 0]);
  rig.dispose();
});
test("all eight dance loops have continuous seams, bounded joint velocity and reusable clips", () => {
  for (const explorer of [false, true]) {
    const clips = createDanceClips(explorer);
    assert.equal(clips, createDanceClips(explorer), "clips are shared across players");
    assert.equal(clips.length, 8);
    for (const clip of clips)
      for (const track of clip.tracks) {
        assert(!track.name.startsWith("Root."));
        const size = track.getValueSize();
        const first = Array.from(track.values.slice(0, size));
        const last = Array.from(track.values.slice(-size));
        first.forEach((v, i) =>
          assert(Math.abs(v - last[i]) < 0.00001, clip.name + " seamless loop"),
        );
        if (size === 4) {
          for (let i = 4; i < track.values.length; i += 4) {
            const a = new T.Quaternion().fromArray(track.values, i - 4);
            const b = new T.Quaternion().fromArray(track.values, i);
            assert(a.angleTo(b) < 0.15, clip.name + " bounded per-frame motion");
          }
        }
      }
  }
});
