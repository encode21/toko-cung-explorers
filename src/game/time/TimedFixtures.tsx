/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, MeshStandardMaterial, PointLight } from "three";
import { sceneLighting } from "./lighting";

type Circuit = "store" | "street";
export function TimedPointLight({
  position,
  intensity,
  distance,
  decay = 1.6,
  circuit = "store",
}: {
  position: [number, number, number];
  intensity: number;
  distance: number;
  decay?: number;
  circuit?: Circuit;
}) {
  const ref = useRef<PointLight>(null);
  useFrame(() => {
    if (ref.current) ref.current.intensity = intensity * sceneLighting[circuit];
  });
  return (
    <pointLight
      ref={ref}
      name={`${circuit}-light`}
      position={position}
      intensity={0}
      distance={distance}
      decay={decay}
      color={circuit === "store" ? "#ffe4bf" : "#ffdfab"}
      castShadow={false}
    />
  );
}
export function TimedEmission({
  circuit = "store",
  sign = false,
}: {
  circuit?: Circuit;
  sign?: boolean;
}) {
  const ref = useRef<MeshStandardMaterial>(null);
  useFrame(() => {
    if (ref.current)
      ref.current.emissiveIntensity = sign
        ? sceneLighting.street * 0.55
        : sceneLighting[circuit] * 1.5;
  });
  return (
    <meshStandardMaterial
      ref={ref}
      color={sign ? "#fff9ef" : "#eee4cc"}
      emissive="#ffe2b3"
      emissiveIntensity={0}
      roughness={0.7}
    />
  );
}

/** Every existing street lamp uses one shared material and one draw call. */
export function TimedLampHeads({ positions }: { positions: [number, number, number][] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const object = new Object3D();
    positions.forEach((position, i) => {
      object.position.set(...position);
      object.updateMatrix();
      ref.current!.setMatrixAt(i, object.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [positions]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, positions.length]}>
      <boxGeometry args={[0.42, 0.14, 0.28]} />
      <TimedEmission circuit="street" />
    </instancedMesh>
  );
}
