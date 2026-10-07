import { smoothRoadPath } from "./road-path";
/** Shared meter-based plan: renderers, traffic, minimap and validation consume this data. */
export type Point = { x: number; z: number };
export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Zone = Bounds & {
  id: string;
  kind: "road" | "sidewalk" | "parking" | "pedestrian" | "green" | "driveway";
};
export const rect = (x: number, z: number, w: number, d: number): Bounds => ({
  minX: x - w / 2,
  maxX: x + w / 2,
  minZ: z - d / 2,
  maxZ: z + d / 2,
});
export function intersects(a: Bounds, b: Bounds, margin = 0) {
  return (
    a.minX < b.maxX + margin &&
    a.maxX > b.minX - margin &&
    a.minZ < b.maxZ + margin &&
    a.maxZ > b.minZ - margin
  );
}
export function contains(a: Bounds, p: Point, margin = 0) {
  return (
    p.x >= a.minX + margin &&
    p.x <= a.maxX - margin &&
    p.z >= a.minZ + margin &&
    p.z <= a.maxZ - margin
  );
}
export function subtract(a: Bounds, b: Bounds): Bounds[] {
  if (!intersects(a, b)) return [a];
  const x0 = Math.max(a.minX, b.minX),
    x1 = Math.min(a.maxX, b.maxX),
    z0 = Math.max(a.minZ, b.minZ),
    z1 = Math.min(a.maxZ, b.maxZ);
  return [
    { minX: a.minX, maxX: x0, minZ: a.minZ, maxZ: a.maxZ },
    { minX: x1, maxX: a.maxX, minZ: a.minZ, maxZ: a.maxZ },
    { minX: x0, maxX: x1, minZ: a.minZ, maxZ: z0 },
    { minX: x0, maxX: x1, minZ: z1, maxZ: a.maxZ },
  ].filter((r) => r.maxX - r.minX > 0.01 && r.maxZ - r.minZ > 0.01);
}
export interface RoadSegment {
  id: string;
  axis: "x" | "z";
  x: number;
  z: number;
  length: number;
  width: number;
}
export const ROAD_SEGMENTS: RoadSegment[] = [
  { id: "utama", axis: "x", x: 0, z: 20, length: 600, width: 6.4 },
  { id: "kampung", axis: "z", x: -30, z: 0, length: 600, width: 6.4 },
  { id: "taman", axis: "z", x: 22, z: -6, length: 52, width: 6.4 },
  { id: "gudang", axis: "x", x: -4, z: -32, length: 52, width: 6.4 },
];
export const INTERSECTIONS = [
  { x: -30, z: 20, type: "cross" },
  { x: 22, z: 20, type: "tee" },
  { x: -30, z: -32, type: "tee" },
  { x: 22, z: -32, type: "corner" },
] as const;
export const ROADS: Zone[] = [
  ...ROAD_SEGMENTS.map((r) => ({
    ...rect(r.x, r.z, r.axis === "x" ? r.length : r.width, r.axis === "z" ? r.length : r.width),
    id: r.id,
    kind: "road" as const,
  })),
  ...INTERSECTIONS.map((p, i) => ({
    ...rect(p.x, p.z, 6.4, 6.4),
    id: `junction-${i}`,
    kind: "road" as const,
  })),
];
export const CROSSWALKS = [
  { id: "toko", ...rect(0, 20, 3, 6.4) },
  { id: "barat", ...rect(-23, 20, 3, 6.4) },
  { id: "timur", ...rect(15, 20, 3, 6.4) },
  { id: "gang", ...rect(-30, 12, 6.4, 3) },
];
export const DRIVEWAYS: Zone[] = [
  { id: "delivery", kind: "driveway", ...rect(13, 15.3, 24, 4.6) },
  { id: "parking-entry", kind: "driveway", ...rect(-11.8, 13.7, 4.4, 7.8) },
  { id: "rear-access", kind: "driveway", ...rect(12, -26, 10, 5) },
  { id: "loading-entry", kind: "driveway", ...rect(14, -28, 6.4, 9) },
  { id: "pickup-entry", kind: "driveway", ...rect(15.5, 10, 4, 12) },
];
const sidewalkStrips = [
  ...ROAD_SEGMENTS.flatMap((r) =>
    [-1, 1].map((side) =>
      r.axis === "x"
        ? rect(r.x, r.z + side * (r.width / 2 + 1), r.length, 2)
        : rect(r.x + side * (r.width / 2 + 1), r.z, 2, r.length),
    ),
  ),
  ...INTERSECTIONS.map((p) => rect(p.x, p.z, 10.4, 10.4)),
];
export const SIDEWALKS: Zone[] = sidewalkStrips
  .flatMap((strip) =>
    [...ROADS, ...DRIVEWAYS].reduce(
      (pieces, cut) => pieces.flatMap((p) => subtract(p, cut)),
      [strip],
    ),
  )
  .map((b, i) => ({ ...b, id: `walk-${i}`, kind: "sidewalk" }));
