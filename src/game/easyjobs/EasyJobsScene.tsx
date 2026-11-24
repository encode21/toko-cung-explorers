/** @jsxImportSource @/game/jsx */
import { useEffect, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGame } from "@/state/game-store";
import {
  FISH_STALL,
  FRUIT_STALL,
  FRUIT_TREES,
  KULI_STALLS,
  KULI_TRUCK,
  kuliTarget,
  treeReady,
  type V3,
} from "./model";
import { useEasyJobs } from "./store";

function Stall({ at, label, color }: { at: V3; label: string; color: string }) {
  return (
    <group position={at}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[3, 1, 1.2]} />
        <meshStandardMaterial color="#9b6b3f" />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[3.4, 0.12, 1.8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 1.15, 0.5]}>
          <boxGeometry args={[0.1, 2.3, 0.1]} />
          <meshStandardMaterial color="#5a3922" />
        </mesh>
      ))}
      <Text position={[0, 2.75, 0]} fontSize={0.34} color="#2b1d12">
        {label}
      </Text>
    </group>
  );
}

function FruitTree({
  x,
  z,
  fruit,
  ready,
}: {
  x: number;
  z: number;
  fruit: string;
  ready: boolean;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 2.4, 8]} />
        <meshStandardMaterial color="#6b4a2e" />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <sphereGeometry args={[1.7, 12, 10]} />
        <meshStandardMaterial color="#3f8a3f" />
      </mesh>
      {ready &&
        [0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[Math.cos(i * 1.6) * 1.4, 2.6 + (i % 2) * 0.6, Math.sin(i * 1.6) * 1.4]}
          >
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshStandardMaterial color={fruit === "Mangga" ? "#f0a030" : "#d83a3a"} />
          </mesh>
        ))}
    </group>
  );
}

const crate = (
  <mesh castShadow>
    <boxGeometry args={[0.6, 0.45, 0.5]} />
    <meshStandardMaterial color="#c8a063" />
  </mesh>
);

export function EasyJobsScene() {
  const pickedAt = useEasyJobs((s) => s.pickedAt),
    kuli = useEasyJobs((s) => s.kuli),
    [now, setNow] = useState(Date.now);
  const carried = useRef<Group>(null),
    marker = useRef<Group>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = kuli ? kuliTarget(kuli) : null;
  useFrame(({ clock }) => {
    const p = useGame.getState().playerPos;
    if (carried.current) {
      carried.current.visible = !!kuli?.carrying;
      carried.current.position.set(p[0], p[1] + 0.75, p[2]);
    }
    if (marker.current) marker.current.position.y = 0.06 + Math.sin(clock.elapsedTime * 4) * 0.03;
  });
  return (
    <group>
      {FRUIT_TREES.map((t) => (
        <FruitTree key={t.id} {...t} ready={treeReady(pickedAt[t.id], now)} />
      ))}
      <Stall at={FRUIT_STALL} label="KIOS BUAH" color="#e8a33d" />
      <Stall at={FISH_STALL} label="KIOS IKAN" color="#3d8fb8" />
      <mesh position={[KULI_TRUCK[0], 1.1, KULI_TRUCK[2]]} castShadow>
        <boxGeometry args={[3.2, 2.2, 5]} />
        <meshStandardMaterial color="#6f8f5a" />
      </mesh>
      <Text position={[KULI_TRUCK[0], 2.8, KULI_TRUCK[2]]} fontSize={0.32} color="#2b1d12">
        TRUK PASAR · JADI KULI
      </Text>
      {KULI_STALLS.map((s, i) => (
        <Stall key={i} at={s} label={`KIOS ${i + 1}`} color="#c4553d" />
      ))}
      {target && kuli?.carrying && (
        <group ref={marker} position={[target[0], 0.06, target[2] + 1.6]}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.8, 1.1, 32]} />
            <meshBasicMaterial color="#ffe14d" />
          </mesh>
        </group>
      )}
      <group ref={carried} visible={false}>
        {crate}
      </group>
    </group>
  );
}
