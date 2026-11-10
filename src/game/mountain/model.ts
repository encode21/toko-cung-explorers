/** Metres, shared by the terrain, physics, map and session-only hiking progress. */
export type WorldLocation = "city" | "mountain";
export type MountainPoint = readonly [number, number, number];

/** Rebase mountain landscape anchors without scaling characters or prop dimensions. */
export function mountainWorldPoint([x, y, z]: MountainPoint): [number, number, number] {
  return [1000 + (x - 360) * 3, 4 + (y - 8) * 2, 300 + (z - 65) * 3];
}
export function mountainLocalPoint([x, y, z]: MountainPoint): [number, number, number] {
  return [360 + (x - 1000) / 3, 8 + (y - 4) / 2, 65 + (z - 300) / 3];
}
export const MOUNTAIN_RESCUE_Y = -8;
export const MOUNTAIN_COAST = {
  waterLevel: 0,
  plateauEndZ: 345,
  shoreZ: 363,
  shallowEndZ: 375,
  minX: 900,
  maxX: 1120,
} as const;

export const CITY_HELIPAD = {
  position: [60, 0.04, 49],
  boarding: [65, 0.04, 49],
  spawn: [65, 0.91, 49],
} as const;
export const MOUNTAIN_HELIPAD = {
  position: [1000, 4, 300],
  boarding: [1005, 4, 300],
  spawn: [1005, 4.87, 300],
} as const;
export const MOUNTAIN_BOUNDS = { minX: 820, maxX: 1234, minZ: -165, maxZ: 375 };
export const MOUNTAIN_NAME = "Gunung Cung";
export const MOUNTAIN_LOCAL_CHECKPOINTS = [
  { id: 1, name: "Pos Lumut", position: [334, 12, 54], rest: true },
  { id: 2, name: "Pos Rimba", position: [330, 16, 34], rest: true },
  { id: 3, name: "Pos Jembatan", position: [338, 20, 18], rest: true },
  { id: 4, name: "Pos Cemara", position: [404, 24, 18], rest: true },
  { id: 5, name: "Pos Lembah", position: [390, 27, 6], rest: true },
  { id: 6, name: "Pos Tebing", position: [414, 31, -18], rest: true },
  { id: 7, name: "Pos Aliran", position: [382, 35, -17], rest: true },
  { id: 8, name: "Pos Batu", position: [334, 39, -26], rest: true },
  { id: 9, name: "Pos Edelweis", position: [330, 43, -46], rest: true },
  { id: 10, name: "Pos Awan", position: [374, 47, -52], rest: true },
] as const;
export const MOUNTAIN_CHECKPOINTS = MOUNTAIN_LOCAL_CHECKPOINTS.map((checkpoint) => ({
  ...checkpoint,
  position: mountainWorldPoint(checkpoint.position),
  rest: true as const,
}));
/** Every checkpoint is a broad camp, with room for shelters off the walking corridor. */
export function mountainCheckpointTerrace(_id: number): readonly [number, number] {
  return [12, 10];
}
export const MOUNTAIN_CHECKPOINT_COUNT = MOUNTAIN_CHECKPOINTS.length;
export const MOUNTAIN_SUMMIT_ID = MOUNTAIN_CHECKPOINT_COUNT + 1;
/** Client and server reject active runs from an older checkpoint layout. */
export const MOUNTAIN_ROUTE_VERSION = 3;
export const MOUNTAIN_SUMMIT = { position: mountainWorldPoint([360, 54, -69]) };
export const MOUNTAIN_SUMMIT_RADIUS = 22;
export const MOUNTAIN_SUMMIT_TRIGGER_RADIUS = 10;

