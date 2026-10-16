import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createAvatarSource } from "../src/game/avatar/avatar-source.ts";
import { createExplorerRig, EXPLORER_SCALE } from "../src/game/avatar/explorer-rig.ts";
import { createDanceClips } from "../src/game/club/dance-clips.ts";
import { DEFAULT_EXPLORER } from "../src/identity/explorer.ts";
import { DANCES } from "../src/game/club/model.ts";
const bytes = await readFile(
  new URL("../public/assets/characters/toko-cung-explorer.glb", import.meta.url),
);
const asset = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const rigid = createExplorerRig(asset.scene, []);
rigid.apply(DEFAULT_EXPLORER);
const warnings = [];
const warn = console.warn;
console.warn = (...args) => warnings.push(args.join(" "));
try {
  for (const explorer of [false, true]) {
    const scene = explorer ? rigid.scene : createAvatarSource().scene;
    const mixer = new T.AnimationMixer(scene);
    const clips = createDanceClips(explorer);
    assert.equal(clips.length, DANCES.length);
    assert.strictEqual(clips, createDanceClips(explorer));
    const rootPosition = scene.position.clone();
    for (const clip of clips) {
      assert(clip.validate(), clip.name);
      for (const track of clip.tracks) {
        assert(scene.getObjectByName(track.name.split(".")[0]), track.name);
        const size = track.getValueSize();
        for (let j = 0; j < size; j++)
          assert(
            Math.abs(track.values[j] - track.values[track.values.length - size + j]) < 1e-6,
            `${clip.name}: seamless ${track.name}`,
          );
        assert([...track.values].every(Number.isFinite));
      }
      const action = mixer.clipAction(clip).play();
      let floorMin = Infinity,
        floorMax = -Infinity;
      for (let frame = 0; frame < 96; frame++) {
        mixer.setTime((frame / 96) * clip.duration);
        scene.updateMatrixWorld(true);
        let sole = Infinity;
        scene.traverseVisible((mesh) => {
          if (!mesh.isMesh) return;
          if (
            explorer ? mesh.parent?.userData.wardrobeSlot !== "footwear" : mesh.name !== "BodySoles"
          )
            return;
          if (mesh.isSkinnedMesh) mesh.skeleton.update();
          const pos = mesh.geometry.getAttribute("position");
          for (let i = 0; i < pos.count; i++) {
            const v = new T.Vector3().fromBufferAttribute(pos, i);
            if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, v);
            v.applyMatrix4(mesh.matrixWorld);
            sole = Math.min(sole, v.y * (explorer ? EXPLORER_SCALE : 1));
          }
        });
        floorMin = Math.min(floorMin, sole);
        floorMax = Math.max(floorMax, sole);
        assert(scene.position.distanceTo(rootPosition) < 1e-9, "canonical root never moves");
      }
      assert(
        floorMin >= -0.02,
        `${explorer ? "explorer" : "base"} ${clip.name} sinks: ${floorMin}`,
      );
      assert(
        floorMax < 0.025,
        `${explorer ? "explorer" : "base"} ${clip.name} floats: ${floorMax}`,
      );
      console.log(
        `${explorer ? "explorer" : "base"} ${clip.name}: support ${floorMin.toFixed(3)}..${floorMax.toFixed(3)}m`,
      );
      action.stop();
      mixer.stopAllAction();
      const idle = (explorer ? asset.animations : createAvatarSource().animations).find(
        (c) => c.name === "Idle",
      );
      mixer.clipAction(idle).play();
      mixer.update(0.3);
      const pivot = scene.getObjectByName(explorer ? "Body" : "Hips");
      assert(
        Math.abs(pivot.position.y - (explorer ? 0 : 0.72)) < 0.05,
        "idle restores pelvis height",
      );
      assert(scene.position.distanceTo(rootPosition) < 1e-9, "idle keeps canonical root");
      mixer.stopAllAction();
    }
    mixer.uncacheRoot(scene);
  }
  assert.deepEqual(warnings, [], "all tracks bind without warnings");
} finally {
  console.warn = warn;
  rigid.dispose();
}
console.log(
  "PASS all eight dances: both rigs, continuous loops, stable root, shoe contact, valid bindings",
);
