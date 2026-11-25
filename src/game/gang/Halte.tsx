/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Plang } from "@/game/world/Plang";

function Box({
  p,
  s,
  color,
}: {
  p: [number, number, number];
  s: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
/** Halte bus: atap, bangku, papan nama, Bus datang sesuai jadwal. */
export function Halte({
  position,
  label,
  yaw = 0,
}: {
  position: [number, number, number];
  label: string;
  yaw?: number;
}) {
  return (
    <group position={[position[0], 0, position[2]]} rotation-y={yaw} name="HalteBus">
      <Box p={[0, 2.6, 0]} s={[4.2, 0.15, 2]} color="#2c5d8a" />
      {[-1.9, 1.9].map((x) => (
        <Box key={x} p={[x, 1.3, -0.8]} s={[0.12, 2.6, 0.12]} color="#cfd6db" />
      ))}
      <Box p={[0, 1.4, -0.95]} s={[4, 1.6, 0.05]} color="#9fc6dd" />
      <Box p={[0, 0.45, -0.6]} s={[3.2, 0.1, 0.5]} color="#7b5a3c" />
      <group position={[2.4, 0, 0.6]}>
        <Box p={[0, 1.4, 0]} s={[0.1, 2.8, 0.1]} color="#cfd6db" />
        <Box p={[0, 2.75, 0]} s={[0.9, 0.5, 0.06]} color="#2f8f5b" />
      </group>
      <Plang text={label} position={[0, 2.62, 1.0]} size={0.28} board="#1d4f7a" />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2, 0.8, 0.1]} position={[0, 1.4, -0.95]} />
      </RigidBody>
    </group>
  );
}
