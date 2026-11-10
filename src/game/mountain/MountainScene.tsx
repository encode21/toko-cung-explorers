/** @jsxImportSource @/game/jsx */
import { MountainTerrain, MountainTrail } from "./MountainTerrain";
import { MountainBasecamp } from "./MountainBasecamp";
import { MountainVegetation } from "./MountainVegetation";
import { MountainLeaderboardBoard } from "./MountainLeaderboardBoard";
import { MountainWaterfall } from "./Waterfall";
import { MountainLantern as Lantern } from "./MountainLantern";
import { MountainCampTent, MountainRestFire } from "./MountainCamps";
import { MountainSummitLandmark } from "./MountainLandmarks";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { useMountain } from "./store";
import { Helipad } from "./Helicopter";
import {
  CITY_HELIPAD,
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_TRAIL,
  nearestMountainTrail,
  mountainGroundHeight,
} from "./model";

const P = { wood: "#a67d51", dark: "#5c4937", light: "#f6edcc", leaf: "#4f8056", gold: "#f2bd53" };
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  ry = 0,
): OutdoorPart => ({ p, s, color, ry });
function RestShelter({ theme, z = 0 }: { theme: number; z?: number }) {
  const parts = useMemo(
    () => [
      ...[-1.5, 1.5].flatMap((x) =>
        [-1.35, 1.35].map((z) => part([x, 1.2, z], [0.18, 2.4, 0.18], P.dark)),
      ),
      part([0, 0.52, 0.85], [2.6, 0.16, 0.65], P.wood),
      part([0, 0.95, 1.15], [2.6, 0.7, 0.12], P.wood),
      part([-1, 0.22, 0.85], [0.14, 0.5, 0.45], P.dark),
      part([1, 0.22, 0.85], [0.14, 0.5, 0.45], P.dark),
    ],
    [],
  );
  return (
    <group position={[-7.2, 0, z]}>
      <OutdoorBatch items={parts} />
      <mesh castShadow position={[0, 2.45, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[2.7, 1.35, 4]} />
        <meshStandardMaterial
          color={["#8f5b3f", "#567566", "#8d6f55", "#507d81"][(theme - 1) % 4]!}
        />
      </mesh>
      <Lantern position={[1.5, 0, -1.35]} />
    </group>
  );
}

function Checkpoint({ checkpoint }: { checkpoint: (typeof MOUNTAIN_CHECKPOINTS)[number] }) {
  const progress = useMountain((s) => s.checkpoint);
  const active = progress >= checkpoint.id;
  const compact = false;
  const radius = 2.35;
  const segment = nearestMountainTrail(checkpoint.position[0], checkpoint.position[2]).segment;
  const a = MOUNTAIN_TRAIL[segment]!,
    b = MOUNTAIN_TRAIL[segment + 1]!;
  const yaw = Math.abs(a[0] - b[0]) > Math.abs(a[2] - b[2]) ? Math.PI / 2 : 0;
  const signX = -4.4;
  const signY =
    mountainGroundHeight(
      checkpoint.position[0] + Math.cos(yaw) * signX,
      checkpoint.position[2] - Math.sin(yaw) * signX,
    ) - checkpoint.position[1];
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!pulse.current) return;
    const state = useMountain.getState();
    const age = (Date.now() - state.pulseAt) / 1000;
    pulse.current.visible = state.checkpoint === checkpoint.id && age >= 0 && age < 1.4;
    if (pulse.current.visible) {
      pulse.current.scale.setScalar(1 + age * 1.5);
      (pulse.current.material as THREE.MeshBasicMaterial).opacity = (1 - age / 1.4) * 0.55;
    }
  });
  return (
    <group position={[...checkpoint.position]} rotation-y={yaw} name={`MountainCP${checkpoint.id}`}>
      <RigidBody
        type="fixed"
        colliders={false}
        userData={{ mountainCheckpoint: checkpoint.id, mountainTrail: true }}
      >
        <CylinderCollider args={[0.025, radius]} position={[0, 0.015, 0]} />
        <mesh receiveShadow position={[0, 0.015, 0]}>
          <cylinderGeometry args={[radius, radius, 0.05, 32]} />
          <meshStandardMaterial color={active ? "#7ba86a" : "#a9ad8d"} />
        </mesh>
      </RigidBody>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
        <ringGeometry args={[radius - 0.3, radius - 0.15, 40]} />
        <meshStandardMaterial
          color={active ? "#d9f4b8" : P.light}
          emissive={active ? "#79b75f" : "#000000"}
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh ref={pulse} visible={false} rotation-x={-Math.PI / 2} position={[0, 0.08, 0]}>
        <ringGeometry args={[radius - 0.4, radius - 0.25, 40]} />
        <meshBasicMaterial color="#daffac" transparent depthWrite={false} />
      </mesh>
      <Text
        position={[0, 0.06, 0]}
        rotation-x={-Math.PI / 2}
        fontSize={compact ? 0.6 : 0.8}
        color={active ? "#efffda" : "#6d6044"}
      >
        {active ? `CP ${checkpoint.id} ✓` : `CP ${checkpoint.id}`}
      </Text>
      <MountainCampTent position={[-7.2, 0, -4.5]} theme={checkpoint.id} />
      <MountainCampTent position={[7.2, 0, -4.5]} theme={checkpoint.id + 1} />
      <MountainRestFire position={[6.8, 0, 5.1]} />
      <RestShelter theme={checkpoint.id} z={5.1} />
      <Lantern position={[-9.1, 0, 8.1]} active={active} />
      <Lantern position={[9.1, 0, 8.1]} active={active} />
      {compact ? (
        <Lantern position={[3.05, 0, 0]} active={active} />
      ) : (
        <>
          <Lantern position={[-3.6, 0, 2.8]} active={active} />
          <Lantern position={[-3.6, 0, -2.8]} active={active} />
        </>
      )}
      <group position={[signX, signY, 0]}>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[0.15, 2.4, 0.15]} />
          <meshStandardMaterial color={P.dark} />
        </mesh>
        <mesh position={[0, 2.3, 0]}>
          <boxGeometry args={[compact ? 2.75 : 3.6, 1, 0.18]} />
          <meshStandardMaterial color={P.dark} />
        </mesh>
        <Text position={[0, 2.45, 0.11]} fontSize={compact ? 0.26 : 0.33} color={P.light}>
          {checkpoint.name.toUpperCase()}
        </Text>
        <Text position={[0, 2.06, 0.11]} fontSize={0.2} color={active ? "#d2f1a2" : "#ffd780"}>
          {active ? "Checkpoint aktif" : `CHECKPOINT ${checkpoint.id}`}
        </Text>
      </group>
    </group>
  );
}

