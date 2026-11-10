import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createExplorerRig, EXPLORER_URL } from "../src/game/avatar/explorer-rig.ts";
import { explorerClips } from "../src/game/avatar/explorer-clips.ts";
import { DEFAULT_EXPLORER, normalizeExplorer, equipExplorer } from "../src/identity/explorer.ts";
import { WARDROBE } from "../src/identity/wardrobe.ts";

async function load(path) {
  const data = await readFile(new URL("../public" + path, import.meta.url));
  return new GLTFLoader().parseAsync(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    "",
  );
}
const [old, social, base] = await Promise.all([
  load("/assets/characters/toko-cung-explorer.glb"),
  load(EXPLORER_URL),
  load("/assets/characters/base-avatar-v2.glb"),
]);
const clips = explorerClips(old.animations, base.animations);
const before = createExplorerRig(old.scene, clips);
const after = createExplorerRig(social.scene, explorerClips(social.animations, base.animations));

function feetY(scene) {
  let y = Infinity;
  const point = new T.Vector3();
  scene.traverseVisible((mesh) => {
    if (!mesh.isMesh || mesh.parent.userData.wardrobeSlot !== "footwear") return;
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++)
      y = Math.min(y, point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).y);
  });
  return y;
}

test("V3 replaces the whole body with new proportions, sculpted torso/hands/shoes and skinned limbs", () => {
  assert.equal(
    social.scene.getObjectByName("Explorer").userData.avatarVisual,
    "social-avatar-v3-full-body",
  );
  assert(after.scene.getObjectByName("Head_V3_Eye_whites"));
  const hipBefore = before.scene.getObjectByName("LeftLeg").position;
  const hipAfter = after.scene.getObjectByName("LeftLeg").position;
  assert(
    Math.abs(hipAfter.x) < Math.abs(hipBefore.x) * 0.75,
    "hips are narrower, not a face-only swap",
  );
  assert(hipAfter.y > hipBefore.y * 1.04, "longer legs change the silhouette");
  const torsoBefore = before.scene.getObjectByName("Wardrobe_top_hoodie_Body_jacket");
  const torsoAfter = after.scene.getObjectByName("Wardrobe_top_hoodie_Body_jacket");
  const a = new T.Box3().setFromObject(torsoBefore, true).getSize(new T.Vector3());
  const b = new T.Box3().setFromObject(torsoAfter, true).getSize(new T.Vector3());
  assert(b.x < a.x * 0.8 && b.z < a.z * 0.85, "new sculpted torso is narrower and less boxy");
  for (const side of ["Left", "Right"]) {
    assert(after.scene.getObjectByName(`Wardrobe_top_hoodie_${side}Arm_V3Sleeve`).isSkinnedMesh);
    assert(
      after.scene.getObjectByName(`${side}Wrist_skin`).geometry.attributes.position.count > 100,
    );
  }
  assert(after.scene.getObjectByName("Wardrobe_bottom_cargo_Body_V3Trousers").isSkinnedMesh);
  after.scene.traverse((o) => {
    if (!o.isMesh || o.name === "DrinkCup") return;
    assert(o.castShadow, `${o.name}: player shadows remain enabled`);
    if (!o.isSkinnedMesh) return;
    const weights = o.geometry.attributes.skinWeight;
    for (let i = 0; i < weights.count; i++)
      assert(
        Math.abs(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i) - 1) < 1e-5,
        "normalized joint weights",
      );
  });
});

test("44 retargeted clips preserve choreography, foot/seat contact and the canonical root", () => {
  before.apply(DEFAULT_EXPLORER);
  after.apply(DEFAULT_EXPLORER);
  assert.deepEqual([...after.actions.keys()], [...before.actions.keys()]);
  const pivots = ["Body", "Head"];
  for (const side of ["Left", "Right"])
    for (const joint of ["Arm", "Elbow", "Wrist", "Leg", "Knee"]) pivots.push(side + joint);
  const warnings = [],
    warn = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    for (const clip of clips) {
      assert(clip.validate(), clip.name);
      for (const rig of [before, after]) {
        rig.mixer.stopAllAction();
        const action = rig.actions.get(clip.name).reset().setLoop(T.LoopOnce, 1).play();
        action.clampWhenFinished = true;
      }
      for (let frame = 0; frame < 24; frame++) {
        for (const rig of [before, after]) {
          rig.mixer.update(clip.duration / 24);
          rig.scene.updateMatrixWorld(true);
          assert.deepEqual(rig.scene.position.toArray(), [0, 0, 0]);
          assert.deepEqual(rig.scene.scale.toArray(), [1, 1, 1]);
          rig.scene.traverseVisible((o) => assert(o.matrixWorld.elements.every(Number.isFinite)));
        }
        for (const name of pivots) {
          const a = before.scene.getObjectByName(name).quaternion;
          const b = after.scene.getObjectByName(name).quaternion;
          assert(
            a.clone().normalize().angleTo(b.clone().normalize()) < 1e-5,
            `${clip.name}: ${name} choreography changed`,
          );
        }
        const seated = /^(Sit|Ride|Piggyback|Swim|Fly)/.test(clip.name);
        const oldY = seated
          ? before.scene.getObjectByName("LeftLeg").getWorldPosition(new T.Vector3()).y
          : feetY(before.scene);
        const newY = seated
          ? after.scene.getObjectByName("LeftLeg").getWorldPosition(new T.Vector3()).y
          : feetY(after.scene);
        assert(
          Math.abs(oldY - newY) < 0.012,
          `${clip.name}: ${seated ? "seat" : "foot"} contact changed ${oldY} / ${newY}`,
        );
      }
    }
    assert.deepEqual(warnings, []);
    console.log(
      `Verified ${clips.length} clips including locomotion, carry, jump, swim, ride, flight, emotes and dances`,
    );
  } finally {
    console.warn = warn;
  }
});