export const PARKING: Zone[] = [
  { id: "customer-parking", kind: "parking", ...rect(-9, 7.8, 10, 6.4) },
  { id: "motor-parking", kind: "parking", ...rect(12.5, 5.7, 5, 3) },
  { id: "loading-yard", kind: "parking", ...rect(0, -26, 19, 5) },
];
export const PEDESTRIAN: Zone[] = [
  { id: "entry-walk", kind: "pedestrian", ...rect(0, 10, 3.2, 13.6) },
  { id: "shop-front-walk", kind: "pedestrian", ...rect(0.9, 11.7, 35.8, 2) },
  { id: "store-apron", kind: "pedestrian", ...rect(0, 3.8, 21, 1.6) },
  { id: "customer-court", kind: "pedestrian", ...rect(3.2, 7.6, 13.6, 6) },
  { id: "loading-walk-link", kind: "pedestrian", ...rect(10.4, -23, 2, 2) },
  { id: "service-walk", kind: "pedestrian", ...rect(10.4, -9.75, 2, 25.5) },
];
export const GREEN: Zone[] = [{ id: "pocket-park", kind: "green", ...rect(44, -7, 14, 26) }];
export const RESERVED = [...ROADS, ...SIDEWALKS, ...DRIVEWAYS, ...PARKING, ...PEDESTRIAN, ...GREEN];
export const SPAWN_CLEARANCE = rect(0, 12, 3, 3);
export const PARTNER_CENTERS: [number, number][] = [
  [-17, 35],
  [-4, 35],
  [9, 35],
  [22, 35],
  [35, 35],
  [48, 35],
  [35, 48],
  [-44, 35],
];
export interface BuildingLot {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  kind: "store" | "house" | "ruko" | "cafe" | "laundry" | "workshop";
  label: string;
  color: string;
}
export function buildingBounds(lot: BuildingLot, includeDetails = true): Bounds {
  const pad = includeDetails && lot.kind !== "store" ? 1 : 0;
  const turned = Math.abs(Math.sin(lot.rotation)) > 0.5;
  return rect(
    lot.x,
    lot.z,
    (turned ? lot.depth : lot.width) + pad * 2,
    (turned ? lot.width : lot.depth) + pad * 2,
  );
}
export const BUILDING_LOTS: BuildingLot[] = [
  {
    id: "toko-cung",
    x: 0,
    z: -9.5,
    width: 18,
    depth: 25,
    height: 10.8,
    rotation: 0,
    kind: "store",
    label: "TOKO CUNG",
    color: "#727f84",
  },
  ...PARTNER_CENTERS.map(([x, z], i): BuildingLot => ({
    id: `partner-${i}`,
    x,
    z,
    width: 8,
    depth: 7,
    height: i === 7 ? 3.6 : 5.4,
    rotation: Math.PI,
    kind: i === 7 ? "workshop" : "ruko",
    label: "Mitra Toko Cung",
    color: ["#e6d9bd", "#d2ded6", "#dfc9b5"][i % 3]!,
  })),
  ...[-20, -7, 6].flatMap((z, i): BuildingLot[] => [
    {
      id: `residential-west-${i}`,
      x: -44,
      z,
      width: 7,
      depth: 6,
      height: i === 1 ? 5.4 : 3.1,
      rotation: Math.PI / 2,
      kind: "house",
      label: "Rumah Warga",
      color: ["#e9d6bd", "#cedbd6", "#e8d4cd"][i]!,
    },
    {
      id: `kampung-shop-${i}`,
      x: -18,
      z,
      width: 7,
      depth: 6,
      height: 3.3,
      rotation: -Math.PI / 2,
      kind: i === 0 ? "workshop" : i === 1 ? "laundry" : "cafe",
      label: ["Bengkel Jaya", "Laundry Bersih", "Kopi Tetangga"][i]!,
      color: "#e5dbc6",
    },
  ]),
  ...[-16, -3, 10].map((x, i): BuildingLot => ({
    id: `rear-house-${i}`,
    x,
    z: -44,
    width: 7,
    depth: 6,
    height: 3.1,
    rotation: 0,
    kind: "house",
    label: "Rumah Warga",
    color: i % 2 ? "#d6e0d1" : "#e5cbb4",
  })),
];
export function validateLots(lots: readonly BuildingLot[] = BUILDING_LOTS): string[] {
  const errors: string[] = [];
  lots.forEach((lot, i) => {
    const b = buildingBounds(lot);
    for (const zone of RESERVED)
      if (intersects(b, zone)) errors.push(`${lot.id} overlaps ${zone.id}`);
    if (intersects(b, SPAWN_CLEARANCE)) errors.push(`${lot.id} blocks spawn`);
    for (const other of lots.slice(0, i))
      if (intersects(b, buildingBounds(other))) errors.push(`${lot.id} overlaps ${other.id}`);
  });
  return errors;
}

