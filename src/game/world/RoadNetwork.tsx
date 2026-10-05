/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import {
  ROADS,
  ROAD_SEGMENTS,
  SIDEWALKS,
  PARKING,
  PEDESTRIAN,
  DRIVEWAYS,
  GREEN,
  CROSSWALKS,
  INTERSECTIONS,
  contains,
  type Bounds,
} from "./outdoor-layout";

const part = (b: Bounds, y: number, h: number, color: string): OutdoorPart => ({
  p: [(b.minX + b.maxX) / 2, y, (b.minZ + b.maxZ) / 2],
  s: [b.maxX - b.minX, h, b.maxZ - b.minZ],
  color,
});
const surfaces: OutdoorPart[] = [
  ...GREEN.map((b) => part(b, 0.018, 0.03, "#8ca87b")),
  ...PARKING.map((b) => part(b, 0.024, 0.04, "#a3a69e")),
  ...PEDESTRIAN.map((b) => part(b, 0.032, 0.05, "#dbd3bf")),
  ...ROADS.map((b) => part(b, 0.022, 0.04, "#515b60")),
  ...DRIVEWAYS.map((b) => part(b, 0.027, 0.045, "#929990")),
  ...SIDEWALKS.map((b) => part(b, 0.045, 0.08, "#d5cdbc")),
];
const markings: OutdoorPart[] = [];
const curbs: OutdoorPart[] = [];
for (const r of ROAD_SEGMENTS) {
  for (let a = -r.length / 2 + 1; a < r.length / 2 - 1; a += 3) {
    const x = r.x + (r.axis === "x" ? a : 0),
      z = r.z + (r.axis === "z" ? a : 0);
    if (
      INTERSECTIONS.some((p) => Math.hypot(p.x - x, p.z - z) < 5) ||
      CROSSWALKS.some((b) => contains(b, { x, z }))
    )
      continue;
    markings.push({
      p: [x, 0.05, z],
      s: r.axis === "x" ? [1.5, 0.012, 0.12] : [0.12, 0.012, 1.5],
      color: "#eee1b6",
    });
  }
  for (const side of [-1, 1])
    for (let a = -r.length / 2 + 0.5; a < r.length / 2; a += 1) {
      const x = r.x + (r.axis === "x" ? a : side * (r.width / 2 + 0.06)),
        z = r.z + (r.axis === "z" ? a : side * (r.width / 2 + 0.06));
      if (
        ROADS.some((b) => b.id !== r.id && contains(b, { x, z }, -0.5)) ||
        DRIVEWAYS.some((b) => contains(b, { x, z }, -0.6)) ||
        CROSSWALKS.some((b) => contains(b, { x, z }, -0.6))
      )
        continue;
      curbs.push({
        p: [x, 0.075, z],
        s: r.axis === "x" ? [0.98, 0.15, 0.13] : [0.13, 0.15, 0.98],
        color: Math.floor(a / 3) % 2 ? "#e4ddca" : "#aaa99d",
      });
    }
}
for (const cross of CROSSWALKS) {
  const horizontal = cross.maxX - cross.minX < cross.maxZ - cross.minZ;
  for (let n = 0; n < 8; n++)
    markings.push({
      p: [
        horizontal ? (cross.minX + cross.maxX) / 2 : cross.minX + 0.4 + n * 0.8,
        0.06,
        horizontal ? cross.minZ + 0.4 + n * 0.8 : (cross.minZ + cross.maxZ) / 2,
      ],
      s: horizontal ? [3, 0.015, 0.4] : [0.4, 0.015, 3],
      color: "#f7efdd",
    });
}
for (let i = 0; i < 5; i++)
  markings.push({ p: [-14 + i * 2.5, 0.058, 7.8], s: [0.09, 0.015, 5.6], color: "#f3ead4" });
for (let i = 0; i < 6; i++)
  markings.push({ p: [10.1 + i * 0.8, 0.058, 5.7], s: [0.055, 0.015, 2.4], color: "#f3ead4" });

/** One shared plan supplies straight segments, junction clearance, curb gaps and ramps. */
export function RoadNetwork() {
  const debug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("worldDebug") === "1";
  const debugParts: OutdoorPart[] = debug
    ? [
        ...ROADS.map((b) => part(b, 0.09, 0.015, "#d85b5b")),
        ...SIDEWALKS.map((b) => part(b, 0.1, 0.012, "#67a5d4")),
        ...PARKING.map((b) => part(b, 0.11, 0.012, "#d2b765")),
      ]
    : [];
  return (
    <group name="RoadNetwork">
      <OutdoorBatch items={surfaces} shadows={false} />
      <OutdoorBatch items={markings} shadows={false} />
      <OutdoorBatch items={curbs} shadows={false} />
      {debug && <OutdoorBatch items={debugParts} shadows={false} />}
      <Text position={[-9, 0.075, 9.7]} rotation-x={-Math.PI / 2} fontSize={0.48} color="#fff1d4">
        PARKIR
      </Text>
      <Text position={[12, 0.075, 14]} rotation-x={-Math.PI / 2} fontSize={0.36} color="#fff1d4">
        DROP-OFF · KURIR
      </Text>
      <Text position={[12.5, 0.075, 6.6]} rotation-x={-Math.PI / 2} fontSize={0.24} color="#f9f0dd">
        MOTOR
      </Text>
    </group>
  );
}
