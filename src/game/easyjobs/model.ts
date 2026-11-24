export type V3 = [number, number, number];

/** Market front strip (z 2..12, south of the ruko row at z -11..-1), clear of the main road at z 20. */
export const FRUIT_STALL: V3 = [100, 0, 9];
export const FISH_STALL: V3 = [110, 0, 9];
export const KULI_TRUCK: V3 = [90, 0, 9];
export const KULI_STALLS: V3[] = [
  [88, 0, 3],
  [104, 0, 3],
  [120, 0, 3],
];

export const FRUIT_REGROW_MS = 45_000;
export const FRUIT_TREES = [
  // South bank of the city lake (lake ellipse ends at z≈97); keep in sync with world-jobs.php.
  { id: "mangga-1", fruit: "Mangga", x: 95, z: 102.5 },
  { id: "mangga-2", fruit: "Mangga", x: 103, z: 103.5 },
  { id: "rambutan-1", fruit: "Rambutan", x: 111, z: 102.5 },
  { id: "rambutan-2", fruit: "Rambutan", x: 119, z: 103.5 },
] as const;
export const treeReady = (pickedAt: number | null | undefined, now: number) =>
  pickedAt == null || now - pickedAt >= FRUIT_REGROW_MS;

export const KULI_DELIVERIES = 4;
export const KULI_TIME_MS = 120_000;
export interface KuliJob {
  startedAt: number;
  done: number;
  carrying: boolean;
}
export const kuliExpired = (job: KuliJob, now: number) => now - job.startedAt > KULI_TIME_MS;
export const kuliTarget = (job: KuliJob) => KULI_STALLS[job.done % KULI_STALLS.length]!;

/** Same gang number always gives the same answer; temporary (negative) gangs have none. */
export const gangHasEmpang = (gang: number) => gang > 0 && gang % 3 === 0;
/** Scene-local: free green between the lane gate and the first house, east side. */
export const EMPANG_LOCAL = { x: 21, z: -2, rx: 4.5, rz: 3 };
/** Standing spot on the pond's west bank. */
export const EMPANG_STAND: V3 = [14.8, 0.83, -2];
