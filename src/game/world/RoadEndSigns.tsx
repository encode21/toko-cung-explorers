/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { ISLAND_EDGE } from "../swimming/model";
import { DISTRICTS } from "./expansion-plan";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";

// Face drivers approaching the four roads that continue visually beyond dry land.
const ends = [
  { x: -ISLAND_EDGE + 2, z: 20, yaw: Math.PI / 2 },
  { x: DISTRICTS[0].maxX - 2, z: 20, yaw: -Math.PI / 2 },
  { x: -30, z: -ISLAND_EDGE + 2, yaw: 0 },
  { x: -30, z: ISLAND_EDGE - 2, yaw: Math.PI },
];
const parts: OutdoorPart[] = [
  { p: [4.3, 1.1, 0], s: [0.12, 2.2, 0.12], color: "#79584d" },
  { p: [4.3, 2.25, 0], s: [3, 1.05, 0.15], color: "#fff0ce" },
  ...Array.from({ length: 8 }, (_, i): OutdoorPart => ({
    p: [-2.8 + i * 0.8, 0.058, 0],
    s: [0.8, 0.02, 0.5],
    color: i % 2 ? "#79584d" : "#ffb546",
  })),
];

export function RoadEndSigns() {
  return (
    <group name="RoadEndSigns">
      {ends.map(({ x, z, yaw }) => (
        <group key={`${x}:${z}`} position={[x, 0, z]} rotation={[0, yaw, 0]}>
          <OutdoorBatch items={parts} shadows={false} />
          <Text position={[4.3, 2.45, 0.085]} fontSize={0.28} color="#79584d">
            BATAS KOTA
          </Text>
          <Text position={[4.3, 2.08, 0.085]} fontSize={0.25} color="#98573a">
            PUTAR BALIK
          </Text>
        </group>
      ))}
    </group>
  );
}
