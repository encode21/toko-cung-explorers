/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";

const GOLD = "#c9a45c";
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  finish: Finish = "paint",
  shape: Shape = "bevel",
): AssetPart => ({ p, s, color, finish, shape });

// Local +Z is the street front; the club_entrance target sits just outside it (world z 30.6).
const PARTS: AssetPart[] = [
  part([0, 3, 0], [8, 6, 7], "#22272a", "concrete"),
  part([0, 3, 3.55], [8.2, 6, 0.15], "#1c2a28"),
  ...[-4, -2.1, 2.1, 4].map((x) => part([x, 3, 3.68], [0.22, 6, 0.12], GOLD, "metal")),
  part([0, 6.05, 3.6], [8.6, 0.25, 0.5], GOLD, "metal"),
  part([0, 0.2, 3.7], [8.4, 0.4, 0.4], "#14191a"),
  part([0, 4.55, 3.72], [3.9, 1.15, 0.1], "#101615"),
  part([0, 1.45, 3.68], [3.8, 2.9, 0.08], GOLD, "metal"),
  ...[-3.05, 3.05].map((x) => part([x, 2.4, 3.68], [1.3, 3, 0.06], "#4a3a2a", "glass", "arch")),
  part([0, 3.05, 4.6], [4.6, 0.18, 2.2], "#151b1a"),
  part([0, 3.05, 5.7], [4.6, 0.24, 0.08], GOLD, "metal"),
  part([0, 0.02, 6], [2.6, 0.04, 4], "#3a1820", "fabric", "box"),
  ...[-1.6, 1.6].flatMap((x) => [
    ...[5, 6.2, 7.4].map((z) =>
      part([x, 0.45, z], [0.1, 0.9, 0.1], GOLD, "metal", "cylinder"),
    ),
    part([x, 0.78, 6.2], [0.05, 0.05, 2.4], "#7a1426", "fabric", "box"),
  ]),
  ...[-3.1, 3.1].flatMap((x) => [
    part([x, 0.35, 4.4], [0.8, 0.7, 0.8], "#14191a"),
    part([x, 1.2, 4.4], [0.9, 1.2, 0.9], "#2f5a3a", "paint", "sphere"),
  ]),
];

/** Elegant club front on partner-3, beside the Principal building; replaces the old plaza door. */
export function ClubFacade() {
  return (
    <group position={[22, 0, 35]} rotation-y={Math.PI} name="club-facade">
      <StyledBatch items={PARTS} />
      {[-2.1, 2.1].map((x) => (
        <mesh key={x} position={[x, 2.4, 3.82]}>
          <boxGeometry args={[0.18, 0.3, 0.12]} />
          <meshStandardMaterial color="#ffd89a" emissive="#ffc777" emissiveIntensity={1.2} />
        </mesh>
      ))}
      <mesh position={[0, 2.94, 4.6]}>
        <boxGeometry args={[3.6, 0.04, 1.6]} />
        <meshStandardMaterial color="#ffe2ad" emissive="#ffcf8a" emissiveIntensity={0.8} />
      </mesh>
      <Text position={[0, 4.72, 3.79]} fontSize={0.5} color="#e9c77f" letterSpacing={0.08}>
        CUNG UNDERGROUND
      </Text>
      <Text position={[0, 4.22, 3.79]} fontSize={0.18} color="#f3e6c8" letterSpacing={0.3}>
        CLUB · LOUNGE
      </Text>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[4, 3, 3.5]} position={[0, 3, 0]} />
      </RigidBody>
    </group>
  );
}
