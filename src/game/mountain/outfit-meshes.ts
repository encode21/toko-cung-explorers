import * as T from "three";
import { MOUNTAIN_OUTFITS, type MountainOutfitId } from "./outfits";

/** Hand-authored safari accessories are attached to the existing animated head and torso. */
export function attachMountainOutfit(
  scene: T.Object3D,
  outfit: MountainOutfitId | null | undefined,
  explorer = false,
) {
  const preset = MOUNTAIN_OUTFITS.find((p) => p.id === outfit);
  if (!preset) return;
  const head = scene.getObjectByName("Head"),
    torso = scene.getObjectByName(explorer ? "Body" : "Chest");
  if (!head || !torso) return;
  const scale = explorer ? 2.45 / 1.74 : 1;
  const hat = createOutfitHat(preset.id);
  hat.name = "MountainOutfitHat";
  hat.scale.setScalar(scale);
  hat.position.y = 0.275 * scale;
  head.add(hat);
  const gear = createOutfitVest(preset.id);
  gear.name = "MountainOutfitVest";
  gear.scale.setScalar(scale);
  gear.position.y = explorer ? 1.3 : -0.045;
  torso.add(gear);
  return () => {
    disposeOutfit(hat);
    disposeOutfit(gear);
  };
}
function part(
  group: T.Group,
  geometry: T.BufferGeometry,
  color: string,
  p: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
) {
  const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color, roughness: 0.92 }));
  mesh.position.fromArray(p);
  mesh.scale.fromArray(scale);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
export function createOutfitHat(id: MountainOutfitId) {
  const preset = MOUNTAIN_OUTFITS.find((p) => p.id === id)!;
  const group = new T.Group();
  part(group, new T.CylinderGeometry(0.37, 0.39, 0.035, 20), preset.hat, [0, 0, 0], [1, 1, 0.86]);
  part(
    group,
    new T.CylinderGeometry(0.22, 0.26, 0.19, 16),
    preset.hat,
    [0, 0.1, -0.025],
    [1, 1, 0.9],
  );
  part(
    group,
    new T.CylinderGeometry(0.255, 0.265, 0.045, 16),
    preset.trim,
    [0, 0.037, -0.025],
    [1, 1, 0.9],
  );
  if (preset.goggles) {
    for (const side of [-1, 1]) {
      const rim = part(group, new T.TorusGeometry(0.065, 0.013, 5, 12), "#2d2923", [
        side * 0.083,
        0.1,
        0.21,
      ]);
      rim.rotation.x = -0.22;
      const glass = part(group, new T.CircleGeometry(0.057, 12), "#6f8c8c", [
        side * 0.083,
        0.1,
        0.222,
      ]);
      glass.rotation.x = -0.22;
    }
    part(group, new T.BoxGeometry(0.045, 0.018, 0.024), preset.trim, [0, 0.1, 0.22]);
  }
  if (id === "ranger") {
    for (const side of [-1, 1]) {
      const cord = part(group, new T.CylinderGeometry(0.006, 0.006, 0.35, 5), "#4b422d", [
        side * 0.15,
        -0.16,
        0.015,
      ]);
      cord.rotation.z = side * 0.32;
    }
  }
  return group;
}
export function createOutfitVest(id: MountainOutfitId) {
  const p = MOUNTAIN_OUTFITS.find((o) => o.id === id)!;
  const g = new T.Group();
  for (const side of [-1, 1]) {
    part(g, new T.BoxGeometry(0.13, 0.16, 0.05), p.trim, [side * 0.145, -0.09, 0.155]);
    part(g, new T.BoxGeometry(0.13, 0.035, 0.058), p.jacket, [side * 0.145, 0.005, 0.159]);
    part(g, new T.BoxGeometry(0.035, 0.43, 0.027), "#493d2b", [side * 0.19, 0.035, 0.16]);
    part(g, new T.BoxGeometry(0.045, 0.042, 0.038), "#b8a276", [side * 0.19, -0.04, 0.174]);
  }
  part(g, new T.BoxGeometry(0.43, 0.045, 0.32), "#51412c", [0, -0.21, 0]);
  part(g, new T.BoxGeometry(0.065, 0.055, 0.022), "#c1ac72", [0, -0.21, 0.173]);
  part(g, new T.BoxGeometry(0.32, 0.39, 0.18), p.pack, [0, 0.02, -0.235]);
  part(g, new T.BoxGeometry(0.35, 0.08, 0.2), p.trim, [0, 0.23, -0.235]);
  for (const side of [-1, 1])
    part(g, new T.BoxGeometry(0.036, 0.42, 0.018), "#4b422d", [side * 0.105, 0.015, -0.334]);
  if (id === "ranger")
    part(g, new T.CylinderGeometry(0.065, 0.065, 0.38, 10), "#9b9464", [0.225, 0.02, -0.22]);
  return g;
}
export function disposeOutfit(object: T.Object3D) {
  object.removeFromParent();
  object.traverse((part) => {
    if (part instanceof T.Mesh) {
      part.geometry.dispose();
      (part.material as T.Material).dispose();
    }
  });
}
