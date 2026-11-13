/** @jsxImportSource @/game/jsx */
import { TimedLampHeads, TimedPointLight } from "@/game/time/TimedFixtures";
import { LOW_QUALITY } from "@/game/engine/quality";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { DRIVEWAYS, ROADS, contains } from "../outdoor-layout";
import { CITY_LAMP_POSITIONS, CITY_LAMP_BASE_HALF } from "../city-street-fixtures";
import { OutdoorBatch, type OutdoorPart } from "../OutdoorBatch";
import { Trees } from "../Foliage";
import { BENCHES, TREE_SPOTS } from "../street-props";
import { NATURAL_TREE_TRUNK_HEIGHT, NATURAL_TREE_TRUNK_RADIUS } from "../vegetation";
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
  for (const [x, y, z] of CITY_LAMP_POSITIONS) {
    const metal = (p: AssetPart["p"], s: AssetPart["s"], shape: AssetPart["shape"] = "bevel") =>
      lamps.push({ p, s, shape, color: "#263136", finish: "metal" });
    metal([x, 2.02, z], [0.1, 4.04, 0.1], "cylinder");
    metal([x, 0.21, z], [CITY_LAMP_BASE_HALF * 2, 0.42, CITY_LAMP_BASE_HALF * 2]);
    metal([x, 4.02, z], [0.52, 0.1, 0.42]);
    metal([x, 4.67, z], [0.66, 0.28, 0.57], "cone");
    metal([x, 4.87, z], [0.09, 0.18, 0.09], "cylinder");
    for (const dx of [-0.23, 0.23])
      for (const dz of [-0.15, 0.15]) metal([x + dx, y, z + dz], [0.035, 0.59, 0.035]);
    for (const dy of [-0.15, 0, 0.15]) bulbs.push([x, y + dy, z]);
  }
  const blocked = [...ROADS, ...DRIVEWAYS];
  const treeSpots = TREE_SPOTS.filter(
    (t) => !blocked.some((zone) => contains(zone, { x: t.x, z: t.z }, 0.8)),
  );
  const treeWells: OutdoorPart[] = treeSpots.flatMap(
    (tree) =>
      [
        { p: [tree.x, 0.09, tree.z], s: [0.86, 0.025, 0.86], color: "#4b5140" },
        ...[-1, 1].flatMap((side) => [
          { p: [tree.x + side * 0.48, 0.13, tree.z], s: [0.08, 0.1, 1.04], color: "#9c9f97" },
          { p: [tree.x, 0.13, tree.z + side * 0.48], s: [0.88, 0.1, 0.08], color: "#9c9f97" },
        ]),
      ] as OutdoorPart[],
  );
  return (
    <group name="StreetFurniture">
      <StyledBatch items={lamps} />
      <TimedLampHeads positions={bulbs} />
      {[...CITY_LAMP_POSITIONS]
        .slice()
        .sort((a, b) => Math.hypot(a[0], a[2] - 14) - Math.hypot(b[0], b[2] - 14))
        .slice(0, LOW_QUALITY ? 1 : 2)
        .map((position, i) => (
          <TimedPointLight
            key={i}
            position={[position[0], 4.17, position[2]]}
            intensity={40}
            distance={20}
            circuit="street"
          />
        ))}
      <Trees spots={treeSpots} />
      <OutdoorBatch items={treeWells} shadows={false} />
      {/* Batang saja — kanopi visual tetap ditembus supaya tidak nyangkut di daun. */}
      <RigidBody type="fixed" colliders={false}>
        {treeSpots.map((t) => {
          const trunkH = NATURAL_TREE_TRUNK_HEIGHT * t.scale;
          const half = NATURAL_TREE_TRUNK_RADIUS * t.scale;
          return (
            <CuboidCollider
              key={`tree-${t.x}-${t.z}`}
              args={[half, trunkH * 0.5, half]}
              position={[t.x, trunkH * 0.5, t.z]}
            />
          );
        })}
      </RigidBody>
      {BENCHES.filter((b) => b.position[1] >= 0 && !b.id.startsWith("concert-seat-")).map((b) => (
        <Bench key={b.id} position={[b.position[0], b.position[1], b.position[2]]} yaw={b.yaw} />
      ))}
    </group>
  );
}