function Summit() {
  const complete = useMountain((s) => s.completed);
  return (
    <group position={[...MOUNTAIN_SUMMIT.position]} name="MountainSummit">
      <MountainSummitLandmark />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.065, 0]}>
        <ringGeometry args={[2.1, 2.35, 40]} />
        <meshStandardMaterial color={complete ? "#bde99b" : P.gold} />
      </mesh>
    </group>
  );
}

export function CityHelipad() {
  return (
    <group name="CityHelicopterDeparture">
      <Helipad position={CITY_HELIPAD.position} location="city" />
      <RigidBody type="fixed" colliders={false}>
        <mesh receiveShadow position={[67.5, -0.09, 49]}>
          <boxGeometry args={[4.5, 0.22, 4.2]} />
          <meshStandardMaterial color="#d9c9a9" roughness={1} />
        </mesh>
        {/* Top 0.02, below the helipad pad (0.04) it overlaps — avoids z-fighting. */}
        <CuboidCollider args={[2.25, 0.11, 2.1]} position={[67.5, -0.09, 49]} />
      </RigidBody>
      <Lantern position={[66.7, 0.04, 46]} />
      <Lantern position={[66.7, 0.04, 52]} />
    </group>
  );
}

export function MountainScene() {
  return (
    <group name="PegununganCung">
      <MountainTerrain />
      <MountainVegetation />
      <MountainTrail />
      <MountainWaterfall />
      <MountainBasecamp />
      <MountainLeaderboardBoard />
      {MOUNTAIN_CHECKPOINTS.map((checkpoint) => (
        <Checkpoint key={checkpoint.id} checkpoint={checkpoint} />
      ))}
      <Summit />
    </group>
  );
}
