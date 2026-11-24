/** Shared weather from the wall clock: every client sees the same rain without a server. Pure. */
export type Weather = { rain: number; flood: number };
export const WEATHER_SLOT_MS = 15 * 60_000;
export const RAINY_CHANCE = 0.4;

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const ramp = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

/** A rainy slot: drizzle → heavy (0–0.15), heavy until 0.6, stops by 0.8; flood lags and drains by 0.95. */
export function weatherAt(now: number): Weather {
  const slot = Math.floor(now / WEATHER_SLOT_MS);
  if (hash(slot) >= RAINY_CHANCE) return { rain: 0, flood: 0 };
  const p = (now - slot * WEATHER_SLOT_MS) / WEATHER_SLOT_MS;
  const rain = ramp(p, 0, 0.15) * (1 - ramp(p, 0.6, 0.8));
  const flood = ramp(p, 0.25, 0.6) * (1 - ramp(p, 0.6, 0.95));
  return { rain, flood };
}
/** Walking in a flooded gang: up to 45% slower. */
export function floodSpeedFactor(flood: number) {
  return 1 - 0.45 * Math.min(1, Math.max(0, flood));
}