/** Ordered [x, surfaceY, z] route, also used by the map, terrain and challenge collision. */
export const MOUNTAIN_LOCAL_TRAIL: readonly MountainPoint[] = [
  [360, 8, 65],
  [360, 8, 54],
  [342, 12, 54],
  [320, 12, 54],
  [320, 16, 42],
  [330, 16, 40],
  [330, 16, 34],
  [330, 16, 28],
  [312, 16, 28],
  [312, 20, 18],
  [330, 20, 18],
  [344, 20, 18],
  [366, 20, 18],
  [390, 24, 18],
  [412, 24, 18],
  [412, 27, 6],
  [390, 27, 6],
  [390, 27, 0],
  [414, 31, -10],
  [414, 31, -24],
  [382, 35, -24],
  [382, 35, -10],
  [350, 36, -9],
  [334, 39, -20],
  [334, 39, -26],
  [334, 39, -32],
  [314, 39, -32],
  [314, 43, -46],
  [340, 43, -46],
  [352, 43, -42],
  [374, 47, -46],
  [374, 47, -52],
  [374, 47, -58],
  [390, 49, -65],
  [406, 51, -74],
  [382, 53, -82],
  [360, 54, -82],
  [360, 54, -69],
];
export const MOUNTAIN_TRAIL: readonly MountainPoint[] =
  MOUNTAIN_LOCAL_TRAIL.map(mountainWorldPoint);
export const MOUNTAIN_PATH_WIDTH = 6;
export const MOUNTAIN_BRIDGE_SEGMENT = MOUNTAIN_LOCAL_TRAIL.findIndex(
  (p) => p[0] === 344 && p[2] === 18,
);
/** The hiking route is continuous; older jump-only gaps are intentionally retired. */
export const MOUNTAIN_CHALLENGES: readonly {
  segment: number;
  kind: "stairs" | "stones" | "balance";
}[] = [];

export function isMountainPosition(x: number, z: number) {
  return (
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    x >= MOUNTAIN_BOUNDS.minX &&
    x <= MOUNTAIN_BOUNDS.maxX &&
    z >= MOUNTAIN_BOUNDS.minZ &&
    z <= MOUNTAIN_BOUNDS.maxZ
  );
}
export function mountainRespawn(checkpoint: number): [number, number, number] {
  if (!Number.isFinite(checkpoint) || checkpoint < 1) return [...MOUNTAIN_HELIPAD.spawn];
  const point =
    MOUNTAIN_CHECKPOINTS[Math.min(MOUNTAIN_CHECKPOINT_COUNT, Math.floor(checkpoint)) - 1]!.position;
  return [point[0], point[1] + 0.87, point[2]];
}
/** The whole rest terrace counts, including an ordinary jump across it; flight above it does not. */
export function checkpointAt(x: number, feetY: number, z: number): number | null {
  for (const cp of [...MOUNTAIN_CHECKPOINTS, { id: MOUNTAIN_SUMMIT_ID, ...MOUNTAIN_SUMMIT }]) {
    const [px, y, pz] = cp.position;
    const [halfX, halfZ] = mountainCheckpointTerrace(cp.id);
    const inTerrace =
      cp.id === MOUNTAIN_SUMMIT_ID
        ? Math.hypot(x - px, z - pz) <= MOUNTAIN_SUMMIT_TRIGGER_RADIUS
        : Math.abs(x - px) <= halfX - 0.2 && Math.abs(z - pz) <= halfZ - 0.2;
    if (feetY >= y - 0.35 && feetY <= y + 1.5 && inTerrace) return cp.id;
  }
  return null;
}

export function nearestMountainTrail(x: number, z: number) {
  let distance = Infinity,
    height = MOUNTAIN_HELIPAD.position[1],
    segment = 0;
  for (let i = 0; i < MOUNTAIN_TRAIL.length - 1; i++) {
    const a = MOUNTAIN_TRAIL[i]!,
      b = MOUNTAIN_TRAIL[i + 1]!;
    const dx = b[0] - a[0],
      dz = b[2] - a[2];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t);
    if (d < distance) {
      distance = d;
      height = a[1] + (b[1] - a[1]) * t;
      segment = i;
    }
  }
  return { distance, height, segment };
}

