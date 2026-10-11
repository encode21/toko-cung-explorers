/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { DoubleSide } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NpcLabel } from "@/game/world/NpcLabel";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/identity/avatar";

type BoothBrand = {
  id: string;
  /** Short mark on the fascia */
  mark: string;
  /** Subtitle under the mark */
  line: string;
  accent: string;
  accentDark: string;
  position: [number, number, number];
  /** Yaw in radians; fascia faces local +Z after this rotation. */
  yaw: number;
  host: string;
  avatar: AvatarConfig;
};

/**
 * Red forecourt line sits at z≈10.3 — keep booths at z≤9.2 (toward the building).
 * Mayora sits at the east end past Wings, facing the store (vertical / −X).
 */
const BOOTHS: BoothBrand[] = [
  {
    id: "sc-johnson",
    mark: "SC JOHNSON",
    line: "Promo rumah tangga",
    accent: "#1565c0",
    accentDark: "#0d47a1",
    position: [3.4, 0, 9.05],
    yaw: 0,
    host: "Dimas · SC Johnson",
    avatar: {
      ...DEFAULT_AVATAR,
      outfit: "smart",
      outfitColor: "#f5f7fa",
      hair: "sidepart",
      accessory: "none",
    },
  },
  {
    id: "wings",
    mark: "WINGS",
    line: "Promo perawatan rumah",
    accent: "#2e7d32",
    accentDark: "#1b5e20",
    position: [6.4, 0, 9.05],
    yaw: 0,
    host: "Sinta · Wings",
    avatar: {
      ...DEFAULT_AVATAR,
      outfit: "smart",
      outfitColor: "#ffffff",
      hair: "ponytail",
      accessory: "none",
    },
  },
  {
    id: "mayora",
    mark: "MAYORA",
    line: "Sampling snack & wafer",
    accent: "#c62828",
    accentDark: "#8e1b1b",
    // East tip past Wings — clear of parking; facing store (−X).
    position: [8.9, 0, 8.65],
    yaw: Math.PI / 2,
    host: "Rina · Mayora",
    avatar: {
      ...DEFAULT_AVATAR,
      outfit: "smart",
      outfitColor: "#ffffff",
      hair: "bob",
      pantsColor: "#c62828",
    },
  },
];

function BrandBooth({ brand }: { brand: BoothBrand }) {
  return (
    <group
      position={brand.position}
      rotation={[0, brand.yaw, 0]}
      name={`principal-booth-${brand.id}`}
    >
      {/* White base */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[1.85, 0.06, 1.35]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.55} />
      </mesh>
      {/* Counter facing +Z (street / players) */}
      <mesh position={[0, 0.82, 0.05]} castShadow>
        <boxGeometry args={[1.65, 0.1, 0.7]} />
        <meshStandardMaterial color="#ffffff" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.4, 0.05]} castShadow>
        <boxGeometry args={[1.55, 0.7, 0.62]} />
        <meshStandardMaterial color="#eef1f4" roughness={0.5} />
      </mesh>
      {/* Street-facing logo fascia (+Z) */}
      <mesh position={[0, 1.55, 0.42]} castShadow>
        <boxGeometry args={[1.75, 0.85, 0.07]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.9, 0.46]}>
        <boxGeometry args={[1.75, 0.14, 0.02]} />
        <meshStandardMaterial color={brand.accent} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.2, 0.46]}>
        <boxGeometry args={[1.75, 0.14, 0.02]} />
        <meshStandardMaterial color={brand.accentDark} roughness={0.4} />
      </mesh>
      {/* Logo plate */}
      <mesh position={[0, 1.55, 0.47]}>
        <boxGeometry args={[1.45, 0.42, 0.03]} />
        <meshStandardMaterial color="#ffffff" roughness={0.25} />
      </mesh>
      <Text
        position={[0, 1.6, 0.5]}
        fontSize={brand.mark.length > 8 ? 0.14 : 0.18}
        color={brand.accent}
        anchorX="center"
        anchorY="middle"
        maxWidth={1.4}
        outlineWidth={0.008}
        outlineColor="#ffffff"
      >
        {brand.mark}
      </Text>
      <Text
        position={[0, 1.38, 0.5]}
        fontSize={0.07}
        color="#5a6570"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.4}
      >
        {brand.line}
      </Text>
      {/* Back panel */}
      <mesh position={[0, 1.35, -0.35]} castShadow>
        <boxGeometry args={[1.7, 1.1, 0.06]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.7, -0.32]}>
        <boxGeometry args={[1.5, 0.35, 0.02]} />
        <meshStandardMaterial color={brand.accent} roughness={0.45} />
      </mesh>
      <Text
        position={[0, 1.7, -0.3]}
        fontSize={0.11}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.4}
      >
        {brand.mark}
      </Text>
      {/* White umbrella */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 1.35, 8]} />
        <meshStandardMaterial color="#cfd4d9" metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <coneGeometry args={[0.95, 0.28, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.55} side={DoubleSide} />
      </mesh>
      {/* Sample product cubes in brand color */}
      {(
        [
          [-0.4, 0.95, 0.15],
          [0, 0.95, 0.08],
          [0.4, 0.95, 0.18],
        ] as [number, number, number][]
      ).map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <boxGeometry args={[0.24, 0.14, 0.2]} />
          <meshStandardMaterial
            color={i === 1 ? brand.accentDark : brand.accent}
            roughness={0.55}
          />
        </mesh>
      ))}

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.85, 0.5, 0.4]} position={[0, 0.5, 0.05]} />
      </RigidBody>

      {/* Host stands behind the counter (not inside the cabinet volume). */}
      <group position={[0, 0, -0.72]} rotation={[0, Math.PI, 0]}>
        <BaseAvatarV2 avatar={brand.avatar} speed={0} />
        <NpcLabel text={brand.host} />
      </group>
    </group>
  );
}

/** White principal promo booths — one brand per booth along the storefront. */
export function PrincipalPromoStand() {
  return (
    <group name="principal-promo-stands">
      {BOOTHS.map((brand) => (
        <BrandBooth key={brand.id} brand={brand} />
      ))}
    </group>
  );
}
