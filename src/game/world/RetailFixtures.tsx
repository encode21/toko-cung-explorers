/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { ProductDisplay, ShelfRow } from "./RetailShelf";
import { Fixture } from "./Fixture";

export function Box({
  p,
  s,
  color = "#eee9df",
}: {
  p: [number, number, number];
  s: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}

export function CashierCounter({ assetUrl }: { assetUrl?: string }) {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.7, 0.53, 0.55]} position={[0, 0.53, 0]} />
      </RigidBody>
      <Fixture {...(assetUrl ? { assetUrl } : {})} height={1.4}>
        <Box p={[0, 0.49, 0]} s={[3.3, 0.98, 1]} color="#baa282" />
        <Box p={[0, 0.17, 0.505]} s={[3.25, 0.2, 0.02]} color="#32474c" />
        <Box p={[0, 1.025, 0]} s={[3.45, 0.08, 1.12]} color="#eee8d8" />
        <Box p={[-0.65, 1.075, 0]} s={[1, 0.018, 0.7]} color="#34404a" />
        <Box p={[0.4, 1.14, -0.14]} s={[0.09, 0.2, 0.1]} color="#273a46" />
        <group position={[0.4, 1.34, -0.14]} rotation-x={-0.18}>
          <Box p={[0, 0, 0]} s={[0.48, 0.3, 0.04]} color="#263b49" />
          <Box p={[0, 0, 0.025]} s={[0.42, 0.24, 0.006]} color="#90c4ba" />
          <Text position={[0, 0, 0.03]} fontSize={0.046} color="#234449">
            TOKO CUNG
          </Text>
        </group>
        <Box p={[-0.18, 1.11, 0.2]} s={[0.22, 0.09, 0.18]} color="#253b43" />
        <Box p={[-0.18, 1.159, 0.2]} s={[0.12, 0.008, 0.1]} color="#ae564d" />
        <Box p={[0.85, 1.17, -0.1]} s={[0.28, 0.22, 0.3]} color="#3c4c53" />
        <Box p={[0.85, 1.285, 0]} s={[0.17, 0.008, 0.16]} color="#fff9ed" />
        <Box p={[1.33, 1.25, 0.03]} s={[0.32, 0.37, 0.24]} color="#ceb491" />
        <mesh position={[1.33, 1.46, 0.03]}>
          <torusGeometry args={[0.08, 0.01, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#a58864" />
        </mesh>
        <Text position={[-1.25, 0.66, 0.51]} fontSize={0.15} color="#fff7e7">
          01
        </Text>
        <Text position={[0.4, 0.66, 0.51]} fontSize={0.12} color="#34474d">
          Terima kasih!
        </Text>
        <Box p={[-1.36, 1.12, 0.18]} s={[0.38, 0.12, 0.46]} color="#405c59" />
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            p={[-1.46 + i * 0.1, 1.2, 0.18]}
            s={[0.075, 0.08, 0.3]}
            color={i === 1 ? "#eac679" : "#bb6660"}
          />
        ))}
      </Fixture>
    </group>
  );
}

const fridgeLevels = [0.25, 0.64, 1.03, 1.42];
export function Refrigerator({ assetUrl }: { assetUrl?: string }) {
  return (
    <Fixture {...(assetUrl ? { assetUrl } : {})} height={2.1}>
      <Box p={[-0.46, 1.05, 0]} s={[0.1, 2.1, 3.6]} color="#354f54" />
      <Box p={[0, 0.12, 0]} s={[0.95, 0.24, 3.6]} color="#354f54" />
      <Box p={[0, 1.99, 0]} s={[0.95, 0.22, 3.6]} color="#354f54" />
      {[-1.8, -0.6, 0.6, 1.8].map((z) => (
        <Box key={z} p={[0.47, 1.05, z]} s={[0.045, 1.9, 0.05]} color="#c6d4ce" />
      ))}
      {fridgeLevels.map((y) => (
        <ShelfRow key={y} y={y} length={3.5} />
      ))}
      <ProductDisplay length={3.5} levels={fridgeLevels} category="drink" />
      {[-1.2, 0, 1.2].map((z) => (
        <group key={z}>
          <mesh position={[0.485, 1.06, z]}>
            <boxGeometry args={[0.012, 1.65, 1.13]} />
            <meshStandardMaterial
              color="#a6dcd9"
              transparent
              opacity={0.12}
              roughness={0.18}
              depthWrite={false}
            />
          </mesh>
          <Box p={[0.52, 1.07, z - 0.43]} s={[0.05, 0.48, 0.035]} color="#e4eee7" />
        </group>
      ))}
      <Text position={[0.49, 1.99, 0]} rotation-y={Math.PI / 2} fontSize={0.12} color="#e3f5ed">
        SEGAR SETIAP HARI
      </Text>
    </Fixture>
  );
}
