/** @jsxImportSource @/game/jsx */
import { useState } from "react";
import { Text, RoundedBox, useCursor } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { KIOSK } from "@/game/interactions/kiosk";
import { useGame } from "@/state/game-store";

/** Portrait 32-inch (16:9, ~0.40 × 0.71 m) display, pedestal and payment modules. */
export function KioskDevice() {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const open = useGame((s) => s.openKiosk);
  return (
    <group name="IwareKiosk32" position={KIOSK.position} rotation-y={KIOSK.yaw}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.32, 0.035, 0.29]} position={[0, 0.035, 0]} />
        <CuboidCollider args={[0.27, 0.85, 0.16]} position={[0, 0.91, 0]} />
      </RigidBody>
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta < 5) open();
        }}
      >
        <RoundedBox
          args={[0.64, 0.07, 0.58]}
          radius={0.025}
          position={[0, 0.035, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#d8dde0" metalness={0.35} roughness={0.45} />
        </RoundedBox>
        <RoundedBox args={[0.12, 0.87, 0.13]} radius={0.018} position={[0, 0.5, -0.03]} castShadow>
          <meshStandardMaterial color="#e0e3e5" metalness={0.25} roughness={0.42} />
        </RoundedBox>
        <RoundedBox args={[0.51, 0.9, 0.12]} radius={0.035} position={[0, 1.38, 0]} castShadow>
          <meshStandardMaterial color="#e9ecee" metalness={0.15} roughness={0.4} />
        </RoundedBox>
        <mesh position={[0, 1.42, 0.065]}>
          <boxGeometry args={[0.43, 0.75, 0.015]} />
          <meshStandardMaterial color="#19262d" roughness={0.3} />
        </mesh>
        <mesh name="KioskTouchscreen" position={[0, 1.42, 0.076]}>
          <planeGeometry args={[0.3985, 0.7084]} />
          <meshStandardMaterial
            color="#f2f0e7"
            emissive="#f2f0e7"
            emissiveIntensity={hovered ? 0.45 : 0.2}
            roughness={0.45}
          />
        </mesh>
        <Text position={[0, 1.716, 0.082]} fontSize={0.031} color="#b94338">
          TOKO CUNG
        </Text>
        <Text position={[0, 1.663, 0.082]} fontSize={0.017} color="#3d5059">
          Belanja mudah di sini
        </Text>
        {[0, 1, 2].flatMap((row) =>
          [0, 1].map((col) => (
            <group
              key={`${row}-${col}`}
              position={[-0.098 + col * 0.196, 1.555 - row * 0.125, 0.083]}
            >
              <mesh>
                <planeGeometry args={[0.163, 0.108]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, 0.012, 0.002]}>
                <planeGeometry args={[0.041, 0.055]} />
                <meshBasicMaterial color={["#c7a459", "#769d77", "#b85848"][row]} />
              </mesh>
              <mesh position={[0, -0.035, 0.003]}>
                <planeGeometry args={[0.078, 0.005]} />
                <meshBasicMaterial color="#8c999d" />
              </mesh>
            </group>
          )),
        )}
        <mesh position={[0, 1.13, 0.083]}>
          <planeGeometry args={[0.34, 0.065]} />
          <meshBasicMaterial color="#b94338" />
        </mesh>
        <Text position={[0, 1.13, 0.085]} fontSize={0.021} color="#ffffff">
          SENTUH UNTUK MULAI
        </Text>
        <Text position={[0, 0.973, 0.065]} fontSize={0.022} color="#758088">
          iware
        </Text>
        <RoundedBox args={[0.5, 0.25, 0.23]} radius={0.027} position={[0, 0.86, 0.045]} castShadow>
          <meshStandardMaterial color="#d7dcdf" metalness={0.18} roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.14, 0.18, 0.045]} radius={0.01} position={[-0.125, 0.86, 0.176]}>
          <meshStandardMaterial color="#202b30" roughness={0.4} />
        </RoundedBox>
        <mesh position={[-0.125, 0.8, 0.201]}>
          <boxGeometry args={[0.105, 0.012, 0.005]} />
          <meshBasicMaterial color="#71858b" />
        </mesh>
        <RoundedBox args={[0.19, 0.13, 0.065]} radius={0.025} position={[0.12, 0.865, 0.18]}>
          <meshStandardMaterial color="#26333b" roughness={0.45} />
        </RoundedBox>
        <Text position={[0.12, 0.865, 0.216]} fontSize={0.018} color="#d9e5df">
          TAP / QR
        </Text>
      </group>
    </group>
  );
}