/** Hill stream feeding the waterfall lip: [x, z, water surface y, half width], downstream order. */
export const MOUNTAIN_LOCAL_STREAM: readonly (readonly [number, number, number, number])[] = [
  [357.5, -16, 33.2, 1.1],
  [356.8, -9, 31.5, 1.3],
  [356, -3, 30.4, 1.5],
  [355.4, 1, 29.2, 1.8],
  [355, 4.5, 27.25, 2.2],
  [355, 12.9, 27.25, 2.7],
];
/** Waterfall curtain: falls from the stream lip to the plunge pool. */
export const MOUNTAIN_LOCAL_WATERFALL = { x: 355, z: 13.9, top: 26.6, bottom: 7.6, width: 6.5 };
export const MOUNTAIN_WATERFALL = {
  x: mountainWorldPoint([355, 0, 13.9])[0],
  z: mountainWorldPoint([355, 0, 13.9])[2],
  top: mountainWorldPoint([355, 26.6, 13.9])[1],
  bottom: mountainWorldPoint([355, 7.6, 13.9])[1],
  width: 6.5 * 3,
};
export const MOUNTAIN_STREAM = MOUNTAIN_LOCAL_STREAM.map(([x, z, y, halfWidth]) => {
  const world = mountainWorldPoint([x, y, z]);
  return [world[0], world[2], world[1], halfWidth * 3] as const;
});

function localStreamAt(x: number, z: number) {
  let distance = Infinity,
    surface = 0,
    halfWidth = 0;
  for (let i = 0; i < MOUNTAIN_LOCAL_STREAM.length - 1; i++) {
    const a = MOUNTAIN_LOCAL_STREAM[i]!,
      b = MOUNTAIN_LOCAL_STREAM[i + 1]!;
    const dx = b[0] - a[0],
      dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
    if (d < distance) {
      distance = d;
      surface = a[2] + (b[2] - a[2]) * t;
      halfWidth = a[3] + (b[3] - a[3]) * t;
    }
  }
  return { distance, surface, halfWidth };
}

