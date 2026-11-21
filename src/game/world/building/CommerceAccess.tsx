/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useRef } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { OutdoorBatch, type OutdoorPart } from "../OutdoorBatch";
import { FLOORS, LIFT, WORLD_POINTS } from "./plan";

const staticParts: OutdoorPart[] = (() => {
  const out: OutdoorPart[] = [
    // LiftCore
    { p: [LIFT[0], LIFT[1] + 1.5, LIFT[2]], s: [2.5, 3, 2], color: "#59656b" },
    { p: [LIFT[0], LIFT[1] + 1.25, LIFT[2] + 1.02], s: [1.8, 2.4, 0.04], color: "#abb8bd" },
    { p: [LIFT[0], LIFT[1] + 1.25, LIFT[2] + 1.05], s: [0.035, 2.4, 0.02], color: "#3e4d54" },
    // FloorDirectory
    { p: [2.7, 1.2, 5], s: [1.65, 1.8, 0.15], color: "#33494f" },
    { p: [2.7, 0.2, 5], s: [0.18, 0.4, 0.18], color: "#33494f" },
  ];
  for (const x of [-6, 6]) {
    for (const side of [-1, 1])
      out.push({ p: [x + side * 1.5, 0.09, -26], s: [0.08, 0.02, 4], color: "#efc35a" });
    out.push({ p: [x, 0.09, -24], s: [3, 0.02, 0.08], color: "#efc35a" });
  }
  for (let z = -27.5; z < -22; z += 0.7)
    out.push({ p: [0, 0.095, z], s: [2.6, 0.02, 0.2], color: "#e8d5a2" });
  return out;
})();

const markerGeo = new THREE.RingGeometry(0.36, 0.44, 16);
const floorSummary = FLOORS.map((f) => f.label).join("\n");

export function CommerceAccess() {
  const markersRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = markersRef.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    WORLD_POINTS.forEach((point, i) => {
      o.position.set(point.position[0], 0.11, point.position[2]);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  return (
    <group name="CommerceAccess">
      <OutdoorBatch items={staticParts} shadows={false} />
      <group name="LiftCore" position={LIFT}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[1.25, 1.5, 1]} position={[0, 1.5, 0]} />
        </RigidBody>
        <Text position={[0, 2.7, 1.06]} fontSize={0.15} color="#ffffff">
          LIFT · 02 / 03
        </Text>
        <Text position={[0, 1.65, 1.06]} fontSize={0.12} color="#283b42">
          SEGERA HADIR
        </Text>
      </group>
      <group position={[2.7, 0, 5]} name="FloorDirectory">
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.825, 1.05, 0.075]} position={[0, 1.05, 0]} />
        </RigidBody>
        <Text position={[0, 1.87, 0.09]} fontSize={0.17} color="#ffffff">
          TOKO CUNG
        </Text>
        <Text
          position={[0, 1.18, 0.09]}
          fontSize={0.095}
          lineHeight={1.85}
          textAlign="center"
          color="#f4cc68"
        >
          {floorSummary}
        </Text>
        <Text position={[0, 0.47, 0.09]} fontSize={0.085} color="#c8d1d3">
          02 / 03 · SEGERA HADIR
        </Text>
      </group>
      <Text position={[-6, 0.12, -26]} rotation-x={-Math.PI / 2} fontSize={0.3} color="#ffdf84">
        BONGKAR MUAT
      </Text>
      <Text position={[6, 0.12, -26]} rotation-x={-Math.PI / 2} fontSize={0.3} color="#ffdf84">
        VAN · DELIVERY
      </Text>
      <Text position={[0, 2.65, -22.2]} rotation-y={Math.PI} fontSize={0.22} color="#ffffff">
        GUDANG · AKSES LOADING
      </Text>
      <instancedMesh
        ref={markersRef}
        args={[markerGeo, undefined, WORLD_POINTS.length]}
        dispose={null}
      >
        <meshBasicMaterial color="#e5b34f" />
      </instancedMesh>
    </group>
  );
}
