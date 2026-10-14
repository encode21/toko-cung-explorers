import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createExplorerRig, EXPLORER_SCALE } from "../src/game/avatar/explorer-rig.ts";
import {
  DEFAULT_EXPLORER,
  EXPLORER_ITEMS,
  normalizeExplorer,
  equipExplorer,
} from "../src/identity/explorer.ts";
import { normalizeAvatar } from "../src/identity/avatar.ts";
const bytes = await readFile(
  new URL("../public/assets/characters/toko-cung-explorer.glb", import.meta.url),
);
const source = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const stats = (scene) => {
  let meshes = 0,
    triangles = 0;
  scene.traverseVisible((o) => {
    if (o.isMesh) {
      meshes++;
      triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    }
  });
  return { meshes, triangles };
};
test("versioned appearance accepts only starter IDs/colors and resolves crown collision", () => {
  const dirty = normalizeExplorer({
    ...DEFAULT_EXPLORER,
    audio: "headphones",
    back: "premium-admin",
    colors: { skin: "url(bad)", jacket: "#FF0033" },
  });
  assert.equal(dirty.headwear, "none");
  assert.equal(dirty.back, "explorer-pack");
  assert.equal(dirty.colors.skin, DEFAULT_EXPLORER.colors.skin);
  assert.equal(dirty.colors.jacket, "#ff0033");
  assert.equal(equipExplorer(dirty, "headwear", "baseball-cap").audio, "none");
  assert.deepEqual(normalizeExplorer({ ...dirty, version: 999 }), DEFAULT_EXPLORER);
  assert.deepEqual(normalizeAvatar({ explorer: dirty }).explorer, dirty);
});
test("all equipment replacements are exclusive, scalp covered, independent and safe across disposal", () => {
  const a = createExplorerRig(source.scene, source.animations),
    b = createExplorerRig(source.scene, source.animations);
  a.apply(DEFAULT_EXPLORER);
  b.apply(DEFAULT_EXPLORER);
  const original = stats(source.scene),
    merged = stats(a.scene);
  console.log({ original, optimizedDefault: merged });
  assert.ok(merged.meshes < original.meshes);
  const count = a.scene.getObjectByName("Socket_back").children.length;
  for (let i = 0; i < 30; i++)
    for (const [slot, options] of Object.entries(EXPLORER_ITEMS))
      for (const item of options) {
        const cfg = equipExplorer(DEFAULT_EXPLORER, slot, item.id);
        a.apply(cfg);
        for (const key of Object.keys(EXPLORER_ITEMS)) {
          if (["top", "bottom", "footwear"].includes(key)) {
            const visible = [];
            a.scene.traverse((o) => {
              if (o.userData.wardrobeSlot === key && o.visible) visible.push(o.userData.wardrobeId);
            });
            assert.ok(visible.length > 0);
            assert.ok(visible.every((id) => id === cfg[key]));
          } else
            assert.deepEqual(
              a.scene
                .getObjectByName(`Socket_${key}`)
                .children.filter((o) => o.visible)
                .map((o) => o.name),
              cfg[key] === "none" ? [] : [cfg[key]],
            );
        }
      }
  assert.equal(a.scene.getObjectByName("Socket_back").children.length, count);
  a.apply({
    ...DEFAULT_EXPLORER,
    headwear: "none",
    back: "none",
    colors: { ...DEFAULT_EXPLORER.colors, jacket: "#112233", hair: "#abcdef" },
  });
  assert.ok(a.scene.getObjectByName("scalp").visible);
  assert.equal(b.materials.get("jacket").color.getHexString(), "b92025");
  assert.notEqual(a.materials.get("sole").color.getHexString(), "abcdef");
  assert.notEqual(a.scene.getObjectByName("Head"), b.scene.getObjectByName("Head"));
  let sharedDisposed = false;
  b.scene.traverse((o) => {
    if (o.isMesh) o.geometry.addEventListener("dispose", () => (sharedDisposed = true));
  });
  a.dispose();
  assert.equal(sharedDisposed, false);
  b.actions.get("Walk").play();
  b.mixer.update(0.25);
  b.dispose();
});
test("original rigid clips animate sockets in place with finite feet-origin bounds", () => {
  const rig = createExplorerRig(source.scene, source.animations);
  rig.apply(DEFAULT_EXPLORER);
  assert.deepEqual(
    source.animations.map((c) => c.name),
    ["Idle", "Walk"],
  );
  const body = rig.scene.getObjectByName("Body");
  for (const clip of source.animations) {
    rig.mixer.stopAllAction();
    rig.actions.get(clip.name).reset().play();
    const rotations = [];
    for (let i = 0; i < 120; i++) {
      rig.mixer.update(1 / 60);
      rig.scene.updateMatrixWorld(true);
      assert.ok(Math.abs(body.position.x) < 1e-6 && Math.abs(body.position.z) < 1e-6);
      const head = rig.scene.getObjectByName("Head"),
        socket = rig.scene.getObjectByName("Socket_headwear");
      assert.deepEqual(head.matrixWorld.elements, socket.matrixWorld.elements);
      rotations.push(rig.scene.getObjectByName("LeftLeg").quaternion.x);
    }
    if (clip.name === "Walk") assert.ok(Math.max(...rotations) - Math.min(...rotations) > 0.1);
  }
  rig.mixer.stopAllAction();
  rig.scene.updateMatrixWorld(true);
  const bounds = new T.Box3();
  rig.scene.traverseVisible((o) => {
    if (o.isMesh) {
      o.geometry.computeBoundingBox();
      bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
    }
  });
  assert.ok(bounds.getSize(new T.Vector3()).y * EXPLORER_SCALE < 1.85);
  assert.ok(Math.abs(bounds.min.y * EXPLORER_SCALE) < 0.03);
  rig.dispose();
});

test("gameplay pose adaptation keys existing rigid pivots without modifying supplied clips", async () => {
  const { explorerClips } = await import("../src/game/avatar/explorer-clips.ts");
  const { createAvatarSource, AVATAR_ANIMATIONS } =
    await import("../src/game/avatar/avatar-source.ts");
  const { createDanceClips } = await import("../src/game/club/dance-clips.ts");
  const legacy = createAvatarSource();
  const original = source.animations.map((c) => JSON.stringify(T.AnimationClip.toJSON(c)));
  const clips = explorerClips(source.animations, [...legacy.animations, ...createDanceClips()]);
  for (const name of AVATAR_ANIMATIONS.filter((n) => n !== "Run"))
    assert.ok(
      clips.some((c) => c.name === name),
      name,
    );
  const rig = createExplorerRig(source.scene, clips);
  for (const clip of clips) {
    for (const track of clip.tracks)
      assert.ok(rig.scene.getObjectByName(track.name.split(".")[0]), track.name);
    rig.mixer.stopAllAction();
    rig.actions.get(clip.name).reset().play();
    for (let i = 0; i < 60; i++) rig.mixer.update(1 / 60);
    rig.scene.traverse((o) => {
      assert.ok(o.position.toArray().every(Number.isFinite));
      assert.ok(o.quaternion.toArray().every(Number.isFinite));
    });
  }
  assert.deepEqual(
    source.animations.map((c) => JSON.stringify(T.AnimationClip.toJSON(c))),
    original,
  );
  rig.dispose();
});
