/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { LOW_QUALITY } from "@/game/engine/quality";
import { reducedMotion } from "@/game/vehicles/visual";
import type { MountainPoint } from "./model";

/** Small emissive flames share one animation; only the central campfire adds a light. */
function Flame({ scale = 1 }: { scale?: number }) {
  const flame = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!flame.current) return;
    const time = reducedMotion() ? 0 : clock.elapsedTime;
    flame.current.scale.set(
      scale * (1 + Math.sin(time * 7) * 0.05),
      scale * (1 + Math.sin(time * 9) * 0.09),
      scale,
    );
    flame.current.rotation.y = Math.sin(time * 2.4) * 0.15;
  });
  return (
    <group ref={flame} scale={scale}>
      {[-1, 0, 1].map((i) => (
        <mesh
          key={i}
          position={[i * 0.17, 0.35 + (i === 0 ? 0.15 : 0), 0]}
          rotation-z={-i * 0.22}
          scale={[0.3, i === 0 ? 0.82 : 0.55, 0.28]}
        >
          <sphereGeometry args={[0.55, 7, 5]} />
          <meshBasicMaterial color={i === 0 ? "#ffb328" : "#ed641c"} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.25, 0.13]} scale={[0.18, 0.38, 0.18]}>
        <sphereGeometry args={[0.6, 7, 5]} />
        <meshBasicMaterial color="#fff0a4" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function MountainTorch({ position }: { position: MountainPoint }) {
  return (
    <group position={[...position]} name="MountainTorch">
      <mesh castShadow position={[0, 0.95, 0]} rotation-z={0.045}>
        <cylinderGeometry args={[0.065, 0.12, 1.9, 7]} />
        <meshStandardMaterial color="#66503b" roughness={1} />
      </mesh>
      <mesh position={[0.04, 1.9, 0]}>
        <cylinderGeometry args={[0.2, 0.13, 0.34, 8]} />
        <meshStandardMaterial color="#343b37" metalness={0.2} roughness={0.8} />
      </mesh>
      {[1.77, 1.93, 2.03].map((y) => (
        <mesh key={y} position={[0.04, y, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.18, 0.025, 4, 8]} />
          <meshStandardMaterial color="#b29458" roughness={0.8} />
        </mesh>
      ))}
      <group position={[0.04, 2.03, 0]}>
        <Flame scale={0.6} />
      </group>
    </group>
  );
}

function LogBench({ position, yaw }: { position: MountainPoint; yaw: number }) {
  return (
    <group position={[...position]} rotation-y={yaw}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2.2, 0.32, 0.38]} position={[0, 0.34, 0]} />
        <mesh castShadow receiveShadow position={[0, 0.36, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.37, 0.43, 4.4, 10]} />
          <meshStandardMaterial color="#80562e" roughness={1} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 2.205, 0.36, 0]} rotation-y={Math.PI / 2}>
            <mesh>
              <circleGeometry args={[side < 0 ? 0.43 : 0.37, 10]} />
              <meshStandardMaterial color="#c49b61" side={THREE.DoubleSide} roughness={1} />
            </mesh>
            {[0.11, 0.23, 0.31].map((r) => (
              <mesh key={r} position={[0, 0, side * 0.003]}>
                <ringGeometry args={[r, r + 0.012, 12]} />
                <meshStandardMaterial color="#977044" side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
        ))}
        {[-0.16, 0.13].map((z) => (
          <mesh key={z} position={[0, 0.705, z]}>
            <boxGeometry args={[4.1, 0.012, 0.025]} />
            <meshStandardMaterial color="#5d4128" />
          </mesh>
        ))}
      </RigidBody>
    </group>
  );
}

export function MountainCampfire({ position }: { position: MountainPoint }) {
  const stones = useMemo<OutdoorPart[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return {
          p: [Math.cos(angle) * 0.85, 0.14, Math.sin(angle) * 0.85],
          s: [0.47, 0.34 + (i % 3) * 0.045, 0.4],
          color: i % 2 ? "#777b68" : "#a2a18a",
          ry: angle,
        };
      }),
    [],
  );
  return (
    <group position={[...position]} name="MountainCampfire">
      <mesh rotation-x={-Math.PI / 2} position-y={0.025}>
        <circleGeometry args={[1.03, 20]} />
        <meshStandardMaterial color="#483f2e" roughness={1} />
      </mesh>
      <OutdoorBatch items={stones} shape="foliage" />
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0, 0.18 + i * 0.055, 0]}
          rotation={[Math.PI / 2, 0, (i * Math.PI) / 3]}
        >
          <cylinderGeometry args={[0.13, 0.17, 1.35, 7]} />
          <meshStandardMaterial color="#4a3223" roughness={1} />
        </mesh>
      ))}
      <group position-y={0.24}>
        <Flame scale={1.3} />
      </group>
      {!LOW_QUALITY && (
        <pointLight
          position={[0, 1.15, 0]}
          color="#ffab4b"
          intensity={10}
          distance={9}
          decay={2}
          castShadow={false}
        />
      )}
      <LogBench position={[0, 0, 3]} yaw={0} />
      <LogBench position={[0, 0, -3]} yaw={0} />
      <LogBench position={[-3.2, 0, 0]} yaw={Math.PI / 2} />
      <LogBench position={[3.2, 0, 0]} yaw={Math.PI / 2} />
    </group>
  );
}