/** Candidate points are inset from curb/lot edges, then checked against occupancy at recovery. */
export const WALKABLE_POINTS: Point[] = [...SIDEWALKS, ...PEDESTRIAN].flatMap((b) => {
  const points: Point[] = [];
  for (let x = b.minX + 0.65; x <= b.maxX - 0.65; x += 1.5)
    for (let z = b.minZ + 0.65; z <= b.maxZ - 0.65; z += 1.5)
      if (Math.abs(x) < 52 && Math.abs(z) < 51) points.push({ x, z });
  return points;
});
export function findNearestWalkablePosition(
  p: Point,
  occupied: (p: Point) => boolean = () => false,
): Point | undefined {
  let best: Point | undefined;
  let distance = Infinity;
  for (const point of WALKABLE_POINTS) {
    const d = Math.hypot(point.x - p.x, point.z - p.z);
    if (d < distance && !occupied(point)) {
      best = point;
      distance = d;
    }
  }
  return best;
}

export interface TrafficLane {
  id: string;
  points: Point[];
  speed: number;
  loop: boolean;
}
/** Graph nodes use the same segment centers as rendered junctions. Left-hand traffic, WIB locale. */
const front = ROAD_SEGMENTS[0]!,
  left = ROAD_SEGMENTS[1]!,
  right = ROAD_SEGMENTS[2]!,
  rear = ROAD_SEGMENTS[3]!;
