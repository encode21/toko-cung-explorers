import type { BusStopId } from "./bus-routes";

/** Mirror of world-bus.schedule; replaced by the server snapshot before boarding. */
export const BUS_TIMETABLE = {
  cycleMs: 195_000,
  dwellMs: 20_000,
  offsets: { kota: 0, gerbang: 45_000, pasar: 130_000, kampung: 0 },
};
export type BusTimetable = typeof BUS_TIMETABLE;
export function busWindow(stop: BusStopId, now: number, timetable = BUS_TIMETABLE) {
  const offset = timetable.offsets[stop];
  let arrivalAt = Math.floor(now / timetable.cycleMs) * timetable.cycleMs + offset;
  if (now >= arrivalAt + timetable.dwellMs) arrivalAt += timetable.cycleMs;
  return { arrivalAt, departureAt: arrivalAt + timetable.dwellMs };
}
export function busCanBoard(stop: BusStopId, now: number, timetable = BUS_TIMETABLE) {
  const window = busWindow(stop, now, timetable);
  return now >= window.arrivalAt && now < window.departureAt;
}
