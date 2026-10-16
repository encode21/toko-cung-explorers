/** Inspect the actual GLBs, animation mixers and parachute component without WebGL. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import ts from "typescript";
import { createExplorerRig, EXPLORER_SCALE } from "../src/game/avatar/explorer-rig.ts";
import { createJumpClips } from "../src/game/avatar/jump-clips.ts";
import * as visual from "../src/game/obby/parachute-visual.ts";

const geometries = Array.from({ length: visual.CANOPY_CELLS }, (_, i) =>
  visual.createCanopyCell(i),
);
const bounds = new T.Box3();
for (const g of geometries) {
  g.computeBoundingBox();
  bounds.union(g.boundingBox);
  for (const attribute of Object.values(g.attributes))
    assert([...attribute.array].every(Number.isFinite));
  assert(g.getIndex().count < 1000, "Keep the canopy lightweight");
}
assert(bounds.max.x - bounds.min.x > 3.7, "Wide wing silhouette");
assert(bounds.max.z - bounds.min.z < 1.6, "Compact canopy depth");
assert(bounds.min.y > 2.6, "Canopy clears the raised arms and head");
const scratch = new T.Object3D(),
  direction = new T.Vector3();
const segmentMesh = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, 5), undefined, 1);
const matrix = new T.Matrix4();
for (const [a, b] of [
  [
    [1.4, 3, -0.6],
    [-0.4, 1.5, 0.3],
  ],
  [
    [-0.9, 3, 0.6],
    [-0.4, 1.5, 0.3],
  ],
  [
    [0, 0, 0],
    [0, -2, 0],
  ],
]) {
  const from = new T.Vector3(...a),
    to = new T.Vector3(...b);
  visual.setParachuteSegment(segmentMesh, 0, from, to, 0.008, 0.008, scratch, direction);
  segmentMesh.getMatrixAt(0, matrix);
  assert(new T.Vector3(0, -0.5, 0).applyMatrix4(matrix).distanceTo(from) < 1e-6);
  assert(
    new T.Vector3(0, 0.5, 0).applyMatrix4(matrix).distanceTo(to) < 1e-6,
    "Rotated cords terminate at their intended anchors",
  );
}

let frame;
const effects = [],
  imperative = [];
const jsx = (type, props) => ({ type, props });
const dependencies = {
  react: {
    forwardRef: (fn) => fn,
    useRef: (current) => ({ current }),
    useMemo: (fn) => fn(),
    useEffect: (fn) => effects.push(fn),
    useImperativeHandle: (ref, fn) =>
      imperative.push(() => {
        ref.current = fn();
      }),
  },
  three: T,
  "@react-three/fiber": {
    useFrame: (fn) => {
      frame = fn;
    },
  },
  "@/game/jsx/jsx-runtime": { jsx, jsxs: jsx },
  "./parachute-visual": visual,
};
const source = await readFile(
  new URL("../src/game/obby/ObbyParachute.tsx", import.meta.url),
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
  instancedMesh: T.InstancedMesh,
  cylinderGeometry: T.CylinderGeometry,
  boxGeometry: T.BoxGeometry,
  torusGeometry: T.TorusGeometry,
  meshStandardMaterial: T.MeshStandardMaterial,
};
function mount(node, parent) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((n) => mount(n, parent));
    return;
  }
  const { args = [], children, ref, ...props } = node.props;
  const object = new constructors[node.type](...args);
  for (const [key, value] of Object.entries(props)) {
    if (["position", "rotation", "scale"].includes(key)) object[key].fromArray(value);
    else if (["geometry", "visible", "frustumCulled", "name", "userData"].includes(key))
      object[key] = value;
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
  const scene = explorer ? createExplorerRig(asset.scene, []).scene : asset.scene;
  const parent = new T.Group(),
    character = new T.Group();
  character.name = "CharacterVisual";
  parent.add(character);
  character.add(scene);
  if (explorer) scene.scale.setScalar(EXPLORER_SCALE);
  const mixer = new T.AnimationMixer(scene);
  const clip = createJumpClips(explorer).find((c) => c.name === "Parachute");
  mixer.clipAction(clip).play();
  mixer.update(0.15);
  const ref = { current: null };
  mount(mod.exports.ObbyParachute({}, ref), parent);
  imperative.splice(0).forEach((fn) => fn());
  const cleanup = effects.splice(0).map((fn) => fn());
  const canopy = ref.current;
  canopy.visible = true;
  for (const yaw of [0, 0.8, Math.PI]) {
    parent.rotation.y = yaw;
    parent.position.set(25, 18, -13);
    frame();
    const handles = canopy.children.filter((o) => o.isGroup);
    const cords = canopy.children.find((o) => o.isInstancedMesh && o.count === 16);
    const straps = canopy.children.find((o) => o.isInstancedMesh && o.count === 7);
    for (const [i, side] of ["Left", "Right"].entries()) {
      const grip = new T.Vector3();
      assert(visual.readParachuteGrip(character, side, canopy, grip));
      assert(grip.y > 1.2 && grip.y < 1.65, `${file}: hands beside the head`);
      assert(
        Math.abs(grip.x) > 0.4 && Math.abs(grip.x) < 0.65,
        `${file}: elbows open, hands outside the face`,
      );
      assert(grip.z > 0.1, `${file}: wrists do not fold behind the body`);
      assert(
        handles[i].position.distanceTo(grip) < 1e-6,
        "Handle stays in the palm after heading changes",
      );
      straps.getMatrixAt(i * 3, matrix);
      assert(
        new T.Vector3(0, 0.5, 0).applyMatrix4(matrix).distanceTo(grip) < 1e-6,
        "Riser meets the hand exactly",
      );
      for (let line = 0; line < 8; line++) {
        cords.getMatrixAt(i * 8 + line, matrix);
        const top = new T.Vector3(0, -0.5, 0).applyMatrix4(matrix);
        assert(
          Math.sign(top.x) === Math.sign(grip.x),
          "Suspension fans must not cross the character",
        );
        assert(
          new T.Vector3(0, 0.5, 0)
            .applyMatrix4(matrix)
            .distanceTo(grip.clone().add(new T.Vector3(0, 0.22, 0))) < 1e-6,
        );
      }
    }
  }
  canopy.visible = false;
  frame();
  assert.equal(canopy.visible, false, "Landing keeps the visual hidden");
  cleanup.forEach((fn) => fn?.());
}
geometries.forEach((g) => g.dispose());
segmentMesh.geometry.dispose();
segmentMesh.material.dispose();
console.log(
  "PASS: closed wing geometry, exact cord/riser endpoints, palm grips and raised-arm poses on both actual avatar rigs, turning and hidden state",
);
