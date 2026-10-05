/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { Box } from "./RetailFixtures";
import { STORE, WAREHOUSE } from "./layout";
import { CameraFade } from "./CameraFade";

/** Real open glazing bays; glass stays collidable, central doors remain open. */
export function Storefront() {
  return (
    <group position={[0, 0, STORE.maxZ]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 5.35, 0, 0]}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[3.65, 1.6, 0.12]} position={[0, 1.6, 0]} />
          </RigidBody>
          <Box p={[0, 0.25, 0]} s={[7.3, 0.5, 0.3]} color="#ded6c6" />
          <Box p={[0, 2.94, 0]} s={[7.3, 0.52, 0.3]} />
          <mesh position={[0, 1.59, 0]}>
            <boxGeometry args={[7.2, 2.18, 0.035]} />
            <meshStandardMaterial
              color="#c1e0e2"
              transparent
              opacity={0.14}
              depthWrite={false}
              roughness={0.15}
            />
          </mesh>
          {[-3.55, -1.2, 1.2, 3.55].map((x) => (
            <Box key={x} p={[x, 1.57, 0]} s={[0.065, 2.2, 0.15]} color="#344b50" />
          ))}
          <Box p={[0, 0.92, 0.03]} s={[7.15, 0.055, 0.04]} color="#eee9df" />
        </group>
      ))}
      <CameraFade>
        <Box p={[0, 2.7, 0]} s={[3.4, 0.22, 0.25]} color="#344b50" />
        <Text position={[0, 2.71, 0.14]} fontSize={0.12} color="#fff4dd">
          SELAMAT DATANG
        </Text>
      </CameraFade>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.65, 0, 0]} rotation-y={(side * Math.PI) / 2}>
          <mesh position={[side * 0.65, 1.3, 0]}>
            <boxGeometry args={[1.3, 2.55, 0.035]} />
            <meshStandardMaterial color="#b1d9dc" transparent opacity={0.14} depthWrite={false} />
          </mesh>
          <Box p={[side * 0.65, 2.57, 0]} s={[1.3, 0.04, 0.07]} color="#344b50" />
          <Box p={[side * 1.2, 1.25, 0]} s={[0.035, 0.45, 0.07]} color="#344b50" />
        </group>
      ))}
    </group>
  );
}

export function CeilingDetails() {
  return (
    <group userData={{ ignoreCameraCollision: true }}>
      {[-8, -4, 0, 4, 8].map((x) => (
        <Box key={x} p={[x, 3.13, -5]} s={[0.035, 0.07, 16]} color="#d3cdbf" />
      ))}
      {[1, -3, -7, -11].map((z) => (
        <Box key={z} p={[0, 3.1, z]} s={[18, 0.1, 0.055]} color="#d3cdbf" />
      ))}
      {[-7.8, 7.8].map((x) => (
        <group key={x}>
          <Box p={[x, 2.78, -6]} s={[0.4, 0.38, 1.2]} />
          {[0, 1, 2, 3].map((i) => (
            <Box
              key={i}
              p={[x + (x < 0 ? 0.21 : -0.21), 2.68 + i * 0.045, -6]}
              s={[0.015, 0.018, 1]}
              color="#87999a"
            />
          ))}
        </group>
      ))}
      <mesh position={[0, 3.08, -2]}>
        <cylinderGeometry args={[0.085, 0.085, 0.05, 12]} />
        <meshStandardMaterial color="#fff9ef" />
      </mesh>
    </group>
  );
}

export function RetailDetails() {
  return (
    <group>
      <group position={[WAREHOUSE.passageX, 0, STORE.minZ + 0.22]}>
        <Text position={[0, 2.43, 0]} fontSize={0.14} color="#38504e">
          GUDANG · KHUSUS STAF
        </Text>
        {/* Open door leaves preserve the established restocking / packing route. */}
        {[-1, 1].map((side) => (
          <Box key={side} p={[side * 1.5, 1.1, -0.55]} s={[0.07, 2.2, 1.05]} color="#798e83" />
        ))}
      </group>
      <group position={[-8.75, 1.9, -1]} rotation-y={Math.PI / 2}>
        <Box p={[0, 0, 0]} s={[0.8, 1.1, 0.035]} color="#d7a553" />
        <Text position={[0, 0.15, 0.025]} fontSize={0.14} color="#fff9e7">
          HARGA HEMAT
        </Text>
        <Text position={[0, -0.12, 0.025]} fontSize={0.085} color="#34474d">
          Setiap hari, dekat di hati.
        </Text>
      </group>
      <group position={[8.65, 0.7, -11.8]}>
        <mesh>
          <capsuleGeometry args={[0.11, 0.32, 4, 10]} />
          <meshStandardMaterial color="#ba4940" />
        </mesh>
        <Box p={[0, 0.3, 0]} s={[0.15, 0.05, 0.07]} color="#374950" />
      </group>
      <group position={[-7.8, 2.75, 2.6]} rotation-y={0.7}>
        <Box p={[0, 0, 0]} s={[0.18, 0.14, 0.33]} />
        <Box p={[0, 0, 0.17]} s={[0.12, 0.09, 0.02]} color="#30434c" />
      </group>
      <group position={[2, 2.35, -12.77]}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.23, 0.23, 0.035, 32]} />
          <meshStandardMaterial color="#fcf5e5" />
        </mesh>
        <Box p={[0, 0.055, 0.03]} s={[0.016, 0.14, 0.012]} color="#34474d" />
        <Box p={[0.055, 0, 0.03]} s={[0.13, 0.016, 0.012]} color="#34474d" />
      </group>
    </group>
  );
}