test("all wardrobe choices and profile colors survive the V3 adaptation independently", () => {
  before.mixer.stopAllAction();
  after.mixer.stopAllAction();
  function visibleItems(rig) {
    const result = [];
    rig.scene.traverseVisible((o) => {
      if (
        o.userData.wardrobeSlot ||
        (o.parent?.name.startsWith("Socket_") && o.parent.name !== "Socket_hair")
      )
        result.push(o.name);
    });
    return result.sort();
  }
  for (const item of WARDROBE) {
    const config = item.preset
      ? normalizeExplorer({
          ...DEFAULT_EXPLORER,
          ...item.preset,
          colors: { ...DEFAULT_EXPLORER.colors, ...item.colors },
        })
      : equipExplorer(DEFAULT_EXPLORER, item.slot, item.id);
    before.apply(config);
    after.apply(config);
    assert.deepEqual(visibleItems(after), visibleItems(before), item.id);
    for (const [name, color] of Object.entries(config.colors))
      assert.equal(
        after.materials.get(name).color.getHexString(),
        color.slice(1),
        `${item.id} ${name}`,
      );
  }
  after.apply(DEFAULT_EXPLORER, true);
  assert([...after.materials.values()].every((m) => m.color.getHexString() === "131b24"));
  after.apply(DEFAULT_EXPLORER);
  assert.equal(after.materials.get("V3_Eye_whites").color.getHexString(), "fff6e7");
  const second = createExplorerRig(social.scene, social.animations);
  second.apply(DEFAULT_EXPLORER);
  const headGeometry = second.scene.getObjectByName("Head_V3_Eye_whites_1").geometry;
  let disposed = false;
  headGeometry.addEventListener("dispose", () => {
    disposed = true;
  });
  after.dispose();
  assert.equal(disposed, false, "remote avatar keeps shared geometry when local preview unmounts");
  assert.notEqual(second.scene.getObjectByName("LeftArm"), after.scene.getObjectByName("LeftArm"));
  second.actions.get("Run").play();
  second.mixer.update(0.2);
  second.scene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    assert(o.skeleton.bones.includes(second.scene.getObjectByName("LeftArm")));
    assert(!o.skeleton.bones.includes(after.scene.getObjectByName("LeftArm")));
  });
  second.dispose();
  before.dispose();
});

