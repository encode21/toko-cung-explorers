/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { GAME_ASSETS } from "@/assets/game-assets";
import { Model } from "./Model";
import { BuildingLot } from "./BuildingLot";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { RoadNetwork } from "./RoadNetwork";
import {
  BUILDING_LOTS,
  DRIVEWAYS,
  ROADS,
  SIDEWALKS,
  contains,
  validateLots,
} from "./outdoor-layout";
import { BENCHES, TREE_SPOTS, robloxTree } from "./street-props";
import { TrafficSystem } from "@/game/traffic/TrafficSystem";
import { LOW_QUALITY, thin } from "@/game/engine/quality";

const lotErrors = validateLots();
if (import.meta.env.DEV && lotErrors.length) console.warn("Invalid outdoor lots", lotErrors);

function Bench({
  position,
  yaw,
}: {
  position: [number, number, number];
  yaw: number;
}) {
  return (
    <group position={position}>
      <group rotation={[0, yaw, 0]}>
        {/* Seat */}
        <mesh position={[0, 0.44, 0.04]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.14, 0.62]} />
          <meshStandardMaterial color="#c4a06a" roughness={0.9} />
        </mesh>
        {/* Back */}
        <mesh position={[0, 0.86, -0.24]} castShadow>
          <boxGeometry args={[1.9, 0.55, 0.12]} />
          <meshStandardMaterial color="#b8925c" roughness={0.9} />
        </mesh>
        {/* Legs */}
        {[-0.78, 0.78].map((x) =>
          [-0.2, 0.22].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.2, z]} castShadow>
              <boxGeometry args={[0.12, 0.4, 0.12]} />
              <meshStandardMaterial color="#5c5750" roughness={0.95} />
            </mesh>
          )),
        )}
        {/* Arm rests */}
        {[-0.92, 0.92].map((x) => (
          <mesh key={`arm-${x}`} position={[x, 0.62, 0]} castShadow>
            <boxGeometry args={[0.1, 0.28, 0.55]} />
            <meshStandardMaterial color="#a88452" roughness={0.9} />
          </mesh>
        ))}
        {/* Collider tipis di papan saja (ikut yaw) — volume penuh mendorong pemain saat Sit. */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.92, 0.07, 0.28]} position={[0, 0.44, 0.04]} />
        </RigidBody>
      </group>
    </group>
  );
}

function StreetFurniture() {
  const lamps: OutdoorPart[] = [];
  for (const strip of SIDEWALKS.filter((_, i) => i % 3 === 0)) {
    const x = (strip.minX + strip.maxX) / 2;
    const z = (strip.minZ + strip.maxZ) / 2;
    const horizontal = strip.maxX - strip.minX > strip.maxZ - strip.minZ;
    lamps.push({
      p: [horizontal ? x : x + 0.35, 1.65, horizontal ? z + 0.35 : z] as [number, number, number],
      s: [0.12, 3.3, 0.12],
      color: "#5a6562",
    });
    lamps.push({
      p: [horizontal ? x : x + 0.35, 3.25, horizontal ? z + 0.35 : z] as [number, number, number],
      s: [0.42, 0.14, 0.28],
      color: "#f5dfad",
    });
  }
  const blocked = [...ROADS, ...DRIVEWAYS];
  const treeSpots = TREE_SPOTS.filter(
    (t) => !blocked.some((zone) => contains(zone, { x: t.x, z: t.z }, 0.8)),
  );
  const trees = treeSpots.flatMap((t) => robloxTree(t.x, t.z, t.scale, t.seed));
  return (
    <group name="StreetFurniture">
      <OutdoorBatch items={lamps} shadows={false} />
      <OutdoorBatch items={trees} shape="box" />
      {/* Batang saja — kanopi visual tetap ditembus supaya tidak nyangkut di daun. */}
      <RigidBody type="fixed" colliders={false}>
        {treeSpots.map((t) => {
          const trunkH = 2.15 * t.scale;
          const half = 0.19 * t.scale;
          return (
            <CuboidCollider
              key={`tree-${t.x}-${t.z}`}
              args={[half, trunkH * 0.5, half]}
              position={[t.x, trunkH * 0.5, t.z]}
            />
          );
        })}
      </RigidBody>
      {BENCHES.map((b) => (
        <Bench key={b.id} position={[b.position[0], b.position[1], b.position[2]]} yaw={b.yaw} />
      ))}
    </group>
  );
}

function WorldBounds() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[56, 1.4, 0.25]} position={[0, 1.4, -56]} />
      <CuboidCollider args={[56, 1.4, 0.25]} position={[0, 1.4, 56]} />
      <CuboidCollider args={[0.25, 1.4, 56]} position={[-56, 1.4, 0]} />
      <CuboidCollider args={[0.25, 1.4, 56]} position={[56, 1.4, 0]} />
    </RigidBody>
  );
}

/** Intentional neighborhood: every visible building is a validated lot around a shared road plan. */
export function OutdoorNeighborhood() {
  const lots = BUILDING_LOTS.filter((lot) => lot.id !== "toko-cung");
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]} receiveShadow>
          <planeGeometry args={[240, 240]} />
          <meshStandardMaterial color="#91a875" roughness={1} />
        </mesh>
        <CuboidCollider args={[120, 0.1, 120]} position={[0, -0.14, 0]} />
      </RigidBody>
      <RoadNetwork />
      <StreetFurniture />
      {lots.map((lot) => (
        <BuildingLot key={lot.id} lot={lot} />
      ))}
      <group position={[0, 0, -26]}>
        <Text position={[0, 2.4, 0]} fontSize={0.28} color="#fff3d8">
          AKSES DELIVERY
        </Text>
        <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[18, 4]} />
          <meshStandardMaterial color="#737b77" roughness={0.9} />
        </mesh>
      </group>
      {!LOW_QUALITY &&
        thin(GAME_ASSETS.skyline, 3).map((url, i) => (
          <Model key={url} url={url} height={24 + i * 5} position={[-38 + i * 38, 0, 58]} />
        ))}
      <TrafficSystem />
      <WorldBounds />
    </>
  );
}
