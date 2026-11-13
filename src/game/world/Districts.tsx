/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { useGame } from "@/state/game-store";
import { WaterBed } from "@/game/swimming/BeachGround";
import { CITY_LAKE, DISTRICTS, districtDistance } from "./expansion-plan";
import { BUILDING_LOTS, subtract } from "./outdoor-layout";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { BuildingLot } from "./BuildingLot";
import { DistrictRoadColliders } from "./DistrictRoadColliders";
import { WaterMaterial } from "../swimming/WaterMaterial";
import { Trees } from "./Foliage";
import { NATURAL_TREE_TRUNK_HEIGHT, NATURAL_TREE_TRUNK_RADIUS } from "./vegetation";
import { P } from "./palette";
import { naturalGroundMaterial } from "./natural-ground";

const grounds = DISTRICTS.map((d) => subtract(d, CITY_LAKE.bounds));
const groundParts: OutdoorPart[] = grounds.flat().map((b) => ({
  // Top at -0.02, above the coastal terrain (-0.04) that overlaps x 60–80, to avoid z-fighting.
  p: [(b.minX + b.maxX) / 2, -0.07, (b.minZ + b.maxZ) / 2],
  s: [b.maxX - b.minX, 0.1, b.maxZ - b.minZ],
  color: "#91a875",
}));
const trees = [
  [85, 58],
  [96, 65],
  [116, 65],
  [126, 74],
  [126, 94],
  [88, 94],
  [90, 112],
  [121, 112],
];
const treeSpots = trees.map(([x, z], seed) => ({ x: x!, z: z!, seed, scale: 1.15 }));
const stage: OutdoorPart[] = [
  { p: [104, 0.1, 47], s: [16, 0.28, 7], color: P.wood },
  { p: [104, 2.2, 50], s: [16, 4.2, 0.35], color: P.brand },
  { p: [104, 4.5, 47], s: [18, 0.4, 9], color: P.accentWarn },
  ...[96.5, 111.5].map((x): OutdoorPart => ({
    p: [x, 2.2, 43.7],
    s: [0.35, 4.4, 0.35],
    color: P.woodDark,
  })),
];
const benches: OutdoorPart[] = [88, 124].flatMap((x) =>
  [70, 104].flatMap(
    (z) =>
      [
        { p: [x, 0.6, z], s: [3, 0.3, 1], color: P.wood },
        { p: [x, 1.1, z + 0.45], s: [3, 0.8, 0.2], color: P.woodDark },
      ] as OutdoorPart[],
  ),
);

function District({ index }: { index: number }) {
  const district = DISTRICTS[index]!;
  const [near, setNear] = useState(() => {
    const p = useGame.getState().playerPos;
    return districtDistance(p[0], p[2], district) < 45;
  });
  const elapsed = useRef(0);
  useFrame((_, dt) => {
    elapsed.current += dt;
    if (elapsed.current < 0.2) return;
    elapsed.current = 0;
    const p = useGame.getState().playerPos;
    const next = districtDistance(p[0], p[2], district) < (near ? 60 : 45);
    if (next !== near) setNear(next);
  });
  if (!near) return null;
  return (
    <group name={`district-${district.id}`}>
      <DistrictRoadColliders district={district.id} />
      <RigidBody type="fixed" colliders={false}>
        {grounds[index]!.map((b, i) => (
          <CuboidCollider
            key={i}
            args={[(b.maxX - b.minX) / 2, 0.3, (b.maxZ - b.minZ) / 2]}
            position={[(b.minX + b.maxX) / 2, -0.34, (b.minZ + b.maxZ) / 2]}
          />
        ))}
        {district.id === "park" && (
          <>
            <WaterBed body={CITY_LAKE} />
            {trees.map(([x, z], i) => (
              <CuboidCollider
                key={i}
                args={[
                  NATURAL_TREE_TRUNK_RADIUS * 1.15,
                  (NATURAL_TREE_TRUNK_HEIGHT * 1.15) / 2,
                  NATURAL_TREE_TRUNK_RADIUS * 1.15,
                ]}
                position={[x!, (NATURAL_TREE_TRUNK_HEIGHT * 1.15) / 2, z!]}
              />
            ))}
            {benches
              .filter((_, i) => i % 2 === 0)
              .map((b, i) => (
                <CuboidCollider
                  key={`bench-${i}`}
                  args={[1.5, 0.6, 0.5]}
                  position={[b.p[0], 0.6, b.p[2]]}
                />
              ))}
          </>
        )}
        {district.id === "market" &&
          stage.map((b, i) => (
            <CuboidCollider key={i} args={[b.s[0] / 2, b.s[1] / 2, b.s[2] / 2]} position={b.p} />
          ))}
      </RigidBody>
      {district.id === "market" ? (
        <>
          {BUILDING_LOTS.filter((lot) => lot.district === "market").map((lot) => (
            <BuildingLot key={lot.id} lot={lot} />
          ))}
          <OutdoorBatch items={stage} />
          <Text rotation-y={Math.PI} position={[104, 3.1, 49.8]} fontSize={0.75} color="#fff1d4">
            ALUN-ALUN CUNG
          </Text>
          <Text rotation-y={Math.PI} position={[104, 1.7, 49.8]} fontSize={0.4} color="#fff1d4">
            Main bareng, seru bareng!
          </Text>
        </>
      ) : (
        <>
          <Trees spots={treeSpots} />
          <OutdoorBatch items={benches} />
          <Text position={[106, 2, 112]} fontSize={0.7} color={P.brand}>
            TAMAN KOTA
          </Text>
        </>
      )}
    </group>
  );
}

/** Cheap ground/water silhouette persists; detailed props AND their physics stream together. */
export function Districts() {
  const groundMaterial = useMemo(() => naturalGroundMaterial(), []);
  useEffect(() => () => groundMaterial.dispose(), [groundMaterial]);
  return (
    <>
      <OutdoorBatch items={groundParts} shadows={false} material={groundMaterial} />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[CITY_LAKE.x, CITY_LAKE.surface, CITY_LAKE.z]}
        scale={[CITY_LAKE.rx, CITY_LAKE.rz, 1]}
      >
        <circleGeometry args={[1, 48]} />
        <WaterMaterial body={CITY_LAKE} />
      </mesh>
      {DISTRICTS.map((district, index) => (
        <District key={district.id} index={index} />
      ))}
    </>
  );
}
