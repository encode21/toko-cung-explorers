/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { WaterMaterial } from "./WaterMaterial";
import { WaterEffects } from "./WaterEffects";
import { Trees } from "@/game/world/Foliage";
import { subtract } from "@/game/world/outdoor-layout";
import { BEACH, WATER_BODIES, OCEAN_VISUAL_EXTENT, FISHING_WATER_BOUNDS } from "./model";
const box = (p: OutdoorPart["p"], s: OutdoorPart["s"], color: string): OutdoorPart => ({
  p,
  s,
  color,
});
const parts: OutdoorPart[] = [
  // A short sand access from the existing west sidewalk. No road/building is removed.
  box([-36.4, 0.005, -29], [4.2, 0.025, 2.2], "#efdaad"),
  box([-48, -0.3, -32.8], [2.2, 1, 7], "#9a7558"),
  ...Array.from({ length: 20 }, (_, i) =>
    box([-48, 0.22, -29.5 - i * 0.35], [2.2, 0.08, 0.32], i % 2 ? "#c69a70" : "#dbb282"),
  ),
  ...[-49.05, -46.95].flatMap((x) =>
    [-30, -32.5, -35.5].map((z) => box([x, 0.65, z], [0.1, 1, 0.1], "#79584d")),
  ),
  box([-41.2, 1.2, -28.2], [0.16, 2.4, 0.16], "#79584d"),
  box([-41.2, 2.3, -28.2], [4, 1.3, 0.16], "#39bedc"),
  box([-41.2, 3.03, -28.2], [4.3, 0.15, 0.25], "#ffb546"),
  box([-34.7, 1.1, -35.8], [0.1, 2.2, 0.1], "#79584d"),
  box([-34.7, 2.05, -35.8], [1.4, 0.6, 0.12], "#39bedc"),
  ...[-42, -44].map((x, i) => box([x, 0.01, -28.6], [1.2, 0.04, 1.7], i ? "#f6a85e" : "#7bcbd6")),
];
const palms = [[-53,-27],[-37,-31],[-37.2,-50]].map(([x,z],seed)=>({x:x!,z:z!,seed,palm:true}));
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
          <WaterMaterial body={WATER_BODIES[0]!}/>
        </mesh>
      ))}

    </group>
  );
}
export function SwimmingBeach() {
  return (
    <group name="SwimmingBeach">
      <WaterEffects/>
      <OutdoorBatch items={parts} />
      <BeachWater />
      <RigidBody
        type="fixed"
        colliders={false}
        position={[-48, 0.08, -28.7]}
        rotation={[Math.atan(0.24 / 1.6), 0, 0]}
      >
        <CuboidCollider args={[1.1, 0.04, 0.8]} />
        <mesh receiveShadow>
          <boxGeometry args={[2.2, 0.08, 1.6]} />
          <meshStandardMaterial color="#dbb282" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.1, 0.5, 3.5]} position={[-48, -0.3, -32.8]} />
      </RigidBody>
      <Trees spots={palms}/>
      <RigidBody type="fixed" colliders={false}>{palms.map(p=><CuboidCollider key={p.x} args={[.15,1.55,.15]} position={[p.x,1.55,p.z]}/>)}</RigidBody>
      <group position={[-37, 0, -58]}>
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
      <group position={[-36.5, 0, -46]}>
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
      <Text position={[-41.2, 2.55, -28.1]} fontSize={0.42} color="#134e63">
        Pantai Cung
      </Text>
      <Text position={[-41.2, 2.08, -28.1]} fontSize={0.18} color="#134e63">
        ANALOG / WASD · BERENANG OTOMATIS
      </Text>
      <Text position={[-41.2, 1.83, -28.1]} fontSize={0.16} color="#134e63">
        TOMBOL LOMPAT / SPASI: MENGAYUH · KE TEPI UNTUK KELUAR
      </Text>
      <Text position={[-34.7, 2.08, -35.72]} fontSize={0.2} color="#134e63">
        ← PANTAI
      </Text>
      <Text
        position={[-44.8, 0.012, -28]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.26}
        color="#397780"
      >
        MASUK LEWAT TEPI LANDAI
      </Text>
    </group>
  );
}
