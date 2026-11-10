/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { reducedMotion } from "@/game/vehicles/visual";
import type { MountainPoint } from "./model";

const tentRoof = new THREE.BufferGeometry();
tentRoof.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      -2, 0, -2.3, 0, 2.4, -2.3, -2, 0, 2.3, 0, 2.4, -2.3, 0, 2.4, 2.3, -2, 0, 2.3, 0, 2.4, -2.3, 2,
      0, -2.3, 0, 2.4, 2.3, 2, 0, -2.3, 2, 0, 2.3, 0, 2.4, 2.3,
    ],
    3,
  ),
);
tentRoof.computeVertexNormals();
const tentMaterials = ["#c68036", "#648778", "#aa674a"].map(
  (color) => new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide }),
);

/** Shared tent meshes keep ten occupied-looking camps within a modest draw budget. */
export function MountainCampTent({
  position,
  yaw = 0,
  theme = 0,
}: {
  position: MountainPoint;
  yaw?: number;
  theme?: number;
}) {
  return (
    <group name="MountainCampingTent" position={[...position]} rotation-y={yaw}>
      <mesh
        geometry={tentRoof}
        material={tentMaterials[theme % 3]!}
        castShadow
        receiveShadow
        dispose={null}
      />
      <mesh position={[0, 0.025, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[4, 4.6]} />
        <meshStandardMaterial color="#5b5848" roughness={1} />
      </mesh>
      <OutdoorBatch
        items={[
          { p: [0, 2.38, 0], s: [0.055, 0.055, 4.8], color: "#403e33" },
          { p: [-1, 0.1, -0.3], s: [0.8, 0.13, 2.6], color: "#d2bd83" },
          { p: [1, 0.1, -0.3], s: [0.8, 0.13, 2.6], color: "#81996d" },
          {
            p: [-1.55, 0.6, 2.29],
            s: [0.8, 1.2, 0.035],
            color: theme % 3 === 1 ? "#527565" : "#b27435",
          },
          {
            p: [1.55, 0.6, 2.29],
            s: [0.8, 1.2, 0.035],
            color: theme % 3 === 1 ? "#527565" : "#b27435",
          },
        ]}
      />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2, 0.8, 0.08]} position={[0, 0.8, -2.3]} />
        <CuboidCollider args={[0.08, 0.45, 2.3]} position={[-2, 0.45, 0]} />
        <CuboidCollider args={[0.08, 0.45, 2.3]} position={[2, 0.45, 0]} />
      </RigidBody>
    </group>
  );
}

export function MountainRestFire({ position }: { position: MountainPoint }) {
  const flame = useRef<THREE.Group>(null);
  const stones = useMemo<OutdoorPart[]>(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        p: [Math.cos((i * Math.PI) / 5) * 0.8, 0.12, Math.sin((i * Math.PI) / 5) * 0.8],
        s: [0.46, 0.3, 0.4],
        ry: i,
        color: i % 2 ? "#939179" : "#73786a",
      })),
    [],
  );
  const benches = useMemo<OutdoorPart[]>(
    () =>
      [-1, 1].flatMap((side) => [
        { p: [side * 2.1, 0.28, 0], s: [0.48, 2.5, 0.48], rx: Math.PI / 2, color: "#86613d" },
        { p: [0, 0.28, side * 2.1], s: [0.48, 2.5, 0.48], rz: Math.PI / 2, color: "#86613d" },
      ]),
    [],
  );
  useFrame(({ clock }) => {
    if (!flame.current || reducedMotion()) return;
    flame.current.scale.y = 1 + Math.sin(clock.elapsedTime * 8) * 0.1;
  });
  return (
    <group name="MountainCheckpointCampfire" position={[...position]}>
      <OutdoorBatch items={stones} shape="foliage" />
      <OutdoorBatch items={benches} shape="round" />
      <OutdoorBatch
        items={[
          { p: [0, 0.15, 0], s: [0.22, 1.35, 0.22], rx: Math.PI / 2, color: "#49382b" },
          { p: [0, 0.22, 0], s: [0.22, 1.35, 0.22], rz: Math.PI / 2, color: "#49382b" },
        ]}
        shape="round"
      />
      <group ref={flame} position-y={0.2}>
        {[-1, 0, 1].map((i) => (
          <mesh key={i} position={[i * 0.18, 0.3, 0]} scale={[0.22, i === 0 ? 0.85 : 0.55, 0.25]}>
            <sphereGeometry args={[0.5, 6, 5]} />
            <meshBasicMaterial color={i === 0 ? "#ffd06a" : "#f07d2b"} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <RigidBody type="fixed" colliders={false}>
        {[-1, 1].flatMap((side) => [
          <CuboidCollider
            key={`x${side}`}
            args={[0.24, 0.28, 1.25]}
            position={[side * 2.1, 0.28, 0]}
          />,
          <CuboidCollider
            key={`z${side}`}
            args={[1.25, 0.28, 0.24]}
            position={[0, 0.28, side * 2.1]}
          />,
        ])}
      </RigidBody>
    </group>
  );
}
