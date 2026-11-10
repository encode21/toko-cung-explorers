/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { Trees } from "@/game/world/Foliage";
import { WaterMaterial } from "@/game/swimming/WaterMaterial";
import { MOUNTAIN_WATER } from "@/game/swimming/model";
import { mountainGroundHeight } from "./model";
import { MountainLantern } from "./MountainLantern";

function Pier({ x }: { x: number }) {
  const parts = useMemo<OutdoorPart[]>(() => {
    const list: OutdoorPart[] = [];
    for (let i = 0; i < 32; i++)
      list.push({
        p: [x, 2.09, 350 + (i + 0.5) * 0.5],
        s: [4.8, 0.22, 0.5],
        color: i % 3 ? "#a38b65" : "#8c7658",
      });
    for (let i = 0; i < 16; i++)
      list.push({
        p: [x, 2.09, 366 + (i + 0.5) * 0.5],
        s: [8, 0.22, 0.5],
        color: i % 3 ? "#a38b65" : "#8c7658",
      });
    for (const side of [-1, 1])
      for (const z of [352, 356, 360, 364, 368, 373]) {
        const px = x + side * (z < 366 ? 2.35 : 3.6);
        list.push({ p: [px, -0.7, z], s: [0.24, 5.8, 0.24], color: "#68543b" });
        if (z < 366) list.push({ p: [px, 2.8, z], s: [0.16, 1.2, 0.16], color: "#6a553d" });
      }
    for (const side of [-1, 1])
      list.push({ p: [x + side * 2.35, 3.3, 358], s: [0.11, 0.14, 16], color: "#7c6546" });
    for (const sx of [-2.85, 2.85])
      for (const sz of [-2.85, 2.85])
        list.push({ p: [x + sx, 3.7, 370 + sz], s: [0.2, 3, 0.2], color: "#6d563c" });
    list.push(
      { p: [x, 2.65, 371.9], s: [4.6, 0.18, 0.7], color: "#876944" },
      { p: [x, 3.05, 372.2], s: [4.6, 0.7, 0.12], color: "#876944" },
    );
    return list;
  }, [x]);
  return (
    <group name="MountainCoastalPier">
      <OutdoorBatch items={parts} />
      <mesh position={[x, 5.35, 370]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[5.45, 1.65, 4]} />
        <meshStandardMaterial color="#6f7151" roughness={1} />
      </mesh>
      <RigidBody type="fixed" colliders={false} userData={{ mountainTrail: true }}>
        <CuboidCollider args={[2.4, 0.11, 8]} position={[x, 2.09, 358]} />
        <CuboidCollider args={[4, 0.11, 4]} position={[x, 2.09, 370]} />
        {[-1, 1].map((side) => (
          <CuboidCollider key={side} args={[0.08, 0.6, 8]} position={[x + side * 2.35, 2.8, 358]} />
        ))}
        <CuboidCollider args={[2.3, 0.35, 0.4]} position={[x, 2.55, 372]} />
      </RigidBody>
      <MountainLantern position={[x - 3.4, 2.2, 366.6]} />
      <MountainLantern position={[x + 3.4, 2.2, 366.6]} />
    </group>
  );
}

export function MountainCoast() {
  const palms = useMemo(
    () =>
      [
        [926, 338],
        [942, 351],
        [960, 344],
        [985, 347],
        [1015, 345],
        [1048, 344],
        [1075, 341],
        [1084, 352],
        [918, 328],
        [1098, 332],
      ].map(([x, z], i) => ({
        x: x!,
        z: z!,
        y: mountainGroundHeight(x!, z!),
        scale: 2.3 + (i % 3) * 0.2,
        seed: i % 4,
        palm: true,
      })),
    [],
  );
  return (
    <group name="MountainCoastalBasecamp">
      <mesh name="MountainOcean" position={[1000, 0, 300]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1000, 1100]} />
        <WaterMaterial body={MOUNTAIN_WATER} />
      </mesh>
      <Trees spots={palms} />
      <Pier x={966} />
      <Pier x={1037} />
    </group>
  );
}