export function mountainStreamAt(x: number, z: number) {
  const local = mountainLocalPoint([x, 0, z]);
  const stream = localStreamAt(local[0], local[2]);
  return {
    distance: stream.distance * 3,
    surface: 4 + (stream.surface - 8) * 2,
    halfWidth: stream.halfWidth * 3,
  };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp01((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Distance outside the two joined flat clearings, without clipping the first hillside climb. */
function localCampDistance(x: number, z: number) {
  const rect = (minX: number, maxX: number, minZ: number, maxZ: number) =>
    Math.hypot(Math.max(minX - x, 0, x - maxX), Math.max(minZ - z, 0, z - maxZ));
  return Math.min(rect(336, 388, 60, 82), rect(356, 388, 52, 82));
}

/** Distance in world metres outside the joined coastal basecamp clearings. */
export function mountainCampDistance(x: number, z: number) {
  const local = mountainLocalPoint([x, 0, z]);
  return localCampDistance(local[0], local[2]) * 3;
}

/** A compact weighted grade avoids seams at the nearest-segment boundaries of hairpin bends. */
function trailGrade(x: number, z: number) {
  let nearest = Infinity,
    total = 0,
    weightedHeight = 0;
  for (let i = 0; i < MOUNTAIN_LOCAL_TRAIL.length - 1; i++) {
    const a = MOUNTAIN_LOCAL_TRAIL[i]!,
      b = MOUNTAIN_LOCAL_TRAIL[i + 1]!;
    const dx = b[0] - a[0],
      dz = b[2] - a[2];
    const t = clamp01(((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz));
    const d = Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t);
    nearest = Math.min(nearest, d);
    if (d >= 11) continue;
    const weight = Math.pow(1 - d / 11, 4) / (0.35 + d * d);
    total += weight;
    weightedHeight += (a[1] + (b[1] - a[1]) * t) * weight;
  }
  return { distance: nearest, height: total ? weightedHeight / total : 8 };
}

/** Ground is the trail itself: grade, shoulders and rock banks share one watertight mesh. */
function localTerrainHeight(x: number, z: number) {
  const north = clamp01((65 - z) / 134);
  const ridgeX = 360 + Math.sin(z * 0.037) * 9;
  const edge = smooth(0, 27, 72 - Math.abs(x - ridgeX));
  const end = smooth(0, 15, 94 - Math.abs(z));
  const ridges = Math.sin(x * 0.11 + z * 0.045) * 2.8 + Math.cos(z * 0.135) * 1.7;
  const knolls = Math.sin(x * 0.043 - z * 0.074) * Math.cos(z * 0.058) * 4.2;
  let y = (8 + north * 47 + ridges + knolls) * edge * end - 0.25;
  const camp = 1 - smooth(0, 7, localCampDistance(x, z));
  y += (8 - y) * camp;

  const trail = trailGrade(x, z);
  const shoulder = 1 - smooth(MOUNTAIN_PATH_WIDTH / 6 + 0.8, 12, trail.distance);
  y += (trail.height - y) * shoulder;

  // Flat natural rest meadows replace the former rectangular floating checkpoint slabs.
  for (const cp of MOUNTAIN_LOCAL_CHECKPOINTS) {
    const halfX = 12 / 3,
      halfZ = 10 / 3;
    const distance = Math.hypot(
      Math.max(0, Math.abs(x - cp.position[0]) - halfX),
      Math.max(0, Math.abs(z - cp.position[2]) - halfZ),
    );
    const influence = 1 - smooth(0, 4, distance);
    y += (cp.position[1] - y) * influence;
  }
  const summit = 1 - smooth(MOUNTAIN_SUMMIT_RADIUS / 3, 34 / 3, Math.hypot(x - 360, z + 69));
  y += (54 - y) * summit;

  // Only the bridge spans open space. Its approaches stay at deck height, with broad banks.
  const ravineX = smooth(344.8, 348.5, x) * (1 - smooth(361.5, 365.2, x));
  const ravineZ = 1 - smooth(7, 14, Math.abs(z - 18));
  const ravine = ravineX * ravineZ;
  const bed = 7.2 + Math.abs(z - 18) * 0.18;
  y += (Math.min(y, bed) - y) * ravine;

  // Cut the stream only outside the walk corridor, so water can never punch a hole in it.
  const stream = localStreamAt(x, z);
  const streamInfluence =
    (1 - smooth(stream.halfWidth + 0.4, stream.halfWidth + 3, stream.distance)) *
    smooth(3.3, 6, trail.distance);
  const streamBed = stream.surface - 0.35 + Math.max(0, stream.distance - stream.halfWidth) * 0.35;
  y += (Math.min(y, streamBed) - y) * streamInfluence;
  // The helipad is a real raised pad; lower its earth foundation to avoid coplanar flicker.
  const padEdge = Math.max(Math.abs(x - 360), Math.abs(z - 65)) * 3;
  y -= (1 - smooth(6.1, 6.65, padEdge)) * (0.065 / 2);
  return y;
}

/** One continuous island surface shared by terrain rendering, physics and water depth. */
export function mountainGroundHeight(x: number, z: number) {
  const local = mountainLocalPoint([x, 0, z]);
  let height = 4 + (localTerrainHeight(local[0], local[2]) - 8) * 2;
  const coast = MOUNTAIN_COAST;
  const bay = smooth(coast.minX - 30, coast.minX, x) * (1 - smooth(coast.maxX, coast.maxX + 30, x));
  const shoreline =
    4 * (1 - smooth(coast.plateauEndZ, coast.shoreZ, z)) -
    3 * smooth(coast.shoreZ, coast.shallowEndZ, z);
  const influence = bay * smooth(coast.plateauEndZ - 10, coast.plateauEndZ, z);
  height += (shoreline - height) * influence;
  return height;
}

/** Old-coordinate sampler for seeded scenery; it includes the new coastal grade. */
export function mountainLocalGroundHeight(x: number, z: number) {
  const world = mountainWorldPoint([x, 8, z]);
  return 8 + (mountainGroundHeight(world[0], world[2]) - 4) / 2;
}
