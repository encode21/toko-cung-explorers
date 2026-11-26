export type CrossingPhase = {
  readonly vehicle: "green" | "amber" | "red";
  readonly pedestrian: "stop" | "walk";
};

const drive = { vehicle: "green", pedestrian: "stop" } as const;
const slow = { vehicle: "amber", pedestrian: "stop" } as const;
const clear = { vehicle: "red", pedestrian: "stop" } as const;
const walk = { vehicle: "red", pedestrian: "walk" } as const;

/** One city-wide cycle keeps adjacent crossings, clients and the traffic host in phase. */
export function crossingPhase(nowMs: number): CrossingPhase {
  const elapsed = nowMs % 61_000;
  if (elapsed < 28_000) return drive;
  if (elapsed < 31_000) return slow;
  if (elapsed < 35_000) return clear;
  if (elapsed < 47_000) return walk;
  // Allow a pedestrian already crossing the 4-lane road to reach the far curb.
  return clear;
}
