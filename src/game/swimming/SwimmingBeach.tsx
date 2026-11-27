/** @jsxImportSource @/game/jsx */
import { Plang } from "@/game/world/Plang";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { WaterMaterial } from "./WaterMaterial";
import { WaterEffects } from "./WaterEffects";
import { Trees } from "@/game/world/Foliage";
import { subtract } from "@/game/world/outdoor-layout";
import {
  BEACH,
  WATER_BODIES,
  OCEAN_VISUAL_EXTENT,
  FISHING_WATER_BOUNDS,
  beachFloorY,
} from "./model";
const box = (p: OutdoorPart["p"], s: OutdoorPart["s"], color: string): OutdoorPart => ({
  p,
  s,
  color,
});
const parts: OutdoorPart[] = [
  // Dry access joins the west footpath; the beach is separate from the gate's bus apron.
  box([-64, 0.005, 9], [2.4, 0.025, 8], "#efdaad"),
  box([-78, -1.45, -27.8], [2.2, 3.3, 7], "#9a7558"),
  ...Array.from({ length: 20 }, (_, i) =>
    box([-78, 0.22, -24.5 - i * 0.35], [2.2, 0.08, 0.32], i % 2 ? "#c69a70" : "#dbb282"),
  ),
  ...[-79.05, -76.95].flatMap((x) =>
    [-25, -27.5, -30.5].map((z) => box([x, 0.65, z], [0.1, 1, 0.1], "#79584d")),
  ),
  ...[-73, -75].map((x, i) => box([x, 0.01, -15], [1.2, 0.04, 1.7], i ? "#f6a85e" : "#7bcbd6")),
];
const palms = [
  [-89, 5],
  [-67, -20],
  [-81, 3],
].map(([x, z], seed) => ({ x: x!, z: z!, y: beachFloorY(x!, z!), seed, palm: true }));
const oceanPatches = subtract(
  {
    minX: -OCEAN_VISUAL_EXTENT,
    maxX: OCEAN_VISUAL_EXTENT,
    minZ: -OCEAN_VISUAL_EXTENT,
    maxZ: OCEAN_VISUAL_EXTENT,
  },
  FISHING_WATER_BOUNDS,
);
/** Sea reaches the fog horizon. Land occludes it; the fishing pond has its own water surface. */
function BeachWater() {
  return (
    <group name="OpenOcean">
      {oceanPatches.map((b, i) => (
        <mesh
          key={i}
          position={[(b.minX + b.maxX) / 2, BEACH.surface, (b.minZ + b.maxZ) / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[b.maxX - b.minX, b.maxZ - b.minZ]} />
          <WaterMaterial body={WATER_BODIES[0]!} />
        </mesh>
      ))}
    </group>
  );
}
export function SwimmingBeach() {
  return (
    <group name="SwimmingBeach">
      <WaterEffects />
      <OutdoorBatch items={parts} />
      <BeachWater />
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-78, 0.08, -23.7]}
        rotation={[Math.atan(0.24 / 1.6), 0, 0]}
      >
        <CuboidCollider args={[1.1, 0.04, 0.8]} />
        <mesh receiveShadow>
          <boxGeometry args={[2.2, 0.08, 1.6]} />
          <meshStandardMaterial color="#dbb282" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.1, 1.65, 3.5]} position={[-78, -1.45, -27.8]} />
      </RigidBody>
      <Trees spots={palms} />
      <RigidBody type="fixed" colliders={false}>
        {palms.map((p) => (
          <CuboidCollider key={p.x} args={[0.15, 1.55, 0.15]} position={[p.x, p.y + 1.55, p.z]} />
        ))}
      </RigidBody>
      <group name="BeachLighthouse" position={[-87, 0, -18]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[1.15, 1.3, 0.3, 10]} />
          <meshStandardMaterial color="#d8cfb2" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[0, 0.65 + i * 0.8, 0]}>
            <cylinderGeometry args={[0.55, 0.65, 0.8, 12]} />
            <meshStandardMaterial color={i % 2 ? "#6cbed1" : "#fff1d6"} />
          </mesh>
        ))}
        <mesh position={[0, 4.55, 0]}>
          <cylinderGeometry args={[0.57, 0.57, 0.6, 10]} />
          <meshStandardMaterial color="#ffe6a0" emissive="#ffe6a0" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 5.05, 0]}>
          <coneGeometry args={[0.85, 0.5, 10]} />
          <meshStandardMaterial color="#f4b654" />
        </mesh>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.7, 2.5, 0.7]} position={[0, 2.5, 0]} />
        </RigidBody>
      </group>
      {/* Shade and seating stay on the dry sand, with a clear approach to the pier. */}
      <group position={[-71, 0, -13]}>
        <mesh position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 2.5, 6]} />
          <meshStandardMaterial color="#79584d" />
        </mesh>
        <mesh position={[0, 2.55, 0]}>
          <coneGeometry args={[1.65, 0.65, 8]} />
          <meshStandardMaterial color="#ffb963" />
        </mesh>
        <OutdoorBatch items={[box([0, 0.3, 0.5], [1.6, 0.12, 0.65], "#e9d6b6")]} />
      </group>
      <Plang
        mode="post"
        text="Pantai Cung"
        sub={
          "ANALOG / WASD · BERENANG OTOMATIS\nTOMBOL LOMPAT / SPASI: MENGAYUH · KE TEPI UNTUK KELUAR"
        }
        position={[-70, 0, 6]}
        width={6}
        size={0.42}
        board="#134e63"
        textColor="#fff7d9"
        twoSided
      />

      <Plang
        mode="post"
        text="← PANTAI"
        position={[-63, 0, 11.4]}
        size={0.2}
        board="#134e63"
        textColor="#fff7d9"
        twoSided
      />
      <Text
        position={[-71, 0.012, 3]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.26}
        color="#397780"
      >
        MASUK LEWAT TEPI LANDAI
      </Text>
    </group>
  );
}
