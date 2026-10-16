import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { AvatarConfig } from "@/identity/avatar";

/** Bone-local garments shared by the NPC in the world and its dialogue portrait. */
export function attachMascotDetails(scene: T.Group, avatar: AvatarConfig) {
  const meshes: T.Mesh[] = [];
  const geometries: T.BufferGeometry[] = [];
  const materials: T.MeshStandardMaterial[] = [];
  if (!avatar.mascot) return () => {};
  const material = (color: string, metalness = 0) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.65, metalness });
    materials.push(m);
    return m;
  };
  const cloth = material(avatar.outfitColor);
  const trim = material(avatar.mascot === "ko-asu" ? "#e8bd69" : "#f5eddd");
  const ink = material("#171c25");
  const gold = material("#cba565", 0.45);
  const box = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);
  geometries.push(box);
  const part = (
    bone: string,
    geometry: T.BufferGeometry,
    mat: T.Material,
    position: [number, number, number],
    scale: [number, number, number],
  ) => {
    const m = new T.Mesh(geometry, mat);
    m.position.set(...position);
    m.scale.set(...scale);
    m.castShadow = true;
    scene.getObjectByName(bone)?.add(m);
    meshes.push(m);
    return m;
  };
  // Mandarin collar, contrasting edge, asymmetric front and frog fastenings.
  part("Neck", box, trim, [0, 0.005, 0], [0.205, 0.095, 0.19]);
  part("Neck", box, cloth, [0, 0.002, 0.008], [0.21, 0.073, 0.19]);
  part("Chest", box, trim, [0.085, -0.04, 0.142], [0.012, 0.3, 0.014]);
  for (const y of [0.09, 0.015, -0.06, -0.135]) {
    part("Chest", box, trim, [0.065, y, 0.15], [0.084, 0.014, 0.02]);
    part("Chest", box, trim, [0.067, y, 0.165], [0.022, 0.027, 0.014]);
  }
  for (const side of ["Left", "Right"]) {
    part(`${side}UpperArm`, box, cloth, [0, -0.16, 0], [0.153, 0.2, 0.18]);
    part(`${side}LowerArm`, box, cloth, [0, -0.07, 0], [0.147, 0.2, 0.17]);
    part(`${side}LowerArm`, box, trim, [0, -0.155, 0], [0.155, 0.085, 0.18]);
  }
  if (avatar.mascot === "koko-cung") {
    const lens = new T.CircleGeometry(0.052, 24);
    const rim = new T.TorusGeometry(0.053, 0.006, 6, 24);
    geometries.push(lens, rim);
    for (const sign of [-1, 1]) {
      part("Head", lens, ink, [sign * 0.078, 0.183, 0.185], [1, 1, 1]);
      part("Head", rim, gold, [sign * 0.078, 0.183, 0.186], [1, 1, 1]);
      part("Head", box, gold, [sign * 0.139, 0.183, 0.08], [0.009, 0.012, 0.21]);
    }
    part("Head", box, gold, [0, 0.183, 0.187], [0.05, 0.009, 0.01]);
  } else {
    // The light blue mask is a recognizable detail from Ko Asu's reference.
    const mask = material("#a7cedf");
    part("Head", box, mask, [0, 0.105, 0.18], [0.24, 0.105, 0.055]);
    for (const y of [0.08, 0.105, 0.13])
      part("Head", box, trim, [0, y, 0.21], [0.19, 0.003, 0.003]);
  }
  return () => {
    meshes.forEach((m) => m.removeFromParent());
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  };
}
