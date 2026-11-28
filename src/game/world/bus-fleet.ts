import { pathLength, sampleRide } from "./bus-motion.ts";
import { BUS_STOPS, cityBusLegs } from "./bus-routes.ts";
import type { BusTimetable } from "./bus-timetable.ts";

/**
 * Extra TransCung buses on the city loop, behind the boardable bus by a share of the 195 s cycle.
 * 72 s / 141 s (not even thirds): even spacing makes two legs meet at the Gerbang corner.
 */
export const CITY_FLEET = [
  { id: "transcung-2", shift: 72 / 195 },
  { id: "transcung-3", shift: 141 / 195 },
] as const;
const STOPS = [BUS_STOPS.kota, BUS_STOPS.gerbang, BUS_STOPS.pasar];
const LEGS = cityBusLegs("kota", "keliling").map((leg) => ({
  path: leg.path,
  length: pathLength(leg.path),
}));

/**
 * Pure timetable pose: every client derives the same position from the synced bus clock, so the
 * fleet needs no network traffic. Dwells at each halte, then eases along the leg to arrive on time.
 * shortcut: ignores signals and obstacles (it cannot wait without breaking determinism); give it
 * server-driven state if players report buses running reds or through cars.
 */
export function fleetPose(shift: number, now: number, timetable: BusTimetable) {
  const { cycleMs, dwellMs, offsets } = timetable;
  const t = (((now - shift * cycleMs) % cycleMs) + cycleMs) % cycleMs;
  let i = 0;
  for (let s = 1; s < STOPS.length; s++) if (t >= offsets[STOPS[s]!.id]) i = s;
  const start = offsets[STOPS[i]!.id];
  const end = i + 1 < STOPS.length ? offsets[STOPS[i + 1]!.id] : cycleMs;
  const leg = LEGS[i]!;
  const sinceArrival = t - start;
  if (sinceArrival < dwellMs) {
    const door = Math.min(1, sinceArrival / 550, (dwellMs - sinceArrival) / 600);
    return { ...sampleRide(leg.path, 0), speed: 0, door: Math.max(0, door), distance: 0, leg: i };
  }
  const drive = Math.max(1, end - start - dwellMs);
  const f = Math.min(1, (sinceArrival - dwellMs) / drive);
  // Cosine ease: stands still at both haltes, peaks at twice the average speed mid-leg.
  const distance = leg.length * (f - Math.sin(2 * Math.PI * f) / (2 * Math.PI));
  const speed = ((leg.length * 1000) / drive) * (1 - Math.cos(2 * Math.PI * f));
  return { ...sampleRide(leg.path, distance), speed, door: 0, distance, leg: i };
}
