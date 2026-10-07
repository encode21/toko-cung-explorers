/** @jsxImportSource @/game/jsx */
import { TimedLampHeads, TimedPointLight } from "@/game/time/TimedFixtures";
import { LOW_QUALITY } from "@/game/engine/quality";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { DRIVEWAYS, ROADS, SIDEWALKS, contains } from "../outdoor-layout";
import { BENCHES, TREE_SPOTS, robloxTree } from "../street-props";
const benchParts: AssetPart[] = [
  ...[-0.16, 0.04, 0.24].map((z) => ({
    p: [0, 0.44, z] as [number, number, number],
    s: [1.9, 0.14, 0.18] as [number, number, number],
    color: "#bca17c",
    finish: "wood" as const,
  })),
  ...[0.69, 0.86, 1.03].map((y) => ({
    p: [0, y, -0.24] as [number, number, number],
    s: [1.9, 0.13, 0.1] as [number, number, number],
    color: "#b39770",
    finish: "wood" as const,
  })),
  ...[-0.78, 0.78].flatMap((x) => [
    {
      p: [x, 0.22, 0.02] as [number, number, number],
      s: [0.1, 0.44, 0.55] as [number, number, number],
      color: "#52676b",
      finish: "metal" as const,
    },
    {
      p: [x, 0.63, 0.02] as [number, number, number],
      s: [0.09, 0.09, 0.6] as [number, number, number],
      color: "#52676b",
      finish: "metal" as const,
    },
  ]),
];
function Bench({ position, yaw }: { position: [number, number, number]; yaw: number }) {
  return (
    <group position={position} rotation-y={yaw}>
      <StyledBatch items={benchParts} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.92, 0.07, 0.28]} position={[0, 0.44, 0.04]} />
      </RigidBody>
    </group>
  );
}

export function StreetFurniture() {
  const lamps: AssetPart[] = [];
  const bulbs: [number, number, number][] = [];
  for (const strip of SIDEWALKS.filter((_, i) => i % 3 === 0)) {
    const x = (strip.minX + strip.maxX) / 2;
    const z = (strip.minZ + strip.maxZ) / 2;
    const horizontal = strip.maxX - strip.minX > strip.maxZ - strip.minZ;
    lamps.push({
      p: [horizontal ? x : x + 0.35, 1.65, horizontal ? z + 0.35 : z] as [number, number, number],
      s: [0.12, 3.3, 0.12],
      color: "#5a6562",
      shape: "cylinder",
      finish: "metal",
    });
    bulbs.push([horizontal ? x : x + 0.35, 3.25, horizontal ? z + 0.35 : z]);
  }
  const blocked = [...ROADS, ...DRIVEWAYS];
  const treeSpots = TREE_SPOTS.filter(
    (t) => !blocked.some((zone) => contains(zone, { x: t.x, z: t.z }, 0.8)),
  );
  const trees: AssetPart[] = treeSpots.flatMap((t) =>
    robloxTree(t.x, t.z, t.scale, t.seed).map((part, i) => ({
      ...part,
      color: i < 2 ? part.color : ["#709260", "#648553", "#809e6e"][(i + t.seed) % 3]!,
      finish: i < 2 ? ("wood" as const) : ("plastic" as const),
    })),
  );
  return (
    <group name="StreetFurniture">
      <StyledBatch items={lamps} />
      <TimedLampHeads positions={bulbs} />
      {bulbs
        .slice()
        .sort((a, b) => Math.hypot(a[0], a[2] - 14) - Math.hypot(b[0], b[2] - 14))
        .slice(0, LOW_QUALITY ? 1 : 2)
        .map((position, i) => (
          <TimedPointLight
            key={i}
            position={[position[0], 3.05, position[2]]}
            intensity={14}
            distance={13}
            circuit="street"
          />
        ))}
      <StyledBatch items={trees} />
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
