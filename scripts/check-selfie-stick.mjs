/** Verify actual avatar palms, pose restoration and the rendered prop without WebGL. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import ts from "typescript";
import { createExplorerRig, EXPLORER_SCALE } from "../src/game/avatar/explorer-rig.ts";
import { createSelfiePose } from "../src/game/photo/selfie-pose.ts";
import { readParachuteGrip } from "../src/game/obby/parachute-visual.ts";
let frame,
  sheet = "camera",
  mode = "selfie",
  yaw = 0,
  pitch = 0;
const jsx = (type, props) => ({ type, props });
const dependencies = {
  react: { useRef: (current) => ({ current }), useMemo: (fn) => fn() },
  three: T,
  "@react-three/fiber": {
    useFrame: (fn) => {
      frame = fn;
    },
  },
  "@/game/jsx/jsx-runtime": { jsx, jsxs: jsx },
  "@/state/hud-store": { useHud: { getState: () => ({ sheet }) } },
  "./photo-store": { usePhoto: { getState: () => ({ mode, yaw, pitch }) } },
  "@/game/obby/parachute-visual": { readParachuteGrip },
};
const source = await readFile(
  new URL("../src/game/photo/SelfieStick.tsx", import.meta.url),
  "utf8",
);
const mod = { exports: {} };
new Function(
  "require",
  "module",
  "exports",
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
)(
  (id) => {
    assert(id in dependencies, id);
    return dependencies[id];
  },
  mod,
  mod.exports,
);
const constructors = {
  group: T.Group,
  mesh: T.Mesh,
  cylinderGeometry: T.CylinderGeometry,
  boxGeometry: T.BoxGeometry,
  sphereGeometry: T.SphereGeometry,
  meshStandardMaterial: T.MeshStandardMaterial,
};
function mount(node, parent) {
  if (!node) return;
  if (Array.isArray(node)) return node.forEach((n) => mount(n, parent));
  const { args = [], children, ref, ...props } = node.props;
  const object = new constructors[node.type](...args);
  for (const [key, value] of Object.entries(props)) {
    if (["position", "rotation", "scale"].includes(key)) object[key].fromArray(value);
    else if (["visible", "name", "userData"].includes(key)) object[key] = value;
  }
  if (ref) ref.current = object;
  if (object.isMaterial) parent.material = object;
  else if (object.isBufferGeometry) parent.geometry = object;
  else parent.add(object);
  mount(children, object);
}
for (const explorer of [true, false]) {
  const file = explorer ? "toko-cung-explorer" : "base-avatar-v2";
  const bytes = await readFile(new URL(`../public/assets/characters/${file}.glb`, import.meta.url));
  const asset = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const rig = explorer ? createExplorerRig(asset.scene, []) : null;
  const scene = rig?.scene ?? asset.scene;
  const parent = new T.Group(),
    character = new T.Group();
  character.name = "CharacterVisual";
  parent.add(character);
  character.add(scene);
  if (explorer) scene.scale.setScalar(EXPLORER_SCALE);
  const layer = createSelfiePose(scene);
  const upper = scene.getObjectByName(explorer ? "RightArm" : "RightUpperArm");
  const left = scene.getObjectByName(explorer ? "LeftArm" : "LeftUpperArm");
  const upperBefore = upper.quaternion.clone(),
    leftBefore = left.quaternion.clone();
  layer.apply();
  assert(upper.quaternion.angleTo(upperBefore) > 0.5, `${file}: arm reaches forward`);
  assert(left.quaternion.angleTo(leftBefore) < 1e-6, "other arm stays in its original animation");
  mount(mod.exports.SelfieStick(), parent);
  const stick = parent.getObjectByName("SelfieStick");
  for (const heading of [0, 0.8, Math.PI]) {
    parent.position.set(12, 9, -4);
    parent.rotation.y = heading;
    for (const angle of [-1, 0, 1]) {
      sheet = "camera";
      mode = "selfie";
      yaw = angle;
      pitch = angle * 0.4;
      frame();
      assert(stick.visible);
      const palm = new T.Vector3();
      assert(readParachuteGrip(character, "Right", parent, palm));
      assert(palm.z > 0.2, `${file}: hand in front of torso`);
      assert(palm.y > 0.85 && palm.y < 1.5, `${file}: comfortable chest-height grip (${palm.y})`);
      assert(palm.distanceTo(stick.position) < 1e-6, "handle follows palm even when rotated");
      for (let i = 0; i < 8; i++) frame();
      assert(palm.distanceTo(stick.position) < 1e-6, "no accumulated transform drift");
      const tip = new T.Vector3(0, 1.19, 0).applyQuaternion(stick.quaternion).add(stick.position);
      assert(tip.z > palm.z + 0.8, "phone extends away from the character");
      assert(Math.abs(tip.x) > 0.3, "phone stays clear of the face");
    }
  }
  mode = "rear";
  frame();
  assert.equal(stick.visible, false);
  mode = "selfie";
  sheet = "phone";
  frame();
  assert.equal(stick.visible, false);
  layer.restore();
  assert(upper.quaternion.angleTo(upperBefore) < 1e-6, "close restores exact prior arm pose");
  // Restore must not clobber a new mixer pose or accumulate each frame.
  upper.rotation.set(0.3, 0.1, -0.2);
  const animated = upper.quaternion.clone();
  layer.apply();
  layer.apply();
  layer.restore();
  layer.restore();
  assert(upper.quaternion.angleTo(animated) < 1e-6);
  stick.traverse((object) => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
  rig?.dispose();
}
console.log(
  "PASS: selfie grip and phone clearance on both GLBs, heading/aim changes, no drift, rear/close hiding and exact pose restoration.",
);
