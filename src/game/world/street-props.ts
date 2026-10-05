import type { OutdoorPart } from "./OutdoorBatch";
import type { Vec3 } from "./layout";

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
}

/** Pose rigid-body agar pantat Sit mendarat di papan bangku. */
export function benchSitPose(bench: BenchSpot) {
  const { x: lx, z: lz } = BENCH_SEAT_LOCAL;
  const c = Math.cos(bench.yaw);
  const s = Math.sin(bench.yaw);
  return {
    x: bench.position[0] + lx * c + lz * s,
    y: BENCH_SEAT_Y - SIT_CONTACT_LOCAL_Y + PLAYER_VISUAL_DROP,
    z: bench.position[2] - lx * s + lz * c,
    yaw: bench.yaw,
  };
}

export const BENCHES: BenchSpot[] = [
  { id: "bench-front-left", label: "Bangku depan toko", position: [-4.2, 0, 12.2], yaw: Math.PI, radius: 1.8 },
  { id: "bench-front-right", label: "Bangku depan toko", position: [4.2, 0, 12.2], yaw: Math.PI, radius: 1.8 },
  { id: "bench-road-west", label: "Bangku trotoar", position: [-14.5, 0, 16.6], yaw: 0, radius: 1.7 },
  { id: "bench-road-east", label: "Bangku trotoar", position: [15.2, 0, 16.6], yaw: 0, radius: 1.7 },
  { id: "bench-park-a", label: "Bangku taman", position: [28.5, 0, 6.5], yaw: -Math.PI / 2, radius: 1.8 },
  { id: "bench-park-b", label: "Bangku taman", position: [32.5, 0, 1.5], yaw: Math.PI / 2, radius: 1.8 },
];

/** Pohon gaya Roblox: batang kotak + kanopi kubus bertingkat (bukan bola). */
export function robloxTree(x: number, z: number, scale = 1, seed = 0): OutdoorPart[] {
  const s = scale;
  const trunkH = 2.15 * s;
  const trunkW = 0.38 * s;
  const hue = seed % 3;
  const leafA = ["#4f8f3a", "#458635", "#5aa043"][hue]!;
  const leafB = ["#5c9840", "#4a7f32", "#67a84c"][hue]!;
  const leafC = ["#3f7a30", "#568f3d", "#4d8a38"][hue]!;
  const ox = (seed % 2 === 0 ? 0.12 : -0.1) * s;
  const oz = (seed % 3 === 0 ? 0.08 : -0.12) * s;
  return [
    { p: [x, trunkH * 0.5, z], s: [trunkW, trunkH, trunkW], color: "#6b5238" },
    { p: [x, trunkH + 0.05 * s, z], s: [trunkW * 1.15, 0.22 * s, trunkW * 1.15], color: "#5a4430" },
    { p: [x, trunkH + 0.7 * s, z], s: [1.95 * s, 1.05 * s, 1.95 * s], color: leafA },
    { p: [x + ox, trunkH + 1.45 * s, z + oz], s: [1.45 * s, 0.95 * s, 1.45 * s], color: leafB },
    { p: [x - 0.55 * s, trunkH + 0.95 * s, z + 0.35 * s], s: [0.95 * s, 0.8 * s, 0.95 * s], color: leafC },
    { p: [x + 0.6 * s, trunkH + 0.9 * s, z - 0.3 * s], s: [0.9 * s, 0.75 * s, 0.9 * s], color: leafB },
    { p: [x, trunkH + 2.05 * s, z], s: [1.05 * s, 0.7 * s, 1.05 * s], color: leafA },
  ];
}

/**
 * Pohon hanya di luar ROADS / DRIVEWAYS / PARKING.
 * Driveway delivery = rect(13, 15.3, 24, 4.6) → jangan taruh pohon di x≈1–25, z≈13–17.6.
 */
export const TREE_SPOTS: { x: number; z: number; scale: number; seed: number }[] = [
  // Apron depan toko — barat (luar jalur delivery)
  { x: -20, z: 12.6, scale: 1, seed: 0 },
  { x: -13, z: 12.4, scale: 0.92, seed: 1 },
  { x: -6.5, z: 12.5, scale: 0.95, seed: 2 },
  // Apron timur — di luar ujung driveway delivery (maxX≈25)
  { x: 28, z: 12.6, scale: 1.05, seed: 3 },
  { x: 34, z: 11.5, scale: 0.9, seed: 4 },
  // Trotoar utara jalan utama (z>23.2)
  { x: -16, z: 25.4, scale: 0.95, seed: 5 },
  { x: -4, z: 25.3, scale: 1, seed: 6 },
  { x: 10, z: 25.4, scale: 0.88, seed: 0 },
  { x: 20, z: 25.3, scale: 1.05, seed: 1 },
  // Area taman / hijau timur
  { x: 40, z: 2, scale: 1.1, seed: 2 },
  { x: 42, z: 9, scale: 0.95, seed: 3 },
  { x: 38, z: -5, scale: 0.9, seed: 4 },
];
