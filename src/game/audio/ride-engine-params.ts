/** Pure engine curves for the vehicle the local player rides (no imports: unit-testable). */
export type RideKind = "car" | "motorcycle" | "truck";

// Pitches sit above ~55 Hz fundamentals plus an octave harmonic so phone speakers carry them.
const SPEC: Record<RideKind, { idle: number; top: number; cut: [number, number] }> = {
  car: { idle: 70, top: 220, cut: [700, 2200] },
  motorcycle: { idle: 110, top: 420, cut: [1200, 3800] },
  truck: { idle: 55, top: 160, cut: [500, 1500] },
};
const TOP_SPEED = 10; // m/s, advanceRide's forward target

const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

/** Where the virtual rpm heads: road speed plus a rev while the gas is held. */
export function rideRpmTarget(speed: number, throttle: number) {
  return clamp01((Math.abs(speed) / TOP_SPEED) * 0.8 + Math.abs(throttle) * 0.35);
}

export function rideEngineParams(
  kind: RideKind,
  speed: number,
  throttle: number,
  brake: boolean,
  rpm: number,
) {
  const s = SPEC[kind],
    r = clamp01(rpm),
    load = clamp01(Math.abs(throttle)),
    pace = clamp01(Math.abs(speed) / TOP_SPEED),
    fast = Math.abs(Number.isFinite(speed) ? speed : 0);
  return {
    pitch: s.idle + (s.top - s.idle) * r,
    cutoff: s.cut[0] + (s.cut[1] - s.cut[0]) * (0.4 * r + 0.6 * load),
    motor: 0.05 + 0.07 * r + 0.05 * load,
    tires: 0.05 * pace * pace,
    squeal: brake && fast > 2 ? 0.05 * clamp01((fast - 2) / 6) : 0,
  };
}
