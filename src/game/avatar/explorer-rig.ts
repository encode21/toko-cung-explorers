import { buildWardrobe } from "./wardrobe-meshes.ts";
import { CROWN_HATS } from "../../identity/wardrobe.ts";
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { normalizeExplorer, type ExplorerAppearance } from "../../identity/explorer.ts";

export const EXPLORER_URL = "/assets/characters/toko-cung-explorer.glb";
export const EXPLORER_SCALE = 1.74 / 2.45;
/** Inspected GLB nodes, not material-based equipment guesses. */
export const ORIGINAL_EQUIPMENT = {
  "explorer-cap": ["CapCrown", "CapBrim", "Detail33", "Detail34"],
  "explorer-pack": ["Backpack", ...Array.from({ length: 9 }, (_, i) => `Detail${i + 11}`)],
};
const paletteAnchors = {
  pants: "Detail0",
  jacket: "Jacket",
  shirt: "Detail1",
  trim: "Detail2",
  skin: "Face",
  backpack: "Backpack",
  shoes: "Detail42",
  hair: "Detail21",
  eyes: "Detail22",
};
const templates = new WeakMap<T.Object3D, T.Object3D>();
/** Cache immutable geometry once. No per-instance disposal of cached geometry. */
function template(source: T.Object3D) {
  const cached = templates.get(source);
  if (cached) return cached;
  const root = source.clone(true);
  const materials = new Map<T.Material, T.Material>();
  for (const [key, node] of Object.entries(paletteAnchors)) {
    const m = (root.getObjectByName(node) as T.Mesh).material as T.MeshStandardMaterial;
    const copy = m.clone();
    copy.name = key;
    materials.set(m, copy);
  }
  root.traverse((o) => {
    if (o instanceof T.Mesh) o.material = materials.get(o.material as T.Material)!;
  });
  const head = root.getObjectByName("Head")!,
    body = root.getObjectByName("Body")!;
  const sockets: Record<string, T.Group> = {};
  for (const [slot, parent] of Object.entries({
    headwear: head,
    eyewear: head,
    audio: head,
    back: body,
    hair: head,
  })) {
    const socket = new T.Group();
    socket.name = `Socket_${slot}`;
    parent.add(socket);
    sockets[slot] = socket;
  }
  for (const [id, nodes] of Object.entries(ORIGINAL_EQUIPMENT)) {
    const g = new T.Group();
    g.name = id;
    sockets[id === "explorer-cap" ? "headwear" : "back"]!.add(g);
    for (const name of nodes) {
      const node = root.getObjectByName(name);
      if (!node) throw new Error(`Explorer manifest missing ${name}`);
      g.add(node);
    }
  }
  const mat = (name: string) => [...materials.values()].find((m) => m.name === name)!;
  function item(slot: string, id: string) {
    const g = new T.Group();
    g.name = id;
    sockets[slot]!.add(g);
    return g;
  }
  const generated = new Set<T.BufferGeometry>();
  function mesh(
    g: T.Group,
    geo: T.BufferGeometry,
    material: string,
    position: number[],
    scale = [1, 1, 1],
  ) {
    generated.add(geo);
    const m = new T.Mesh(geo, mat(material));
    m.position.fromArray(position);
    m.scale.fromArray(scale);
    g.add(m);
    return m;
  }
  const sphere = new T.SphereGeometry(1, 16, 10);
  const box = new T.BoxGeometry(1, 1, 1);
  // The supplied fringe intersects either crown; expose it only with no hat.
  const fringe = item("hair", "fringe");
  fringe.add(root.getObjectByName("Detail32")!);
  const scalp = item("hair", "scalp");
  mesh(
    scalp,
    new T.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.43),
    "hair",
    [0, 0.055, 0],
    [0.37, 0.405, 0.32],
  );
  mesh(scalp, sphere, "hair", [0, 0.085, -0.18], [0.33, 0.3, 0.15]);
  const cap = item("headwear", "baseball-cap");
  mesh(
    cap,
    new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    "jacket",
    [0, 0.235, -0.018],
    [0.385, 0.28, 0.33],
  );
  mesh(cap, sphere, "jacket", [0, 0.235, 0.29], [0.32, 0.035, 0.29]);
  mesh(cap, sphere, "trim", [0, 0.51, -0.018], [0.038, 0.025, 0.038]);
  for (const id of ["round-glasses", "sunglasses"]) {
    const glasses = item("eyewear", id);
    for (const s of [-1, 1]) {
      mesh(
        glasses,
        new T.TorusGeometry(0.093, 0.013, 6, 20),
        "shoes",
        [s * 0.13, 0.07, 0.329],
        [1, id === "sunglasses" ? 0.74 : 1, 1],
      );
      if (id === "sunglasses")
        mesh(
          glasses,
          new T.CircleGeometry(0.087, 20),
          "eyes",
          [s * 0.13, 0.07, 0.33],
          [1, 0.74, 1],
        );
      mesh(glasses, box, "shoes", [s * 0.257, 0.07, 0.19], [0.018, 0.018, 0.29]);
    }
    mesh(glasses, box, "shoes", [0, 0.07, 0.34], [0.08, 0.018, 0.018]);
  }
  const headphones = item("audio", "headphones");
  mesh(
    headphones,
    new T.TorusGeometry(0.375, 0.028, 6, 20, Math.PI),
    "shoes",
    [0, 0.07, -0.018],
    [1, 1.04, 1],
  );
  for (const s of [-1, 1]) {
    mesh(headphones, sphere, "shoes", [s * 0.398, 0.08, 0], [0.073, 0.13, 0.1]);
    mesh(headphones, sphere, "trim", [s * 0.44, 0.08, 0], [0.032, 0.09, 0.073]);
  }
  const pack = item("back", "urban-pack");
  mesh(pack, sphere, "backpack", [0, 1.32, -0.33], [0.27, 0.31, 0.18]);
  mesh(pack, sphere, "backpack", [0, 1.19, -0.48], [0.19, 0.13, 0.07]);
  mesh(pack, box, "trim", [0, 1.27, -0.526], [0.26, 0.015, 0.02]);
  for (const s of [-1, 1]) {
    const path = new T.CatmullRomCurve3([
      new T.Vector3(s * 0.23, 1.53, -0.24),
      new T.Vector3(s * 0.27, 1.61, 0),
      new T.Vector3(s * 0.275, 1.38, 0.26),
      new T.Vector3(s * 0.23, 1.08, 0.18),
      new T.Vector3(s * 0.23, 1.08, -0.22),
    ]);
    mesh(pack, new T.TubeGeometry(path, 12, 0.032, 5, false), "backpack", [0, 0, 0]);
  }
  // Merge only siblings with the same semantic palette, never across animated pivots/items.
  // Soles retain their original fixed dark color rather than changing with hair.
  const sole = mat("hair").clone();
  sole.name = "sole";
  for (const name of ["Detail43", "Detail56"])
    (root.getObjectByName(name) as T.Mesh).material = sole;
  buildWardrobe(root, mat, generated);
  const parents: T.Object3D[] = [];
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) parents.push(o);
  });
  for (const parent of parents) {
    const buckets = new Map<T.Material, T.Mesh[]>();
    for (const child of parent.children)
      if (child instanceof T.Mesh) {
        const material = child.material as T.Material;
        const list = buckets.get(material) ?? [];
        list.push(child);
        buckets.set(material, list);
      }
    for (const [material, meshes] of buckets) {
      const geometries = meshes.map((m) => {
        m.updateMatrix();
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        return g.applyMatrix4(m.matrix);
      });
      const geometry = mergeGeometries(geometries)!;
      geometries.forEach((g) => g.dispose());
      const merged = new T.Mesh(geometry, material);
      merged.name = `${parent.name}_${material.name}`;
      merged.castShadow = true;
      merged.receiveShadow = false;
      parent.remove(...meshes);
      parent.add(merged);
    }
  }
  generated.forEach((g) => g.dispose()); // Generated sources were baked into cached merged geometry.
  templates.set(source, root);
  return root;
}
export function createExplorerRig(source: T.Object3D, clips: T.AnimationClip[]) {
  const scene = template(source).clone(true);
  const materials = new Map<string, T.MeshStandardMaterial>();
  scene.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const original = o.material as T.MeshStandardMaterial;
    if (!materials.has(original.name)) materials.set(original.name, original.clone());
    o.material = materials.get(original.name)!;
  });
  const mixer = new T.AnimationMixer(scene);
  const actions = new Map(clips.map((clip) => [clip.name, mixer.clipAction(clip)]));
  function apply(raw: ExplorerAppearance, silhouette = false) {
    const config = normalizeExplorer(raw);
    for (const [name, material] of materials) {
      material.userData["originalColor"] ??= material.color.getHex();
      material.color.set(
        silhouette
          ? "#131b24"
          : (config.colors[name as keyof typeof config.colors] ??
              material.userData["originalColor"]),
      );
    }
    scene.getObjectByName("fringe")!.visible = !CROWN_HATS.includes(config.headwear);
    scene.traverse((o) => {
      const slot = o.userData["wardrobeSlot"] as "top" | "bottom" | "footwear" | undefined;
      if (slot)
        o.visible =
          o.userData["wardrobeId"] === config[slot] &&
          (!o.userData["builtinNeck"] || config.neck === "none");
    });
    for (const slot of [
      "headwear",
      "hairDecoration",
      "eyewear",
      "audio",
      "neck",
      "back",
    ] as const) {
      const socket = scene.getObjectByName(`Socket_${slot}`)!;
      socket.children.forEach((item) => {
        item.visible = item.name === config[slot];
      });
    }
  }
  return {
    scene,
    mixer,
    actions,
    materials,
    apply,
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      materials.forEach((m) => m.dispose());
    },
  };
}
