import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";

// Standalone art validation; the new rig is not a drop-in replacement for V2.
const assetUrl = new URL("../public/assets/characters/social-avatar-v3.glb", import.meta.url);
const bytes = await readFile(assetUrl);
assert.equal(bytes.readUInt32LE(0), 0x46546c67, "Asset must be binary glTF");
assert.equal(bytes.readUInt32LE(4), 2, "Asset must use glTF 2");
assert.equal(bytes.readUInt32LE(8), bytes.length, "GLB byte length must match its header");
assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, "First GLB chunk must contain JSON");
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString("utf8"));
assert.equal(json.cameras?.length ?? 0, 0, "Export must omit studio cameras");
assert.equal(
  json.extensions?.KHR_lights_punctual?.lights?.length ?? 0,
  0,
  "Export must omit studio lights",
);
assert.ok(!json.buffers?.some((buffer) => buffer.uri), "Geometry must be embedded in the GLB");
assert.ok(!json.images?.some((image) => image.uri), "Textures must be embedded in the GLB");

const asset = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
asset.scene.updateMatrixWorld(true);
const boneNames = ["Root", "Hips", "Spine", "Chest", "Neck", "Head"];
for (const side of ["Left", "Right"])
  for (const joint of ["Shoulder", "UpperArm", "LowerArm", "Hand", "UpperLeg", "LowerLeg", "Foot"])
    boneNames.push(`${side}${joint}`);

const bones = [];
const meshes = [];
const materials = new Set();
let vertices = 0;
let triangles = 0;
let meshesWithUvs = 0;
asset.scene.traverse((node) => {
  const label = node.name || node.type;
  assert.ok(node.matrixWorld.elements.every(Number.isFinite), `${label}: finite transform`);
  assert.ok(!node.isCamera && !node.isLight, `${label}: no studio camera or light`);
  assert.ok(
    !/(?:^|[_ .-])(stage|ground|floor|plinth|pedestal|backdrop|cyclorama)(?:$|[_ .-])/i.test(label),
    `${label}: staging geometry must remain in the Blender project`,
  );
  if (node.isBone) bones.push(node);
  if (!node.isMesh) return;
  meshes.push(node);
  for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
    materials.add(material.name || material.type);
    if (material.color)
      assert.ok(material.color.toArray().every(Number.isFinite), `${label}: finite material color`);
  }
  const geometry = node.geometry;
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  assert.ok(position?.count > 0, `${label}: nonempty positions`);
  assert.equal(position.itemSize, 3, `${label}: position vectors`);
  assert.equal(normal?.count, position.count, `${label}: one normal per vertex`);
  assert.equal(normal.itemSize, 3, `${label}: normal vectors`);
  vertices += position.count;
  if (geometry.getAttribute("uv")) meshesWithUvs++;
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    for (let i = 0; i < attribute.count; i++)
      for (let component = 0; component < attribute.itemSize; component++)
        assert.ok(
          Number.isFinite(attribute.getComponent(i, component)),
          `${label}: finite ${name}[${i}][${component}]`,
        );
  }
  for (let i = 0; i < normal.count; i++) {
    const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
    assert.ok(Math.abs(length - 1) < 0.025, `${label}: unit normal at vertex ${i}`);
  }
  const index = geometry.getIndex();
  const elements = index?.count ?? position.count;
  assert.equal(elements % 3, 0, `${label}: complete triangles`);
  triangles += elements / 3;
  if (index)
    for (let i = 0; i < index.count; i++) {
      const value = index.getX(i);
      assert.ok(
        Number.isInteger(value) && value >= 0 && value < position.count,
        `${label}: valid index`,
      );
    }
  if (!node.isSkinnedMesh) return;
  const weight = geometry.getAttribute("skinWeight");
  const joint = geometry.getAttribute("skinIndex");
  assert.equal(weight?.count, position.count, `${label}: weights for every vertex`);
  assert.equal(joint?.count, position.count, `${label}: joints for every vertex`);
  assert.equal(weight.itemSize, 4, `${label}: four skin weight slots`);
  assert.equal(joint.itemSize, 4, `${label}: four skin joint slots`);
  assert.ok(node.skeleton.bones.length > 0, `${label}: nonempty skin palette`);
  for (const inverse of node.skeleton.boneInverses)
    assert.ok(inverse.elements.every(Number.isFinite), `${label}: finite inverse bind matrix`);
  for (let i = 0; i < position.count; i++) {
    let total = 0;
    for (let component = 0; component < 4; component++) {
      const w = weight.getComponent(i, component);
      const j = joint.getComponent(i, component);
      assert.ok(w >= 0 && w <= 1 + 1e-5, `${label}: weight in [0,1] at vertex ${i}`);
      assert.ok(
        Number.isInteger(j) && j >= 0 && j < node.skeleton.bones.length,
        `${label}: skin joint references palette at vertex ${i}`,
      );
      total += w;
    }
    assert.ok(Math.abs(total - 1) < 1e-4, `${label}: normalized weights at vertex ${i}`);
  }
});
assert.ok(meshes.length > 0, "Export contains character meshes");
assert.ok(
  meshes.some((mesh) => mesh.isSkinnedMesh),
  "Export contains skinned geometry",
);
for (const name of boneNames)
  assert.equal(bones.filter((bone) => bone.name === name).length, 1, `Exactly one ${name} joint`);
