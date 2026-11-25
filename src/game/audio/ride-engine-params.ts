/** Pure engine curves for the vehicle the local player rides (no imports: unit-testable). */
export type RideKind = "bebek" | "matic" | "car" | "sporty" | "diesel" | "bajaj" | "truck";

interface EngineSpec {
  idle: number;
  top: number;
  cut: [number, number];
  /** Gear count; 0 = CVT (matic): rpm follows the throttle instead of shifting. */
  gears: number;
  wave: OscillatorType;
  harm: number;
  /** Firing-pulse amplitude modulation: depth, and rate as a multiple of the pitch. */
  chug: number;
  fire: number;
  vol: number;
}

// Pitches sit above ~45 Hz fundamentals plus an octave harmonic so phone speakers carry them.
// prettier-ignore
const SPEC: Record<RideKind, EngineSpec> = {
  bebek: { idle: 95, top: 360, cut: [1000, 3400], gears: 3, wave: "sawtooth", harm: 0.3, chug: 0.35, fire: 0.5, vol: 1 },
  matic: { idle: 85, top: 260, cut: [700, 2200], gears: 0, wave: "triangle", harm: 0.25, chug: 0.12, fire: 0.5, vol: 0.85 },
  car: { idle: 60, top: 200, cut: [600, 2000], gears: 3, wave: "sawtooth", harm: 0.3, chug: 0.1, fire: 1, vol: 1 },
  sporty: { idle: 75, top: 300, cut: [900, 3200], gears: 4, wave: "sawtooth", harm: 0.5, chug: 0.05, fire: 1.5, vol: 1.1 },
  diesel: { idle: 50, top: 150, cut: [450, 1300], gears: 3, wave: "square", harm: 0.2, chug: 0.5, fire: 0.5, vol: 1 },
  bajaj: { idle: 120, top: 380, cut: [1500, 4200], gears: 3, wave: "square", harm: 0.45, chug: 0.55, fire: 1, vol: 0.9 },
  truck: { idle: 45, top: 130, cut: [400, 1200], gears: 3, wave: "square", harm: 0.2, chug: 0.4, fire: 0.5, vol: 1.1 },
};
const MODEL_KIND: Record<string, RideKind> = {
  motorcycle: "matic",
  "sport-bike": "sporty",
  scooter: "matic",
  convertible: "sporty",
  pickup: "diesel",
  angkot: "diesel",
  jeepney: "diesel",
  bajaj: "bajaj",
  truck: "truck",
};
const TOP_SPEED = 10; // m/s, advanceRide's forward target

const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

/** Engine character for a ride model (car/mpv/van and unknown models sound like a car). */
export const rideEngineKind = (model: string): RideKind => MODEL_KIND[model] ?? "car";
export const rideEngineVoice = (kind: RideKind) => SPEC[kind];

/** Where the virtual rpm heads: geared engines climb then drop at each shift; a CVT holds revs by throttle. */
export function rideRpmTarget(kind: RideKind, speed: number, throttle: number) {
  const { gears } = SPEC[kind],
    pace = clamp01(Math.abs(Number.isFinite(speed) ? speed : 0) / TOP_SPEED),
    load = clamp01(Math.abs(throttle));
  if (!gears) return clamp01(0.45 * load + 0.4 * pace);
  const gear = Math.min(gears - 1, Math.floor(pace * gears)),
    within = pace * gears - gear;
  return clamp01((gear ? 0.35 + 0.55 * within : 0.8 * within) + 0.15 * load);
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
    fast = Math.abs(Number.isFinite(speed) ? speed : 0),
    pitch = s.idle + (s.top - s.idle) * r;
  return {
    pitch,
    cutoff: s.cut[0] + (s.cut[1] - s.cut[0]) * (0.5 * r + 0.5 * load),
    // Louder with road speed, not only with the gas.
    motor: s.vol * (0.035 + 0.05 * r + 0.04 * load + 0.04 * pace),
    pulse: pitch * s.fire,
    tires: 0.05 * pace * pace,
    squeal: brake && fast > 2 ? 0.05 * clamp01((fast - 2) / 6) : 0,
  };
}
