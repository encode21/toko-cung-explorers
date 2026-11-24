/** @jsxImportSource @/game/jsx */
import { Plang } from "@/game/world/Plang";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { STORE, WAREHOUSE } from "./layout";
import { CameraFade } from "./CameraFade";

const H = STORE.wallHeight;
const GLASS_H = H - 1.02;

const storefrontParts: OutdoorPart[] = (() => {
  const out: OutdoorPart[] = [];
  for (const side of [-1, 1]) {
    const ox = side * 5.35;
    out.push({ p: [ox, 0.25, 0], s: [7.3, 0.5, 0.3], color: "#ded6c6" });
    out.push({ p: [ox, H - 0.26, 0], s: [7.3, 0.52, 0.3], color: "#eee9df" });
    for (const x of [-3.55, -1.2, 1.2, 3.55]) {
      out.push({ p: [ox + x, 0.5 + GLASS_H / 2, 0], s: [0.065, GLASS_H, 0.15], color: "#344b50" });
    }
    out.push({ p: [ox, 0.92, 0.03], s: [7.15, 0.055, 0.04], color: "#eee9df" });
  }
  // Open door top rails and handles (rotated 90° around Y: local x becomes -side*z)
  for (const side of [-1, 1]) {
    const ox = side * 1.65;
    out.push({
      p: [ox, H - 0.63, -0.65],
      s: [0.07, 0.04, 1.3],
      color: "#344b50",
    });
    out.push({
      p: [ox, 1.25, -1.2],
      s: [0.07, 0.45, 0.035],
      color: "#344b50",
    });
  }
  return out;
})();

const ceilingParts: OutdoorPart[] = (() => {
  const out: OutdoorPart[] = [];
  for (const x of [-8, -4, 0, 4, 8]) {
    out.push({ p: [x, 3.13, -5], s: [0.035, 0.07, 16], color: "#d3cdbf" });
  }
  for (const z of [1, -3, -7, -11]) {
    out.push({ p: [0, 3.1, z], s: [18, 0.1, 0.055], color: "#d3cdbf" });
  }
  for (const x of [-7.8, 7.8]) {
    out.push({ p: [x, 2.78, -6], s: [0.4, 0.38, 1.2], color: "#eee9df" });
    for (let i = 0; i < 4; i++) {
      out.push({
        p: [x + (x < 0 ? 0.21 : -0.21), 2.68 + i * 0.045, -6],
        s: [0.015, 0.018, 1],
        color: "#87999a",
      });
    }
  }
  return out;
})();

const retailDetailParts: OutdoorPart[] = [
  // Open warehouse passage doors
  { p: [WAREHOUSE.passageX - 1.5, 1.1, STORE.minZ - 0.33], s: [0.07, 2.2, 1.05], color: "#798e83" },
  { p: [WAREHOUSE.passageX + 1.5, 1.1, STORE.minZ - 0.33], s: [0.07, 2.2, 1.05], color: "#798e83" },
  // Promo poster board
  { p: [-8.75, 1.9, -1], s: [0.035, 1.1, 0.8], color: "#d7a553" },
  // Fire extinguisher top nozzle
  { p: [8.65, 1.0, -11.8], s: [0.15, 0.05, 0.07], color: "#374950" },
  // CCTV body & lens
  { p: [-7.8, 2.75, 2.6], s: [0.18, 0.14, 0.33], color: "#eee9df", ry: 0.7 },
  { p: [-7.69, 2.75, 2.73], s: [0.12, 0.09, 0.02], color: "#30434c", ry: 0.7 },
  // Clock hands
  { p: [2, 2.405, -12.74], s: [0.016, 0.14, 0.012], color: "#34474d" },
  { p: [2.055, 2.35, -12.74], s: [0.13, 0.016, 0.012], color: "#34474d" },
];

/** Real open glazing bays; glass stays collidable, central doors remain open. */
export function Storefront() {
  return (
    <group name="TokoCung-Storefront" position={[0, 0, STORE.maxZ]}>
      <OutdoorBatch items={storefrontParts} shadows={false} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 5.35, 0, 0]}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[3.65, H / 2, 0.12]} position={[0, H / 2, 0]} />
          </RigidBody>
          <mesh position={[0, 0.5 + GLASS_H / 2, 0]}>
            <boxGeometry args={[7.2, GLASS_H, 0.035]} />
            <meshStandardMaterial
              color="#c1e0e2"
              transparent
              opacity={0.14}
              depthWrite={false}
              roughness={0.15}
            />
          </mesh>
        </group>
      ))}
      <CameraFade>
        <mesh position={[0, H - 0.5, 0]}>
          <boxGeometry args={[3.4, 0.22, 0.25]} />
          <meshStandardMaterial color="#344b50" roughness={0.64} />
        </mesh>
        <Text position={[0, H - 0.49, 0.14]} fontSize={0.12} color="#fff4dd">
          SELAMAT DATANG
        </Text>
      </CameraFade>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.65, (H - 0.65) / 2, -0.65]}>
          <boxGeometry args={[0.035, H - 0.65, 1.3]} />
          <meshStandardMaterial color="#b1d9dc" transparent opacity={0.14} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export function CeilingDetails() {
  return (
    <group
      name="TokoCung-CeilingDetails"
      position={[0, STORE.wallHeight - 3.2, 0]}
      userData={{ ignoreCameraCollision: true }}
    >
      <OutdoorBatch items={ceilingParts} shadows={false} />
    </group>
  );
}

export function RetailDetails() {
  return (
    <group name="TokoCung-RetailDetails">
      <OutdoorBatch items={retailDetailParts} shadows={false} />
      <Plang
        text="GUDANG · KHUSUS STAF"
        position={[WAREHOUSE.passageX, 2.43, STORE.minZ + 0.22]}
        size={0.13}
        board="#d6dfd8"
        textColor="#38504e"
      />
      <group position={[-8.75, 1.9, -1]} rotation-y={Math.PI / 2}>
        <Plang
          text="HARGA HEMAT"
          sub="Setiap hari"
          position={[0, 0, 0]}
          size={0.14}
          board="#c8443a"
          textColor="#fff9e7"
        />
      </group>
      <mesh position={[8.65, 0.7, -11.8]}>
        <capsuleGeometry args={[0.11, 0.32, 4, 8]} />
        <meshStandardMaterial color="#ba4940" />
      </mesh>
      <mesh position={[2, 2.35, -12.77]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.23, 0.23, 0.035, 16]} />
        <meshStandardMaterial color="#fcf5e5" />
      </mesh>
    </group>
  );
}
