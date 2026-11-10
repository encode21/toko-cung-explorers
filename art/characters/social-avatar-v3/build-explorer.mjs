/** Build the full V3 character/wardrobe and bake gameplay clips for its new proportions. */
import { customizeHead, customizeBody } from "./customization.mjs";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { createExplorerRig } from "../../../src/game/avatar/explorer-rig.ts";
import { explorerClips } from "../../../src/game/avatar/explorer-clips.ts";
import { DEFAULT_EXPLORER } from "../../../src/identity/explorer.ts";
import { sculptFullBody, retargetBodyClips } from "./full-body.mjs";

const directory = new URL("../../../public/assets/characters/", import.meta.url);
async function load(name) {
  const bytes = await readFile(new URL(name + ".glb", directory));
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
}
const [explorer, social, base] = await Promise.all([
  load("toko-cung-explorer"),
  load("social-avatar-v3"),
  load("base-avatar-v2"),
]);
const head = explorer.scene.getObjectByName("Head");
const originalSkin = explorer.scene.getObjectByName("Face").material;
const originalEyes = explorer.scene.getObjectByName("Detail22").material;
const headFit = new T.Matrix4().makeScale(1.4, 1.4, 1.4);
headFit.setPosition(0, 0.075 - 1.408 * 1.4, 0);

// Extract only fully head-bound triangles: the source Skin also contains body/limbs.
function extract(mesh, accept) {
  const source = mesh.geometry.toNonIndexed();
  const positions = [],
    normals = [],
    uvs = [];
  for (let i = 0; i < source.attributes.position.count; i += 3) {
    if (![i, i + 1, i + 2].every((v) => accept(source, v))) continue;
    for (let v = i; v < i + 3; v++) {
      positions.push(
        ...new T.Vector3().fromBufferAttribute(source.attributes.position, v).toArray(),
      );
      normals.push(...new T.Vector3().fromBufferAttribute(source.attributes.normal, v).toArray());
      // Untextured V3 curves have no UVs; wardrobe batching still needs the attribute.
      uvs.push(source.attributes.uv?.getX(v) ?? 0, source.attributes.uv?.getY(v) ?? 0);
    }
  }
  source.dispose();
  assert(positions.length, `Missing V3 geometry: ${mesh.name}`);
  const geometry = new T.BufferGeometry()
    .setAttribute("position", new T.Float32BufferAttribute(positions, 3))
    .setAttribute("normal", new T.Float32BufferAttribute(normals, 3))
    .setAttribute("uv", new T.Float32BufferAttribute(uvs, 2))
    .applyMatrix4(headFit);
  const indexed = mergeVertices(geometry);
  geometry.dispose();
  return indexed;
}
for (const name of ["Face", ...[20, 22, 23, 25, 27, 28, 30, 31].map((n) => `Detail${n}`)])
  explorer.scene.getObjectByName(name).removeFromParent();

for (const name of [
  "V3_Skin",
  "V3_Catchlight",
  "V3_Cheeks",
  "V3_Ear_inset",
  "V3_Eye_whites",
  "V3_Iris",
  "V3_Lash_and_brow",
  "V3_Pupil",
  "V3_Smile",
]) {
  const source = social.scene.getObjectByName(name);
  const headIndex = source.skeleton.bones.findIndex((bone) => bone.name === "Head");
  const geometry = extract(source, (g, v) => {
    for (let k = 0; k < 4; k++)
      if (
        g.attributes.skinIndex.getComponent(v, k) === headIndex &&
        g.attributes.skinWeight.getComponent(v, k) > 0.999
      )
        return true;
    return false;
  });
  const material =
    name === "V3_Skin"
      ? originalSkin
      : name === "V3_Pupil"
        ? originalEyes
        : source.material.clone();
  if (name !== "V3_Skin" && name !== "V3_Pupil") material.name = name;
  const mesh = new T.Mesh(geometry, material);
  mesh.name = name === "V3_Skin" ? "Face" : name === "V3_Pupil" ? "Detail22" : name;
  head.add(mesh);
}
// Keep the short Explorer hair/brows so the V3 bob cannot clip through equipped hats.
explorer.scene.getObjectByName("Explorer").userData["avatarVisual"] = "social-avatar-v3-explorer";

const clips = explorerClips(explorer.animations, base.animations);
const rig = createExplorerRig(explorer.scene, clips);
rig.apply(DEFAULT_EXPLORER);
rig.scene.getObjectByName("DrinkCup").removeFromParent();
const before = rig.scene.clone(true);
sculptFullBody(rig, social.scene);
const animations = retargetBodyClips(before, rig.scene, clips);
customizeHead(rig.scene, rig.materials);
customizeBody(rig.scene);

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const binary = await new GLTFExporter().parseAsync(rig.scene, {
  binary: true,
  animations,
  onlyVisible: false,
});
await writeFile(new URL("social-avatar-v3-customizable.glb", directory), Buffer.from(binary));
console.log(
  `Full-body V3: ${binary.byteLength} bytes; ${animations.length} retargeted clips and complete wardrobe`,
);
