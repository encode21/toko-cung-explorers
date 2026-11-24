/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";

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
/** Simple city bus parked beside the shelter (box parts, like the placeholder perabot). */
function Bus() {
  return (
    <group>
      <Box p={[0, 1.45, 0]} s={[2.4, 2.3, 8]} color="#2f8f5b" />
      <Box p={[0, 1.05, 0]} s={[2.42, 0.25, 8.02]} color="#f2c94c" />
      <Box p={[0, 1.95, 0.2]} s={[2.44, 0.8, 6.6]} color="#cfeef3" />
      <Box p={[0, 1.8, 4.01]} s={[2.1, 1.1, 0.04]} color="#cfeef3" />
      <Box p={[0, 2.75, 4.02]} s={[1.6, 0.3, 0.04]} color="#1d1f22" />
      {[-2.8, 2.8].flatMap((z) =>
        [-1.15, 1.15].map((x) => (
          <mesh key={`${x}${z}`} position={[x, 0.45, z]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.45, 0.45, 0.3, 16]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        )),
      )}
    </group>
  );
}
/** Halte bus: atap, bangku, papan nama, plus a parked bus. Ride is the "Naik Bus" context action. */
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
        <Text position={[0, 2.75, 0.04]} fontSize={0.2} color="#fff">
          BUS
        </Text>
      </group>
      <Text position={[0, 2.95, 0.3]} fontSize={0.3} color="#fff1d2" maxWidth={4}>
        {label}
      </Text>
      <group position={[0, 0, 3.2]} rotation-y={Math.PI / 2}>
        <Bus />
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2, 0.8, 0.1]} position={[0, 1.4, -0.95]} />
        <CuboidCollider
          args={[1.2, 1.45, 4]}
          position={[0, 1.45, 3.2]}
          rotation={[0, Math.PI / 2, 0]}
        />
      </RigidBody>
    </group>
  );
}
