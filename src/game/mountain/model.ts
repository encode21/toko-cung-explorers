/** Metres, shared by the terrain, physics, map and session-only hiking progress. */
export type WorldLocation = "city" | "mountain";
export type MountainPoint = readonly [number, number, number];

export const CITY_HELIPAD = {
  position: [60, 0.04, 49],
  boarding: [65, 0.04, 49],
  spawn: [65, 0.91, 49],
} as const;
export const MOUNTAIN_HELIPAD = {
  position: [360, 8, 65],
  boarding: [365, 8, 65],
  spawn: [365, 8.87, 65],
} as const;
export const MOUNTAIN_BOUNDS = { minX: 300, maxX: 438, minZ: -90, maxZ: 90 };
export const MOUNTAIN_CHECKPOINTS = [
  { id: 1, name: "Pos Rimba", position: [330, 16, 34] },
  { id: 2, name: "Pos Jembatan", position: [390, 27, 6] },
  { id: 3, name: "Pos Batu", position: [334, 39, -26] },
  { id: 4, name: "Pos Awan", position: [374, 47, -52] },
] as const;
export const MOUNTAIN_SUMMIT = { position: [360, 54, -69] as MountainPoint };

/** Ordered [x, surfaceY, z] nodes. Wide ramps meet level CP terraces without a jump. */
export const MOUNTAIN_TRAIL: readonly MountainPoint[] = [
  [360, 8, 65],
  [360, 8, 54],
  [342, 12, 54],
  [330, 16, 40],
  [330, 16, 34],
  [330, 16, 28],
  [330, 20, 18],
  [344, 20, 18],
  [366, 20, 18],
  [390, 24, 18],
  [390, 27, 12],
  [390, 27, 6],
  [390, 27, 0],
  [376, 31, -9],
  [350, 36, -9],
  [334, 39, -20],
  [334, 39, -26],
  [334, 39, -32],
  [352, 43, -42],
  [374, 47, -46],
  [374, 47, -52],
  [374, 47, -58],
  [360, 54, -61],
  [360, 54, -69],
];
export const MOUNTAIN_PATH_WIDTH = 4.8;
export const MOUNTAIN_BRIDGE_SEGMENT = 7;

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
  const point = MOUNTAIN_CHECKPOINTS[Math.min(4, Math.floor(checkpoint)) - 1]!.position;
  return [point[0], point[1] + 0.87, point[2]];
}
/** The caller additionally requires a grounded player, so airborne shortcuts do not count. */
export function checkpointAt(x: number, feetY: number, z: number): number | null {
  for (const cp of [...MOUNTAIN_CHECKPOINTS, { id: 5, ...MOUNTAIN_SUMMIT }]) {
    const [px, y, pz] = cp.position;
    if (Math.abs(feetY - y) <= 0.3 && Math.hypot(x - px, z - pz) <= 2.5) return cp.id;
  }
  return null;
}

export function nearestMountainTrail(x: number, z: number) {
  let distance = Infinity,
    height = 8,
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

/** Carve a generous clearance under every trail and rest terrace before triangulating. */
export function mountainGroundHeight(x: number, z: number) {
  const north = Math.max(0, Math.min(1, (65 - z) / 134));
  const ridgeX = 360 + Math.sin(z * 0.026) * 7;
  const edge = Math.max(0, Math.min(1, (67 - Math.abs(x - ridgeX)) / 26));
  const end = Math.max(0, Math.min(1, (90 - Math.abs(z)) / 18));
  let y = (8 + north * 46) * edge * end - 1;
  y += (Math.sin(x * 0.17 + z * 0.1) + Math.cos(z * 0.22)) * 1.6 * edge * end;
  const trail = nearestMountainTrail(x, z);
  if (trail.distance < 7)
    y = Math.min(y, trail.height - 0.3 - Math.max(0, 7 - trail.distance) * 0.015);
  // The wooden bridge crosses a real rocky ravine, not a textured patch on the ground.
  if (x > 342 && x < 368 && z > 10 && z < 26) y = Math.min(y, 7 + Math.abs(z - 18) * 0.65);
  for (const cp of [...MOUNTAIN_CHECKPOINTS, { id: 5, ...MOUNTAIN_SUMMIT }]) {
    if (Math.hypot(x - cp.position[0], z - cp.position[2]) < 8)
      y = Math.min(y, cp.position[1] - 0.18);
  }
  if (Math.hypot(x - 360, z - 65) < 18) y = Math.min(y, 7.85);
  return y;
}