test("hair, expressions and every body preset survive normalization and keep independent rig state", () => {
  assert.equal(normalizeExplorer({ version: 1 }).age, "adult");
  for (const key of ["gender", "age", "build"])
    assert.equal(
      normalizeExplorer({ ...DEFAULT_EXPLORER, [key]: "invalid" })[key],
      DEFAULT_EXPLORER[key],
    );
  const rig = createExplorerRig(social.scene, social.animations);
  const other = createExplorerRig(social.scene, social.animations);
  const config = { ...DEFAULT_EXPLORER, headwear: "none" };
  for (const hair of ["short", "spiky", "bob", "buns", "buzz", "sidepart", "ponytail", "hijab"]) {
    rig.apply(config, false, { hair, expression: "smile" });
    const visible = [];
    rig.scene.traverseVisible((o) => {
      if (o.userData.hairStyle) visible.push(o.userData.hairStyle);
    });
    assert.deepEqual(visible, [hair]);
    rig.scene.updateMatrixWorld(true);
    const head = rig.scene.getObjectByName("Head"),
      face = rig.scene.getObjectByName("Head_skin"),
      crown = rig.scene.getObjectByName(`HairCrown_${hair}`);
    for (const source of [
      [0, 0.8, 0],
      [0.6, 0.35, 0],
      [0, 0.35, 0.7],
    ]) {
      const start = head.localToWorld(new T.Vector3(...source));
      const target = head.localToWorld(new T.Vector3(0, 0.27, 0));
      const hits = new T.Raycaster(start, target.sub(start).normalize()).intersectObjects(
        [face, crown],
        false,
      );
      assert.equal(hits[0]?.object, crown, `${hair}: scalp covers skin at ${source}`);
    }
  }
  rig.apply({ ...config, headwear: "mini-crown" });
  assert(rig.scene.getObjectByName("HairCrown_short").visible, "mini crown keeps the scalp covered");
  rig.apply({ ...config, headwear: "beanie" });
  assert(rig.scene.getObjectByName("HairCrown_short").visible, "full hats never expose a bald scalp");
  assert(!rig.scene.getObjectByName("HairLocks_short").visible, "full hats hide the locks that would clip");
  assert(rig.scene.getObjectByName("HairHat_short").visible, "full hats show the under-brim locks");
  for (const expression of ["smile", "grin", "wink", "calm"]) {
    rig.apply(config, false, { hair: "short", expression });
    const expected = expression === "wink" ? "smile" : expression;
    const mouths = [];
    rig.scene.traverseVisible((o) => {
      if (o.userData.mouthExpression) mouths.push(o.userData.mouthExpression);
    });
    assert.deepEqual(mouths, [expected]);
    assert.equal(
      rig.scene.getObjectByName("ClosedEye_-1").visible,
      ["wink", "calm"].includes(expression),
    );
  }
  const torso = rig.scene.getObjectByName("Wardrobe_top_hoodie_Body_jacket");
  const widths = {};
  for (const gender of ["male", "female"])
    for (const age of ["adult", "child"])
      for (const build of ["regular", "slim", "heavy", "muscular"]) {
        rig.apply({ ...config, gender, age, build });
        const influences = torso.morphTargetInfluences;
        assert.equal(influences[torso.morphTargetDictionary.female], gender === "female" ? 1 : 0);
        if (age === "adult" && gender === "male")
          widths[build] = new T.Box3().setFromObject(torso, true).getSize(new T.Vector3()).x;
        for (const clip of social.animations) {
          rig.mixer.stopAllAction();
          rig.actions.get(clip.name).reset().play();
          rig.mixer.update(0.2);
          rig.updateProportions(clip.name);
          rig.scene.updateMatrixWorld(true);
          rig.scene.traverseVisible((o) => assert(o.matrixWorld.elements.every(Number.isFinite)));
          assert.deepEqual(rig.scene.scale.toArray(), [1, 1, 1]);
          assert.deepEqual(rig.scene.position.toArray(), [0, 0, 0]);
        }
      }
  assert(widths.slim < widths.regular && widths.regular < widths.heavy);
  other.apply(config);
  assert(
    other.scene
      .getObjectByName("Wardrobe_top_hoodie_Body_jacket")
      .morphTargetInfluences.every((value) => value === 0),
  );
  for (const name of ["Sit", "RideDrive", "Piggyback", "Swim"]) {
    const heights = [];
    for (const age of ["adult", "child"]) {
      rig.mixer.stopAllAction();
      rig.apply({ ...config, age });
      rig.actions.get(name).reset().play();
      rig.mixer.update(0.2);
      rig.updateProportions(name);
      rig.scene.updateMatrixWorld(true);
      heights.push(rig.scene.getObjectByName("LeftLeg").getWorldPosition(new T.Vector3()).y);
    }
    assert(Math.abs(heights[0] - heights[1]) < 0.0001, `${name}: child keeps seat/water contact`);
  }
  rig.dispose();
  other.dispose();
});

test("child and adult drivers keep reachable steering grips", async () => {
  const { createRidePose } = await import("../src/game/avatar/ride-pose.ts");
  const { VEHICLE_DEFINITIONS } = await import("../src/game/vehicles/definitions.ts");
  const { EXPLORER_SCALE } = await import("../src/game/avatar/explorer-rig.ts");
  const rig = createExplorerRig(social.scene, social.animations);
  const layer = createRidePose(rig.scene, EXPLORER_SCALE);
  for (const age of ["adult", "child"])
    for (const [kind, definition] of Object.entries(VEHICLE_DEFINITIONS)) {
      const seat = definition.seats[0];
      layer.restore();
      rig.mixer.stopAllAction();
      rig.apply({ ...DEFAULT_EXPLORER, age });
      const name = ["motorcycle", "scooter"].includes(kind) ? "RideBike" : "RideDrive";
      rig.actions.get(name).reset().play();
      rig.mixer.update(0.2);
      rig.updateProportions(name);
      layer.apply(seat);
      rig.scene.updateMatrixWorld(true);
      for (const side of ["Left", "Right"]) {
        const hand = rig.scene
          .getObjectByName(side + "Wrist")
          .getWorldPosition(new T.Vector3())
          .multiplyScalar(EXPLORER_SCALE)
          .add(new T.Vector3(seat.cushion[0], seat.cushion[1] - 0.36, seat.cushion[2]));
        assert(
          Math.min(...seat.grips.map((g) => hand.distanceTo(new T.Vector3(...g)))) < 0.1,
          `${age}/${kind}/${side}: reaches grip`,
        );
      }
    }
  layer.restore();
  rig.updateProportions("Idle");
  assert.deepEqual(rig.scene.getObjectByName("VisualAge").position.toArray(), [0, 0, 0]);
  rig.dispose();
});
