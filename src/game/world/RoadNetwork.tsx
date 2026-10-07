/** @jsxImportSource @/game/jsx */
import { smoothRoadPath } from "./road-path";
import { RoadSurface } from "./RoadSurface";
import { ASPHALT_CONTOURS, WALK_CONTOURS, DRIVE_CONTOURS, ROAD_STYLE } from "./road-surfaces";
import { contourEdges } from "./road-geometry";
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
  pathLength,
  samplePath,
  type Bounds,
} from "./outdoor-layout";

const part = (b: Bounds, y: number, h: number, color: string): OutdoorPart => ({
  p: [(b.minX + b.maxX) / 2, y, (b.minZ + b.maxZ) / 2],
  s: [b.maxX - b.minX, h, b.maxZ - b.minZ],
  color,
});
const surfaces: OutdoorPart[] = [
  ...GREEN.map((b) => part(b, 0.018, 0.03, "#8ca87b")),

  ...PEDESTRIAN.map((b) => part(b, 0.032, 0.05, "#dbd3bf")),
];
const markings: OutdoorPart[] = [];
const curbs: OutdoorPart[] = [];
for (const r of ROAD_SEGMENTS) {
  for (let a = -r.length / 2 + 1; a < r.length / 2 - 1; a += 3) {
    const x = r.x + (r.axis === "x" ? a : 0),
      z = r.z + (r.axis === "z" ? a : 0);
    if (
      INTERSECTIONS.some((p) => Math.hypot(p.x - x, p.z - z) < 5.5) ||
      [...CROSSWALKS, ...DRIVEWAYS].some((b) => contains(b, { x, z }, -0.8))
    )
      continue;
    markings.push({
      p: [x, 0.05, z],
      s: r.axis === "x" ? [1.5, 0.012, 0.12] : [0.12, 0.012, 1.5],
      color: "#eee1b6",
    });
  }
}
// A two-arm bend gets a dashed curved divider; T/cross junctions stay unmarked.
for (const corner of INTERSECTIONS.filter((p) => p.type === "corner")) {
  const curve = smoothRoadPath(
    [{ x: corner.x - 6, z: corner.z }, corner, { x: corner.x, z: corner.z + 6 }],
    4,
  );
  for (let d = 2; d < pathLength(curve) - 1; d += 3) {
    const p = samplePath(curve, d);
    markings.push({
      p: [p.x, 0.05, p.z],
      s: [1.5, 0.012, 0.12],
      ry: -Math.atan2(p.dz, p.dx),
      color: "#eee1b6",
    });
  }
}
// Curbs follow the same chamfered union outline, never internal module joins.
for (const { a, b } of contourEdges(ASPHALT_CONTOURS)) {
  const length = Math.hypot(b.x - a.x, b.z - a.z),
    count = Math.ceil(length);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count,
      x = a.x + (b.x - a.x) * t,
      z = a.z + (b.z - a.z) * t;
    if ([...DRIVEWAYS, ...CROSSWALKS].some((c) => contains(c, { x, z }, -0.6))) continue;
    curbs.push({
      p: [x, ROAD_STYLE.curbY, z],
      s: [length / count + 0.002, ROAD_STYLE.curbHeight, 0.13],
      ry: -Math.atan2(b.z - a.z, b.x - a.x),
      color: i % 6 < 3 ? "#e4ddca" : "#aaa99d",
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
      <RoadSurface
        name="ConnectedAsphalt"
        contours={ASPHALT_CONTOURS}
        height={ROAD_STYLE.asphaltY}
        color={ROAD_STYLE.asphalt}
      />
      <RoadSurface
        name="ConnectedSidewalks"
        contours={WALK_CONTOURS}
        height={ROAD_STYLE.sidewalkY}
        color="#d5cdbc"
      />
      <RoadSurface
        name="ConnectedDriveways"
        contours={DRIVE_CONTOURS}
        height={0.0495}
        color="#929990"
      />
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