export const ROAD_NODES = {
  west: { x: -280, z: front.z },
  east: { x: 280, z: front.z },
  north: { x: left.x, z: -280 },
  south: { x: left.x, z: 280 },
  frontLeft: { x: left.x, z: front.z },
  frontRight: { x: right.x, z: front.z },
  rearLeft: { x: left.x, z: rear.z },
  rearRight: { x: right.x, z: rear.z },
  parkingEntry: { x: -12, z: front.z },
  parking: { x: -12, z: 12 },
  pickupEntry: { x: 7, z: front.z },
  pickup: { x: 12, z: 15.3 },
  loadingEntry: { x: 14, z: rear.z },
  loading: { x: 14, z: -26 },
  loadingYard: { x: 8, z: -26 },
} satisfies Record<string, Point>;
export type RoadNodeId = keyof typeof ROAD_NODES;
export const ROAD_EDGES: [RoadNodeId, RoadNodeId][] = [
  ["west", "frontLeft"],
  ["frontLeft", "parkingEntry"],
  ["parkingEntry", "pickupEntry"],
  ["pickupEntry", "frontRight"],
  ["frontRight", "east"],
  ["north", "rearLeft"],
  ["rearLeft", "frontLeft"],
  ["frontLeft", "south"],
  ["rearLeft", "loadingEntry"],
  ["loadingEntry", "rearRight"],
  ["rearRight", "frontRight"],
  ["parkingEntry", "parking"],
  ["pickupEntry", "pickup"],
  ["loadingEntry", "loading"],
  ["loading", "loadingYard"],
];
/** Route builders offset graph roads into their correct left-hand lanes. */
const laneOffset = front.width / 4;
const eastZ = front.z - laneOffset,
  westZ = front.z + laneOffset;
export const TRAFFIC_LANES: TrafficLane[] = [
  {
    id: "neighborhood",
    points: smoothRoadPath(
      [
        { x: ROAD_NODES.west.x, z: eastZ },
        { x: right.x - laneOffset, z: eastZ },
        { x: right.x - laneOffset, z: rear.z + laneOffset },
        { x: left.x + laneOffset, z: rear.z + laneOffset },
        { x: left.x + laneOffset, z: ROAD_NODES.south.z },
      ],
      2,
    ),
    speed: 6,
    loop: true,
  },
  {
    id: "west-to-north",
    points: smoothRoadPath(
      [
        { x: ROAD_NODES.east.x, z: westZ },
        { x: left.x - laneOffset, z: westZ },
        { x: left.x - laneOffset, z: ROAD_NODES.north.z },
      ],
      5,
    ),
    speed: 6.5,
    loop: true,
  },
  {
    id: "eastbound",
    points: [
      { x: ROAD_NODES.west.x, z: eastZ },
      { x: ROAD_NODES.east.x, z: eastZ },
    ],
    speed: 6,
    loop: true,
  },
];
export const DELIVERY_IN: TrafficLane = {
  id: "delivery-in",
  points: smoothRoadPath(
    [
      { x: ROAD_NODES.west.x, z: eastZ },
      { x: 2, z: eastZ },
      { x: 7, z: ROAD_NODES.pickup.z },
      ROAD_NODES.pickup,
    ],
    2,
  ),
  speed: 4,
  loop: false,
};
export const DELIVERY_OUT: TrafficLane = {
  id: "delivery-out",
  points: smoothRoadPath(
    [
      ROAD_NODES.pickup,
      { x: 19, z: ROAD_NODES.pickup.z },
      { x: 24, z: eastZ },
      { x: ROAD_NODES.east.x, z: eastZ },
    ],
    2,
  ),
  speed: 4,
  loop: false,
};
export function pathLength(points: readonly Point[]) {
  return points
    .slice(1)
    .reduce((sum, p, i) => sum + Math.hypot(p.x - points[i]!.x, p.z - points[i]!.z), 0);
}
export function samplePath(points: readonly Point[], distance: number) {
  let left = Math.max(0, distance);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!,
      len = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= len || i === points.length - 1) {
      if (len < 0.000001) continue;
      const t = Math.min(1, left / len);
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        dx: (b.x - a.x) / len,
        dz: (b.z - a.z) / len,
      };
    }
    left -= len;
  }
  return { ...points[0]!, dx: 1, dz: 0 };
}
