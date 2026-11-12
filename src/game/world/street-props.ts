import { LOUNGE_SEATS, CONCERT_SEATS } from "../club/venue-layout";
import type { Vec3 } from "./layout";
import {
  BUILDING_LOTS,
  buildingBounds,
  ROADS,
  DRIVEWAYS,
  PARKING,
  contains,
} from "./outdoor-layout";

/** Atas papan duduk bangku (pusat mesh seat y=0.44, tebal 0.14). */
export const BENCH_SEAT_Y = 0.51;
/** Titik duduk di ruang lokal bangku (papan, sedikit maju dari sandaran). */
export const BENCH_SEAT_LOCAL = { x: 0, z: 0.02 };
/**
 * Offset pantat Sit di atas avatar-root. Clip Sit menurunkan hips ke ~0.32;
 * kontak duduk sedikit di bawah hips.
 */
export const SIT_CONTACT_LOCAL_Y = 0.36;
/** Offset visual avatar di bawah pusat capsule pemain. */
export const PLAYER_VISUAL_DROP = 0.83;

/** Bangku duduk di trotoar — posisi seat + rotasi menghadap. */
export interface BenchSpot {
  id: string;
  label: string;
  /** Titik acuan bangku (dunia). */
  position: Vec3;
  /** Yaw bangku (0 = menghadap +Z). */
  yaw: number;
  radius: number;
  seatHeight?: number;
  standDistance?: number;
}

/** Pose rigid-body agar pantat Sit mendarat di papan bangku. */
export function benchSitPose(bench: BenchSpot) {
  const { x: lx, z: lz } = BENCH_SEAT_LOCAL;
  const c = Math.cos(bench.yaw);
  const s = Math.sin(bench.yaw);
  return {
    x: bench.position[0] + lx * c + lz * s,
    y:
      bench.position[1] +
      (bench.seatHeight ?? BENCH_SEAT_Y) -
      SIT_CONTACT_LOCAL_Y +
      PLAYER_VISUAL_DROP,
    z: bench.position[2] - lx * s + lz * c,
    yaw: bench.yaw,
  };
}

export const BENCHES: BenchSpot[] = [
  ...LOUNGE_SEATS,
  ...CONCERT_SEATS,
  {
    id: "bench-front-left",
    label: "Bangku depan toko",
    position: [-4.2, 0, 12.2],
    yaw: Math.PI,
    radius: 1.8,
  },
  {
    id: "bench-front-right",
    label: "Bangku depan toko",
    position: [4.2, 0, 12.2],
    yaw: Math.PI,
    radius: 1.8,
  },
  {
    id: "bench-road-west",
    label: "Bangku trotoar",
    position: [-18.8, 0, 15.6],
    yaw: 0,
    radius: 1.7,
  },
  {
    id: "bench-road-east",
    label: "Bangku trotoar",
    position: [26.2, 0, 14],
    yaw: Math.PI / 2,
    radius: 1.7,
  },
];

/**
 * Pohon hanya di luar ROADS / DRIVEWAYS / PARKING.
 * Driveway delivery = rect(13, 15.3, 24, 4.6) → jangan taruh pohon di x≈1–25, z≈13–17.6.
 */
const treeCandidates: { x: number; z: number; scale: number; seed: number }[] = [
  // Apron depan toko — barat (luar jalur delivery)
  { x: -20, z: 12.6, scale: 1, seed: 0 },
  { x: -13, z: 12.4, scale: 0.92, seed: 1 },
  { x: -16, z: 11.8, scale: 0.8, seed: 2 },
  // Trotoar utara jalan utama (z>23.2)
  { x: -16, z: 25.4, scale: 0.95, seed: 5 },
  { x: -4, z: 25.3, scale: 1, seed: 6 },
  { x: 10, z: 25.4, scale: 0.88, seed: 0 },
  { x: 20, z: 25.3, scale: 1.05, seed: 1 },
  ...[-54, -42, 34, 46, 57].flatMap((x, i) =>
    [-1, 1].map((side) => ({
      x,
      // Keep the western advertisement's approach clear of the nearest canopy.
      z: 20 + side * 4.85 + (x === -42 && side === 1 ? 1.8 : 0),
      scale: 0.9 + (i % 3) * 0.07,
      seed: 10 + i,
    })),
  ),
  ...[-48, -37, -22, -7, 5, 35, 48].flatMap((z, i) =>
    [-1, 1].map((side) => ({
      // Set this tree back into the verge, away from the Kampung ad's sightline.
      x: -30 + side * 4.85 - (z === -7 && side === -1 ? 1.8 : 0),
      z,
      scale: 0.85 + (i % 3) * 0.08,
      seed: 20 + i,
    })),
  ),
  ...[83, 110, 123].map((x, i) => ({ x, z: 24.85, scale: 1, seed: 30 + i })),
];
const treeExclusions = [
  ...ROADS,
  ...DRIVEWAYS,
  ...PARKING,
  ...BUILDING_LOTS.map((lot) => buildingBounds(lot)),
];
export const TREE_SPOTS = treeCandidates.filter(
  (tree) => !treeExclusions.some((zone) => contains(zone, tree, -0.3)),
);
