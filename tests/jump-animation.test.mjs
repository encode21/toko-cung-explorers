import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createAvatarSource } from "../src/game/avatar/avatar-source.ts";
import { createExplorerRig, EXPLORER_SCALE } from "../src/game/avatar/explorer-rig.ts";
import { explorerClips } from "../src/game/avatar/explorer-clips.ts";
import { DEFAULT_EXPLORER } from "../src/identity/explorer.ts";
import {
  createJumpClips,
  JUMP_ANIMATIONS,
  jumpBlendSeconds,
} from "../src/game/avatar/jump-clips.ts";
import { createSocialClips } from "../src/game/avatar/social-clips.ts";
import { createDanceClips } from "../src/game/club/dance-clips.ts";

const bytes = await readFile(
  new URL("../public/assets/characters/toko-cung-explorer.glb", import.meta.url),
);
const asset = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const base = createAvatarSource();

for (const explorer of [false, true]) {
  const label = explorer ? "Explorer" : "Base";
  test(`${label}: jump phases bind only existing joints, hold without jitter, preserve canonical root`, () => {
    const rig = explorer ? createExplorerRig(asset.scene, []) : null;
    const scene = rig?.scene ?? createAvatarSource().scene;
    if (rig) rig.apply(DEFAULT_EXPLORER);
    const mixer = new T.AnimationMixer(scene);
    const clips = createJumpClips(explorer);
    assert.strictEqual(createJumpClips(explorer), clips, "shared immutable clip cache");
    assert.deepEqual(
      clips.map((c) => c.name),
      [...JUMP_ANIMATIONS],
    );
    for (const clip of clips) {
      assert(clip.validate(), clip.name);
      assert.equal(
        new Set(clip.tracks.map((t) => t.name)).size,
        clip.tracks.length,
        "one track per joint property",
      );
      for (const track of clip.tracks) {
        assert(scene.getObjectByName(track.name.split(".")[0]), track.name);
        assert([...track.values].every(Number.isFinite));
      }
      const action = mixer.clipAction(clip).reset().setLoop(T.LoopOnce, 1).play();
      action.clampWhenFinished = true;
      for (let frame = 0; frame < 72; frame++) {
        mixer.update(1 / 120);
        scene.updateMatrixWorld(true);
        scene.traverse((o) => assert(o.matrixWorld.elements.every(Number.isFinite)));
        if (clip.name === "JumpAnticipation" || clip.name === "JumpLand") {
          let sole = Infinity;
          scene.traverseVisible((mesh) => {
            if (
              !mesh.isMesh ||
              (explorer
                ? mesh.parent?.userData.wardrobeSlot !== "footwear"
                : mesh.name !== "BodySoles")
            )
              return;
            mesh.skeleton?.update();
            const positions = mesh.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
              const point = new T.Vector3().fromBufferAttribute(positions, i);
              if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, point);
              point.applyMatrix4(mesh.matrixWorld);
              sole = Math.min(sole, point.y * (explorer ? EXPLORER_SCALE : 1));
            }
          });
          assert(sole >= -0.02 && sole < 0.04, `${clip.name} planted shoe contact: ${sole}`);
        }
        assert.deepEqual(scene.position.toArray(), [0, 0, 0], "physics/net root never moves");
        assert.deepEqual(scene.scale.toArray(), [1, 1, 1], "canonical scale never changes");
      }
      const arm = scene.getObjectByName(explorer ? "LeftArm" : "LeftUpperArm");
      const held = arm.quaternion.clone();
      mixer.update(2);
      assert(
        arm.quaternion.toArray().every((value, i) => Math.abs(value - held.toArray()[i]) < 1e-7),
        `${clip.name} clamps without repeated flutter`,
      );
      mixer.stopAllAction();
    }
    mixer.uncacheRoot(scene);
    rig?.dispose();
  });

  test(`${label}: both hands rise, make exactly two smooth dips, then spread on descent`, () => {
    const clips = createJumpClips(explorer);
    const jump = clips.find((c) => c.name === "Jump");
    const track = jump.tracks.find(
      (t) => t.name === (explorer ? "LeftArm" : "LeftUpperArm") + ".quaternion",
    );
    const interpolant = track.createInterpolant();
    const angles = Array.from(
      { length: 321 },
      (_, i) =>
        new T.Euler().setFromQuaternion(
          new T.Quaternion().fromArray(interpolant.evaluate(i / 1000)),
        ).x,
    );
    assert(Math.min(...angles) < -2.2, "clear overhead swing");
    const reversals = [];
    for (let i = 1; i < angles.length - 1; i++) {
      const before = angles[i] - angles[i - 1],
        after = angles[i + 1] - angles[i];
      if (before > 0.0001 && after < -0.0001) reversals.push(i / 1000);
    }
    assert.equal(
      reversals.filter((t) => t > 0.08 && t < 0.26).length,
      2,
      "two finite dips, never a looping jitter",
    );
    for (let i = 1; i < angles.length; i++)
      assert(Math.abs(angles[i] - angles[i - 1]) < 0.075, "continuous shoulder motion");
    const fall = clips.find((c) => c.name === "JumpFall");
    for (const side of ["Left", "Right"]) {
      const arm = fall.tracks.find(
        (t) => t.name === side + (explorer ? "Arm" : "UpperArm") + ".quaternion",
      );
      const euler = new T.Euler().setFromQuaternion(
        new T.Quaternion().fromArray(arm.values, arm.values.length - 4),
      );
      assert(Math.abs(euler.z) > 0.7, "arms open for balance");
    }
  });

  test(`${label}: jump blends back to locomotion, wave and dance without stale transforms`, () => {
    const all = explorer
      ? explorerClips(asset.animations, base.animations)
      : [
          ...base.animations.filter((c) => c.name !== "Jump"),
          ...createJumpClips(),
          ...createSocialClips(),
          ...createDanceClips(),
        ];
    const rig = explorer ? createExplorerRig(asset.scene, all) : null;
    const scene = rig?.scene ?? createAvatarSource().scene;
    const mixer = rig?.mixer ?? new T.AnimationMixer(scene);
    let previous;
    for (const name of [
      "Walk",
      "JumpAnticipation",
      "Jump",
      "JumpFall",
      "JumpLand",
      "Walk",
      "Wave",
      "Dance_sway",
      "Idle",
    ]) {
      const clip = all.find((c) => c.name === name);
      const next = mixer.clipAction(clip).reset().setEffectiveWeight(1).play();
      if (previous)
        next.crossFadeFrom(previous, jumpBlendSeconds(name, previous.getClip().name), false);
      for (let i = 0; i < 48; i++) mixer.update(1 / 120);
      previous = next;
    }
    const pivot = scene.getObjectByName(explorer ? "Body" : "Hips");
    assert(Math.abs(pivot.position.y - (explorer ? 0 : 0.72)) < 0.01, "idle restores pelvis");
    assert.equal(scene.position.length(), 0);
    mixer.stopAllAction();
    mixer.uncacheRoot(scene);
    rig?.dispose();
  });
}
