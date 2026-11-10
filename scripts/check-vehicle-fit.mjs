import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createExplorerRig, EXPLORER_SCALE, EXPLORER_URL } from "../src/game/avatar/explorer-rig.ts";
import { explorerClips } from "../src/game/avatar/explorer-clips.ts";
import { createRidePose } from "../src/game/avatar/ride-pose.ts";
import { createRideClips } from "../src/game/avatar/ride-clips.ts";
import { VEHICLE_DEFINITIONS, SEAT_ROOT_OFFSET } from "../src/game/vehicles/definitions.ts";
import { WARDROBE } from "../src/identity/wardrobe.ts";
import { DEFAULT_EXPLORER } from "../src/identity/explorer.ts";
async function load(file) {
  const b = await readFile(
    new URL("../public/assets/characters/" + file + ".glb", import.meta.url),
  );
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), "");
}
const base = await load("base-avatar-v2"),
  explorer = await load(EXPLORER_URL.split("/").pop().replace(".glb", ""));
const results = [];
for (const isExplorer of [false, true]) {
  const clips = isExplorer
    ? explorerClips(explorer.animations, base.animations)
    : createRideClips(base.animations.find((c) => c.name === "Sit"));
  const rig = isExplorer ? createExplorerRig(explorer.scene, clips) : null;
  if (rig) rig.apply(DEFAULT_EXPLORER);
  const scene = rig?.scene ?? base.scene,
    scale = isExplorer ? EXPLORER_SCALE : 1;
  const mixer = new T.AnimationMixer(scene),
    layer = createRidePose(scene, scale);
  for (const [kind, definition] of Object.entries(VEHICLE_DEFINITIONS))
    for (const [index, seat] of definition.seats.entries()) {
      const name =
        kind === "motorcycle" || kind === "scooter"
          ? "RideBike"
          : index === 0
            ? "RideDrive"
            : "RidePassenger";
      layer.restore();
      mixer.stopAllAction();
      mixer
        .clipAction(clips.find((c) => c.name === name))
        .reset()
        .play();
      mixer.update(0.25);
      scene.updateMatrixWorld(true);
      if (index === 0) layer.apply(seat);
      scene.updateMatrixWorld(true);
      const bounds = new T.Box3();
      const hats = isExplorer
        ? WARDROBE.filter((i) => i.slot === "headwear").map((i) => i.id)
        : [null];
      for (const hat of hats) {
        if (rig) rig.apply({ ...DEFAULT_EXPLORER, headwear: hat });
        scene.updateMatrixWorld(true);
        scene.traverseVisible((mesh) => {
          if (!mesh.isMesh) return;
          if (!isExplorer && !/^(Body|Hair_|Accessory_)/.test(mesh.name)) return;
          const a = mesh.geometry.getAttribute("position");
          if (mesh.isSkinnedMesh) mesh.skeleton.update();
          for (let i = 0; i < a.count; i++) {
            const p = new T.Vector3().fromBufferAttribute(a, i);
            if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, p);
            bounds.expandByPoint(p.applyMatrix4(mesh.matrixWorld).multiplyScalar(scale));
          }
        });
      }
      const root = seat.cushion[1] + SEAT_ROOT_OFFSET - 0.83;
      const top = bounds.max.y + root,
        bottom = bounds.min.y + root;
      if (definition.roof)
        assert(
          top < definition.roof - 0.075,
          `${kind}/${isExplorer ? "Explorer" : "Base"}/${index} top ${top} roof ${definition.roof}`,
        );
      assert(bottom >= 0.35, `${kind}: feet through floor ${bottom}`);
      const hand = scene
        .getObjectByName(isExplorer ? "RightWrist" : "RightHand")
        ?.getWorldPosition(new T.Vector3())
        .multiplyScalar(scale);
      if (index === 0) {
        const actual = hand.clone().add(new T.Vector3(seat.cushion[0], root, seat.cushion[2]));
        assert(
          Math.min(...seat.grips.map((g) => actual.distanceTo(new T.Vector3(...g)))) < 0.1,
          `${kind}/${isExplorer}: hand misses grip ${actual.toArray()}`,
        );
      }
      results.push({
        rig: isExplorer ? "Explorer" : "Base",
        kind,
        seat: index,
        top: +top.toFixed(3),
        feet: +bottom.toFixed(3),
        hand: hand?.toArray().map((x) => +x.toFixed(3)),
      });
    }
  rig?.dispose();
}
console.log(JSON.stringify(results, null, 2));

const { rideSeatPose, doorAngle, vehicleTransitioning } =
  await import("../src/game/vehicles/model.ts");
const vehicle = {
  id: "test",
  model: "pickup",
  color: "#ffffff",
  revision: 1,
  pose: { x: 10, y: 0, z: 20, yaw: 0, speed: 0 },
  occupants: [{ connectionId: "one", seat: 0, status: "active" }],
};
const seated = rideSeatPose(vehicle, vehicle.pose, "one");
vehicle.occupants[0].transition = {
  phase: "entering",
  startedAt: 1000,
  durationMs: 2000,
  from: [12, 0.93, 20],
  to: [11.65, 0.93, 20.54],
};
assert(vehicleTransitioning(vehicle));
assert.equal(rideSeatPose(vehicle, vehicle.pose, "one", 1000).x, 12);
assert.equal(doorAngle(vehicle.occupants[0], 1000), 0);
assert(doorAngle(vehicle.occupants[0], 2000) > 0.9);
assert.deepEqual(rideSeatPose(vehicle, vehicle.pose, "one", 3000), seated);
vehicle.occupants[0].transition.phase = "exiting";
assert.deepEqual(rideSeatPose(vehicle, vehicle.pose, "one", 1000), seated);
const exit = rideSeatPose(vehicle, vehicle.pose, "one", 3000);
assert.deepEqual([exit.x, exit.y, exit.z], vehicle.occupants[0].transition.to);
assert.equal(doorAngle(vehicle.occupants[0], 3000), 0);
console.error(
  "PASS: all model/seat/headwear fit, grip reach, legacy seats and transition endpoints",
);
