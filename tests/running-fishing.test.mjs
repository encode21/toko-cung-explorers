import test from "node:test";
import assert from "node:assert/strict";
import { analogRunning } from "../src/game/player/analog-run.ts";
import {
  fishingPhase,
  fishingApproach,
  atFishingSpot,
  catchRevealing,
  CATCH_REVEAL_MS,
} from "../src/game/fishing/model.ts";
import { createRunClip } from "../src/game/avatar/run-clips.ts";
import { explorerClips } from "../src/game/avatar/explorer-clips.ts";
import { createAvatarSource } from "../src/game/avatar/avatar-source.ts";
import { createExplorerRig } from "../src/game/avatar/explorer-rig.ts";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as T from "three";

test("analog hysteresis works radially in every direction, never chatters at the outer threshold", () => {
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    let running = false;
    for (const [r, expected] of [
      [0.4, false],
      [0.91, false],
      [0.94, true],
      [0.89, true],
      [0.81, true],
      [0.79, false],
      [0.85, false],
      [1, true],
      [0, false],
    ]) {
      running = analogRunning(Math.hypot(Math.cos(a) * r, Math.sin(a) * r), running);
      assert.equal(running, expected);
    }
  }
  assert.equal(analogRunning(NaN, true), false);
});
test("fishing deadlines are finite and precise, approach avoids the obby and stage", () => {
  const cast = { status: "waiting", biteAt: 100, expiresAt: 300 };
  assert.equal(fishingPhase(cast, 99), "waiting");
  assert.equal(fishingPhase(cast, 100), "bite");
  assert.equal(fishingPhase(cast, 300), "bite");
  assert.equal(fishingPhase(cast, 301), "missed");
  assert.deepEqual(fishingApproach([41, 0.83, 10]), [26.2, 0, 10]);
  assert.deepEqual(fishingApproach([26.2, 0.83, -20]), [26.2, 0, -34]);
  assert.deepEqual(fishingApproach([26.2, 0.83, -34]), [35, 0, -34]);
  assert(atFishingSpot([35, 1.03, -40]));
  assert(!atFishingSpot([35, 5, -40]));
});
const bytes = await readFile(
  new URL("../public/assets/characters/toko-cung-explorer.glb", import.meta.url),
);
const asset = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
for (const explorer of [false, true])
  test(`${explorer ? "Explorer" : "Base"} Run binds existing joints, animates both arms/legs, loops and leaves root fixed`, () => {
    const scene = explorer ? createExplorerRig(asset.scene, []).scene : createAvatarSource().scene;
    const clip = createRunClip(explorer);
    assert(clip.validate());
    assert.strictEqual(createRunClip(explorer), clip);
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
      assert(scene.getObjectByName(n).quaternion.angleTo(before[i]) > 0.5, n),
    );
    assert.deepEqual(scene.position.toArray(), [0, 0, 0]);
    if (explorer) {
      const clips = explorerClips(asset.animations, createAvatarSource().animations);
      assert(clips.find((c) => c.name === "Run"));
      assert(clips.find((c) => c.name === "CarryRun"));
    }
  });

test("catch presentation ends independently from the authoritative receipt", () => {
  assert.equal(catchRevealing(null, 100), false);
  assert.equal(catchRevealing(100, 100), true);
  assert.equal(catchRevealing(100, 100 + CATCH_REVEAL_MS - 1), true);
  assert.equal(catchRevealing(100, 100 + CATCH_REVEAL_MS), false);
  assert.equal(fishingPhase({ status: "caught", biteAt: 0, expiresAt: 50 }, 5000), "caught");
});
