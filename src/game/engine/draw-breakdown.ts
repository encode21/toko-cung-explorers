import * as T from "three";

export interface DrawGroup {
  name: string;
  calls: number;
  tris: number;
}

// Wrapper groups that would otherwise swallow everything under one key.
const CONTAINERS = new Set(["", "CityLocation", "MountainLocation", "Scene"]);

function groupName(o: T.Object3D): string {
  let name = "";
  for (let p = o.parent; p; p = p.parent) if (!CONTAINERS.has(p.name)) name = p.name;
  return name || o.name || "(tanpa nama)";
}

function chainVisible(o: T.Object3D) {
  for (let p: T.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

/**
 * Approximate draw calls per top-level named group for what the camera can see right now
 * (frustum test, hidden parents skipped). Diagnostics only — run every few seconds, not per frame.
 */
export function drawBreakdown(scene: T.Object3D, camera: T.Camera, top = 5): DrawGroup[] {
  camera.updateMatrixWorld();
  const frustum = new T.Frustum().setFromProjectionMatrix(
    new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
  const groups = new Map<string, DrawGroup>();
  scene.traverse((o) => {
    const mesh = o as T.Mesh;
    if (!mesh.isMesh || !chainVisible(mesh)) return;
    if ((mesh as T.InstancedMesh).isInstancedMesh && (mesh as T.InstancedMesh).count === 0) return;
    if (mesh.frustumCulled) {
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      if (!frustum.intersectsObject(mesh)) return;
    }
    const index = mesh.geometry.index;
    const tris = (index ? index.count : (mesh.geometry.getAttribute("position")?.count ?? 0)) / 3;
    const calls = Array.isArray(mesh.material) ? mesh.material.length : 1;
    const key = groupName(mesh);
    const g = groups.get(key) ?? { name: key, calls: 0, tris: 0 };
    g.calls += calls;
    g.tris +=
      tris * ((mesh as T.InstancedMesh).isInstancedMesh ? (mesh as T.InstancedMesh).count : 1);
    groups.set(key, g);
  });
  return [...groups.values()].sort((a, b) => b.calls - a.calls).slice(0, top);
}
