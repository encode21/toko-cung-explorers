/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
export type OutdoorPart = {
  p: [number, number, number];
  s: [number, number, number];
  color: string;
  ry?: number;
};
const cube = new THREE.BoxGeometry(1, 1, 1);
const round = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const foliage = new THREE.IcosahedronGeometry(0.5, 1);
export function OutdoorBatch({
  items,
  shape = "box",
  shadows = true,
}: {
  items: OutdoorPart[];
  shape?: "box" | "round" | "foliage";
  shadows?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D(),
      c = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.scale.set(...it.s);
      o.rotation.set(0, it.ry ?? 0, 0);
      o.updateMatrix();
      mesh.current!.setMatrixAt(i, o.matrix);
      mesh.current!.setColorAt(i, c.set(it.color));
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    if (mesh.current!.instanceColor) mesh.current!.instanceColor.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={mesh}
      args={[
        shape === "round" ? round : shape === "foliage" ? foliage : cube,
        undefined,
        items.length,
      ]}
      castShadow={shadows}
      receiveShadow
    >
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  );
}
