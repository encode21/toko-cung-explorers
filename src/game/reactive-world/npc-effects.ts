import {
  Frustum,
  Matrix4,
  Sphere,
  Vector3,
  type Camera,
  Raycaster,
  type Object3D,
  type Mesh,
  type Material,
} from "three";
import type { NpcConfig } from "@/game/npc/population";
const frustum = new Frustum(),
  matrix = new Matrix4(),
  sphere = new Sphere(new Vector3(), 1.6);
/** Conservative full-body visibility test, used only at spawn/exit anchors. */
export function outsideView(camera: Camera, position: readonly number[]) {
  matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(matrix);
  sphere.center.set(position[0]!, position[1]! + 1, position[2]!);
  return !frustum.intersectsSphere(sphere);
}
const occlusionRay = new Raycaster();
const eye = new Vector3(),
  sample = new Vector3(),
  direction = new Vector3();
/** A visible-frustum anchor can still be hidden by opaque building geometry. */
export function hiddenSpawn(camera: Camera, position: readonly number[], scene: Object3D) {
  if (outsideView(camera, position)) return true;
  camera.getWorldPosition(eye);
  // Require cover across the body, not just one ray behind a sign or another avatar.
  return [
    [0, 0.2],
    [0, 1],
    [0, 1.9],
    [-0.45, 1],
    [0.45, 1],
  ].every(([x, y]) => {
    sample.set(position[0]! + x!, position[1]! + y!, position[2]!);
    direction.subVectors(sample, eye);
    occlusionRay.set(eye, direction.normalize());
    occlusionRay.far = eye.distanceTo(sample) - 0.6;
    return occlusionRay.intersectObject(scene, true).some((hit) => {
      const mesh = hit.object as Mesh;
      if (!mesh.isMesh) return false;
      let parent: Object3D | null = mesh;
      while (parent) {
        if (
          !parent.visible ||
          parent.name.startsWith("npc-") ||
          parent.name.startsWith("reactive-") ||
          parent.name === "Player" ||
          parent.name === "AvatarV2Visual"
        )
          return false;
        parent = parent.parent;
      }
      const material = Array.isArray(mesh.material)
        ? mesh.material[hit.face?.materialIndex ?? 0]
        : mesh.material;
      return (
        !!material &&
        (material as Material).visible &&
        !material.transparent &&
        material.opacity >= 0.98 &&
        material.alphaTest === 0
      );
    });
  });
}
export const CUSTOMER_ENTRIES = [0, 3, 4, 5, 6, 7, 8, 9, -1, -2, -3] as const;
export function rushNpc(id: string, slot: number, warehouse = false, entry = 0): NpcConfig {
  const config: NpcConfig = {
    id,
    label: warehouse ? "Nakama · Bantuan Gudang" : "Pengunjung · Belanja",
    role: warehouse ? "nakama-gudang" : "pembeli",
    zone: warehouse ? "warehouse" : "retail",
    persona: warehouse
      ? "Membantu memeriksa stok saat aktivitas gudang meningkat."
      : "Sedang memilih kebutuhan sehari-hari lalu mengantre di kasir.",
    avatarId: warehouse ? "npc-nakama-warehouse" : `npc-shopper-${(slot % 3) + 1}`,
    seed: 401 + slot * 37,
    speed: warehouse ? 0.85 : 0.8,
    yaw: Math.PI,
    activity: "PickItem",
    carry: warehouse,
    // A one-way visit: separate entry/exit lanes at the existing door, away from kiosk.
    points: warehouse
      ? [
          [-0.7, 0, -24],
          [-0.7, 0, -21.2],
          [-0.7, 0, -18.2],
          [0.4, 0, -18.2],
          [0.4, 0, -21.2],
          [-0.7, 0, -24],
        ]
      : [
          [-0.65, 0, 8.5],
          [-0.65, 0, 4],
          [-1.2, 0, 1.8],
          [-1.2, 0, -2.2],
          [-1.2, 0, -5],
          [-1.2, 0, -10.4],
          [1.2, 0, -10.4],
          [1.2, 0, -5],
          [1.2, 0, -2.2],
          [3.3, 0, -2.2],
          [3.3, 0, 2.2],
          [0.65, 0, 2.2],
          [0.65, 0, 4],
          [0.65, 0, 8.5],
          [1.2, 0, 10],
          [1.2, 0, 13.3],
          [18, 0, 13.3],
        ],
  };
  const stops = warehouse ? [2] : [4, 7, 10];
  if (entry < 0 && !warehouse) {
    // The north sidewalk feeds the existing entrance; separate exit lane avoids head-on queues.
    const x = entry === -1 ? -8 : entry === -2 ? -14 : -22;
    config.points = [[x, 0, 14.1], [-1.2, 0, 14.1], [-1.2, 0, 8.5], ...config.points];
    config.workStops = stops.map((index) => index + 3);
  } else {
    config.workStops = stops.filter((index) => index >= entry).map((index) => index - entry);
    config.points = config.points.slice(entry);
  }
  return config;
}
