export type CrossingPhase = {
  readonly vehicle: "green" | "amber" | "red";
  readonly pedestrian: "stop" | "walk";
};

const drive = { vehicle: "green", pedestrian: "stop" } as const;
const slow = { vehicle: "amber", pedestrian: "stop" } as const;
const clear = { vehicle: "red", pedestrian: "stop" } as const;
const walk = { vehicle: "red", pedestrian: "walk" } as const;

/** Adjacent crossings share a clock; perpendicular roads never receive green together. */
export function crossingPhase(nowMs: number, axis: "x" | "z" = "x"): CrossingPhase {
  const elapsed = nowMs % 87_000;
  if (elapsed < 28_000) return axis === "x" ? drive : clear;
  if (elapsed < 31_000) return axis === "x" ? slow : clear;
  if (elapsed < 34_000) return clear;
  if (elapsed < 54_000) return axis === "z" ? drive : clear;
  if (elapsed < 57_000) return axis === "z" ? slow : clear;
  if (elapsed < 61_000) return clear;
  if (elapsed < 73_000) return walk;
  // Allow a pedestrian already crossing the 4-lane road to reach the far curb.
  return clear;
}
