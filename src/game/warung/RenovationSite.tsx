/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NPC_AVATARS } from "@/identity/characters";
import { renovationMinutesLeft, type WarungRenovation } from "./model";

const BAMBOO = "#c9a45c";

const TARP = "#2f6fb5";

function Pole({
  x,
  y,
  z,
  h,
  horizontal = false,
}: {
  x: number;
  y: number;
  z: number;
  h: number;
  horizontal?: boolean;
}) {
  return (
    <mesh position={[x, y, z]} rotation-z={horizontal ? Math.PI / 2 : 0}>
      <cylinderGeometry args={[0.045, 0.045, h, 6]} />
      <meshStandardMaterial color={BAMBOO} roughness={0.9} />
    </mesh>
  );
}

function Worker({
  position,
  yaw,
  animation,
}: {
  position: [number, number, number];
  yaw: number;
  animation: AvatarAnimation;
}) {
  return (
    <group position={position} rotation-y={yaw}>
      <BaseAvatarV2
        avatar={NPC_AVATARS["npc-tukang"]}
        animation={animation}
        speed={0}
        groundToWorld
      />
    </group>
  );
}

/**
 * Bamboo scaffolding, blue tarp, sign, bricks and two tukang in front of a façade being renovated.
 * Local frame: façade spans x ∈ [-width/2, width/2] at z = `front`, facing +z. No colliders: the door stays reachable.
 */
export function RenovationSite({
  renovation,
  width,
  front,
  height,
  sign = "SEDANG RENOVASI",
}: {
  renovation: WarungRenovation;
  width: number;
  front: number;
  height: number;
  sign?: string;
}) {
  const z = front + 0.45;
  const xs: number[] = [];
  for (let x = -width / 2; x <= width / 2 + 0.01; x += width / Math.max(2, Math.round(width / 1.6)))
    xs.push(x);
  const levels = [0.9, 1.9, height - 0.2];
  return (
    <group name="RenovationSite">
      {xs.map((x) => (
        <group key={x}>
          <Pole x={x} y={height / 2} z={z} h={height} />
          <Pole x={x} y={height / 2} z={z + 0.7} h={height} />
        </group>
      ))}
      {levels.map((y) => (
        <group key={y}>
          <Pole x={0} y={y} z={z} h={width} horizontal />
          <Pole x={0} y={y} z={z + 0.7} h={width} horizontal />
          {/* Plank deck */}
          <mesh position={[0, y + 0.06, z + 0.35]}>
            <boxGeometry args={[width, 0.05, 0.6]} />
            <meshStandardMaterial color="#a77c4a" roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* Blue tarp over the upper half, leaving the doorway open. */}
      <mesh position={[0, height * 0.72, z + 0.72]}>
        <planeGeometry args={[width, height * 0.5]} />
        <meshStandardMaterial color={TARP} side={2} roughness={0.8} transparent opacity={0.88} />
      </mesh>
      {/* Bricks + cement sacks by the side */}
      <mesh position={[-width / 2 + 0.6, 0.25, z + 1.6]}>
        <boxGeometry args={[0.9, 0.5, 0.6]} />
        <meshStandardMaterial color="#b4573b" roughness={1} />
      </mesh>
      <mesh position={[-width / 2 + 1.55, 0.18, z + 1.6]}>
        <boxGeometry args={[0.6, 0.36, 0.45]} />
        <meshStandardMaterial color="#d8d2c4" roughness={1} />
      </mesh>
      <Worker position={[width / 2 - 1, 0, z + 1.4]} yaw={Math.PI} animation="Hit" />
      <Worker
        position={[-width / 2 + 1.2, levels[1]! + 0.09, z + 0.35]}
        yaw={Math.PI}
        animation="PickItem"
      />
      <Billboard position={[0, height + 0.55, z + 0.4]}>
        <Text
          fontSize={0.3}
          color="#fff3c4"
          outlineWidth={0.025}
          outlineColor="#7a3a0e"
          textAlign="center"
          maxWidth={width}
        >
          {`🚧 ${sign} 🚧\nJadi ${renovation.levelName} · ±${renovationMinutesLeft(renovation)} menit lagi`}
        </Text>
      </Billboard>
    </group>
  );
}

/** Inside the warung during works: two tukang, a ladder-scaffold and tarp on the floor. Selling stays off. */
export function RenovationCrewInside({ renovation }: { renovation: WarungRenovation }) {
  return (
    <group name="RenovationCrewInside">
      <Pole x={-3.2} y={1.4} z={-1} h={2.8} />
      <Pole x={-2.2} y={1.4} z={-1} h={2.8} />
      <Pole x={-2.7} y={2.2} z={-1} h={1} horizontal />
      <mesh position={[-2.7, 2.24, -1]}>
        <boxGeometry args={[1.1, 0.05, 0.5]} />
        <meshStandardMaterial color="#a77c4a" />
      </mesh>
      <mesh position={[0, 0.03, 1.2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[4, 2.4]} />
        <meshStandardMaterial color={TARP} roughness={0.85} />
      </mesh>
      <Worker position={[-2.7, 2.27, -1]} yaw={0} animation="Hit" />
      <Worker position={[1.6, 0, 1.4]} yaw={-Math.PI / 2} animation="CarryBox" />
      <Billboard position={[0, 3, 1.2]}>
        <Text
          fontSize={0.22}
          color="#fff3c4"
          outlineWidth={0.02}
          outlineColor="#7a3a0e"
          textAlign="center"
        >
          {`🚧 Sedang renovasi jadi ${renovation.levelName} · belum bisa jual-beli`}
        </Text>
      </Billboard>
    </group>
  );
}
