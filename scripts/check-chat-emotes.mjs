import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createAvatarSource, AVATAR_ANIMATIONS } from "../src/game/avatar/avatar-source.ts";
import { createEmoteClips } from "../src/game/avatar/emote-clips.ts";
import { createExplorerRig, EXPLORER_SCALE } from "../src/game/avatar/explorer-rig.ts";
import { explorerClips } from "../src/game/avatar/explorer-clips.ts";
import { DEFAULT_EXPLORER } from "../src/identity/explorer.ts";
import * as emotes from "../src/game/social/chat-emotes.ts";

// Exercise the real action module with deterministic time and no transport/account.
let now = 0;
let broadcasts = 0;
let benchMoves = 0;
const dependencies = {
  "./chat-emotes": emotes,
  "@/net/useWorldChannel": {
    getActiveChannel: () => ({ send: () => broadcasts++ }),
    playerId: "local-player",
    remoteStates: new Map(),
  },
  "@/net/net-store": { useNet: { getState: () => ({ name: "Player" }) } },
  "@/state/game-store": {
    useGame: { getState: () => ({ setSitting: () => benchMoves++, setToast() {} }) },
  },
};
const source = await readFile(
  new URL("../src/game/social/social-actions.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const module = { exports: {} };
new Function("require", "module", "exports", "performance", outputText)(
  (name) => {
    assert(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  },
  module,
  module.exports,
  { now: () => now },
);
const actions = module.exports;
assert.equal(actions.selectChatEmote("sit").ok, false, "selection requires a live controller");
actions.registerChatEmoteGuard(() => "Tunggu sampai karakter mendarat.");
assert.match(actions.selectChatEmote("lie").message, /mendarat/);
assert.equal(actions.getActiveChatEmote(), null, "blocked poses never start");
actions.registerChatEmoteGuard(() => null);

for (const { id, animation, seconds } of emotes.CHAT_EMOTES) {
  assert.equal(actions.selectChatEmote(id).ok, true);
  assert.equal(actions.getActiveChatEmote(), id);
  assert.equal(actions.peekLocalSocialAnim(), animation);
  assert.equal(actions.consumeSocialHit(), null, `${id} never queues a combat impulse`);
  now += Number.isFinite(seconds) ? seconds * 1000 + 1 : 600_000;
  assert.equal(actions.getActiveChatEmote(), Number.isFinite(seconds) ? null : id);
  actions.cancelChatEmote();
  assert.equal(actions.peekLocalSocialAnim(), null);
  assert.equal(actions.selectChatEmote(id).ok, true);
  actions.cancelSocialPoseOnMove();
  assert.equal(actions.getActiveChatEmote(), null, `${id} yields to movement/jump/recovery`);
}
actions.selectChatEmote("sit");
actions.registerChatEmoteGuard(null);
assert.equal(actions.getActiveChatEmote(), null, "controller unmount cancels persistent poses");
actions.setLocalSocialAnim("Hit", 400);
actions.cancelSocialPoseOnMove();
assert.equal(actions.peekLocalSocialAnim(), "Hit", "pose cancellation preserves combat reactions");
now += 401;
assert.equal(actions.peekLocalSocialAnim(), null);
assert.equal(broadcasts, 0, "emotes use the existing pose broadcaster, not combat transport");
assert.equal(benchMoves, 0, "ground sitting never changes bench state or position");

// Load both real rigs and run their mixers without WebGL or a browser.
const base = createAvatarSource();
const bytes = await readFile(
  new URL("../public/assets/characters/toko-cung-explorer.glb", import.meta.url),
);
const explorer = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const rigid = createExplorerRig(
  explorer.scene,
  explorerClips(explorer.animations, base.animations),
);
rigid.apply(DEFAULT_EXPLORER);
const warnings = [];
const originalWarn = console.warn;
console.warn = (...args) => warnings.push(args.join(" "));
try {
  for (const [label, scene, clips, scale] of [
    ["base", base.scene, base.animations, 1],
    ["explorer", rigid.scene, explorerClips(explorer.animations, base.animations), EXPLORER_SCALE],
  ]) {
    const mixer = new THREE.AnimationMixer(scene);
    for (const emote of emotes.CHAT_EMOTES) {
      assert(AVATAR_ANIMATIONS.includes(emote.animation), "remote whitelist accepts every emote");
      const matches = clips.filter((clip) => clip.name === emote.animation);
      assert.equal(matches.length, 1, `${label}: exactly one ${emote.animation} clip`);
      const clip = matches[0];
      assert(clip.validate(), `${label}: valid keyframe tracks`);
      for (const track of clip.tracks) {
        assert(scene.getObjectByName(track.name.split(".")[0]), `${label}: ${track.name} resolves`);
        assert([...track.values].every(Number.isFinite), `${label}: no invalid transforms`);
      }
      mixer.stopAllAction();
      const action = mixer.clipAction(clip);
      action.setLoop(Number.isFinite(emote.seconds) ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = true;
      action.play();
      mixer.update(clip.duration / 2);
      scene.updateMatrixWorld(true);
      const pivot = scene.getObjectByName(label === "base" ? "Hips" : "Body");
      if (emote.id === "lie") {
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(pivot.quaternion);
        assert(Math.abs(up.y) < 0.01, `${label}: lying torso is horizontal`);
        mixer.update(clip.duration * 4);
        assert(Math.abs(pivot.rotation.x + Math.PI / 2) < 0.01, `${label}: lying persists`);
      }
      if (emote.id === "sit") {
        const leg = scene.getObjectByName(label === "base" ? "LeftUpperLeg" : "LeftLeg");
        assert(leg.rotation.x < -1.4, `${label}: seated legs extend forward`);
        mixer.update(clip.duration * 4);
        assert(leg.rotation.x < -1.4, `${label}: sitting persists`);
      }
      if (!Number.isFinite(emote.seconds)) {
        scene.updateMatrixWorld(true);
        const bounds = new THREE.Box3();
        scene.traverseVisible((mesh) => {
          if (!mesh.isMesh) return;
          // Base has all unequipped variants visible until its renderer applies appearance.
          if (label === "base" && !mesh.name.startsWith("Body")) return;
          const positions = mesh.geometry.getAttribute("position");
          if (mesh.isSkinnedMesh) mesh.skeleton.update();
          for (let index = 0; index < positions.count; index++) {
            const point = new THREE.Vector3().fromBufferAttribute(positions, index);
            if (mesh.isSkinnedMesh) mesh.applyBoneTransform(index, point);
            bounds.expandByPoint(point.applyMatrix4(mesh.matrixWorld).multiplyScalar(scale));
          }
        });
        assert(
          bounds.min.y >= -0.015,
          `${label}: ${emote.id} stays above the floor (${bounds.min.y})`,
        );
        assert(
          bounds.max.y < (emote.id === "lie" ? 0.85 : 1.3),
          `${label}: pose visibly lowers body`,
        );
      } else {
        mixer.update(clip.duration + 0.1);
        assert(action.paused, `${label}: finite emotes stop rather than repeat`);
        assert(
          pivot.quaternion.angleTo(new THREE.Quaternion()) < 0.01,
          `${label}: torso ends neutral`,
        );
      }
      mixer.stopAllAction();
      mixer.clipAction(clips.find((entry) => entry.name === "Idle")).play();
      mixer.update(0.1);
      assert(
        pivot.quaternion.angleTo(new THREE.Quaternion()) < 0.1,
        `${label}: idle restores torso`,
      );
      assert(
        Math.abs(pivot.position.y - (label === "base" ? 0.72 : 0)) < 0.05,
        `${label}: idle restores height`,
      );
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(scene);
  }
  assert.equal(warnings.length, 0, `All animation tracks bind: ${warnings.join("; ")}`);
} finally {
  console.warn = originalWarn;
  rigid.dispose();
}
assert.strictEqual(
  createEmoteClips(),
  createEmoteClips(),
  "generated clips are cached across avatars",
);
console.log(
  "PASS chat emotes: eligibility, persistent/finite lifecycle, movement cancel, no combat/bench effects, both real rigs and idle recovery",
);
