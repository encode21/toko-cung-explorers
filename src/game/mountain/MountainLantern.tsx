/** @jsxImportSource @/game/jsx */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { MountainPoint } from "./model";

const metal = new THREE.MeshStandardMaterial({
  color: "#242923",
  roughness: 0.78,
  metalness: 0.35,
});
const amber = new THREE.MeshStandardMaterial({
  color: "#ffd991",
  emissive: "#ffb749",
  emissiveIntensity: 0.8,
  roughness: 0.45,
  toneMapped: false,
  side: THREE.DoubleSide,
});
const litAmber = amber.clone();
litAmber.emissiveIntensity = 1.1;

function lanternFrame() {
  const parts: THREE.BufferGeometry[] = [];
  const add = (geometry: THREE.BufferGeometry, x: number, y: number, z: number, yaw = 0) => {
    geometry.rotateY(yaw).translate(x, y, z);
    parts.push(geometry);
  };
  add(new THREE.CylinderGeometry(0.2, 0.24, 0.18, 8), 0, 0.09, 0);
  add(new THREE.CylinderGeometry(0.1, 0.14, 0.3, 8), 0, 0.29, 0);
  add(new THREE.CylinderGeometry(0.055, 0.075, 1.96, 8), 0, 1.4, 0);
  add(new THREE.CylinderGeometry(0.14, 0.09, 0.13, 8), 0, 2.28, 0);
  add(new THREE.BoxGeometry(0.46, 0.08, 0.46), 0, 2.33, 0);
  add(new THREE.BoxGeometry(0.65, 0.075, 0.65), 0, 2.95, 0);
  add(new THREE.ConeGeometry(0.51, 0.27, 4), 0, 3.1, 0, Math.PI / 4);
  add(new THREE.CylinderGeometry(0.035, 0.05, 0.15, 8), 0, 3.29, 0);
  add(new THREE.SphereGeometry(0.073, 8, 6), 0, 3.38, 0);
  const up = new THREE.Vector3(0, 1, 0);
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const a = new THREE.Vector3(x * 0.205, 2.36, z * 0.205);
      const b = new THREE.Vector3(x * 0.285, 2.93, z * 0.285);
      const direction = b.clone().sub(a);
      const rail = new THREE.CylinderGeometry(0.022, 0.022, direction.length(), 5);
      rail.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()));
      rail.translate(...a.add(b).multiplyScalar(0.5).toArray());
      parts.push(rail);
    }
  const frame = mergeGeometries(parts)!;
  parts.forEach((geometry) => geometry.dispose());
  return frame;
}
const frame = lanternFrame();
const glass = new THREE.CylinderGeometry(0.405, 0.29, 0.57, 4, 1, true);
glass.rotateY(Math.PI / 4).translate(0, 2.645, 0);

/** Two shared draws per lamp: tapered amber panes, iron ribs, pitched roof and finial. */
export function MountainLantern({
  position,
  active = false,
}: {
  position: MountainPoint;
  active?: boolean;
}) {
  return (
    <group
      name="MountainLantern"
      position={[...position]}
      dispose={null}
      userData={{ ignoreCameraCollision: true }}
    >
      <mesh geometry={frame} material={metal} castShadow receiveShadow />
      <mesh geometry={glass} material={active ? litAmber : amber} />
    </group>
  );
}