assert.equal(new Set(bones.map((bone) => bone.name)).size, bones.length, "Joint names are unique");

function deformedBounds(scene) {
  scene.updateMatrixWorld(true);
  const bounds = new T.Box3();
  const vertex = new T.Vector3();
  scene.traverse((node) => {
    if (!node.isMesh) return;
    const position = node.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      node.getVertexPosition(i, vertex);
      vertex.applyMatrix4(node.matrixWorld);
      assert.ok(
        vertex.toArray().every(Number.isFinite),
        `${node.name}: finite deformed vertex ${i}`,
      );
      bounds.expandByPoint(vertex);
    }
  });
  assert.ok(!bounds.isEmpty(), "Character has nonempty deformed bounds");
  return bounds;
}

const restBounds = deformedBounds(asset.scene);
const restSize = restBounds.getSize(new T.Vector3());
assert.ok(restSize.y >= 1.7 && restSize.y <= 1.85, `Metre-scale height: ${restSize.y}`);
assert.ok(Math.abs(restBounds.min.y) <= 0.035, `Soles at origin: ${restBounds.min.y}`);
assert.ok(restSize.x > 0.2 && restSize.x < 1.5, `Plausible character width: ${restSize.x}`);
assert.ok(restSize.z > 0.1 && restSize.z < 1, `Plausible character depth: ${restSize.z}`);
for (const name of ["Idle", "Wave"])
  assert.equal(
    asset.animations.filter((clip) => clip.name === name).length,
    1,
    `Exactly one ${name} clip`,
  );

const animationStats = [];
for (const clip of asset.animations) {
  assert.ok(Number.isFinite(clip.duration) && clip.duration > 0, `${clip.name}: positive duration`);
  assert.ok(clip.tracks.length > 0, `${clip.name}: contains animation channels`);
  assert.ok(clip.validate(), `${clip.name}: valid keyframe data`);
  for (const track of clip.tracks) {
    assert.ok([...track.values].every(Number.isFinite), `${clip.name}: finite channel values`);
    assert.ok([...track.times].every(Number.isFinite), `${clip.name}: finite channel times`);
  }
  const instance = clone(asset.scene);
  instance.updateMatrixWorld(true);
  const root = instance.getObjectByName("Root");
  const rootPosition = root.getWorldPosition(new T.Vector3());
  const rootRotation = root.getWorldQuaternion(new T.Quaternion());
  const rootScale = root.getWorldScale(new T.Vector3());
  const mixer = new T.AnimationMixer(instance);
  const action = mixer.clipAction(clip).setLoop(T.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const envelope = new T.Box3();
  let maxRootDrift = 0;
  for (const fraction of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]) {
    mixer.setTime(clip.duration * fraction);
    instance.updateMatrixWorld(true);
    instance.traverse((node) => {
      assert.ok(
        node.matrixWorld.elements.every(Number.isFinite),
        `${clip.name}: finite animated transforms`,
      );
    });
    const drift = root.getWorldPosition(new T.Vector3()).distanceTo(rootPosition);
    maxRootDrift = Math.max(maxRootDrift, drift);
    assert.ok(drift < 1e-4, `${clip.name}: Root remains planted (${drift})`);
    assert.ok(
      root.getWorldQuaternion(new T.Quaternion()).angleTo(rootRotation) < 1e-4,
      `${clip.name}: no Root rotation`,
    );
    assert.ok(
      root.getWorldScale(new T.Vector3()).distanceTo(rootScale) < 1e-4,
      `${clip.name}: no Root scale animation`,
    );
    const bounds = deformedBounds(instance);
    const size = bounds.getSize(new T.Vector3());
    assert.ok(
      bounds.min.y > -0.15 && bounds.max.y < 2.6,
      `${clip.name}: plausible vertical deformation`,
    );
    assert.ok(size.y > restSize.y * 0.6, `${clip.name}: no collapsed body`);
    assert.ok(size.x < 2.5 && size.z < 1.8, `${clip.name}: no exploded lateral deformation`);
    envelope.union(bounds);
  }
  animationStats.push({
    name: clip.name,
    durationSeconds: clip.duration,
    channels: clip.tracks.length,
    samples: 9,
    maxRootDrift,
    bounds: { min: envelope.min.toArray(), max: envelope.max.toArray() },
  });
  mixer.stopAllAction();
  mixer.uncacheRoot(instance);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      file: assetUrl.pathname,
      bytes: bytes.length,
      meshes: meshes.length,
      skinnedMeshes: meshes.filter((mesh) => mesh.isSkinnedMesh).length,
      vertices,
      triangles,
      meshesWithUvs,
      bones: bones.map((bone) => bone.name),
      materials: [...materials],
      restBounds: {
        min: restBounds.min.toArray(),
        max: restBounds.max.toArray(),
        size: restSize.toArray(),
      },
      animations: animationStats,
    },
    null,
    2,
  ),
);
