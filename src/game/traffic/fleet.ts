import type { VehicleKind as VisualKind } from "../assets/vehicles";
import type { VehicleKind } from "./traffic-math";

/**
 * Stable shared roster for every client (traffic sync keys off VEHICLE_IDS).
 * Every other slot of the 8+12+12 layout is used (16 ambient), keeping the original even spacing.
 * Halved from 32 to cut draw calls and phantom traffic hits on phones; every client shares this roster.
 */
const COLORS = ["#be755f", "#648b94", "#d2ad65", "#d5d8d1", "#40525c", "#8b535d"];
const ROAD_CARS = [
  ["car", "sport", "sedan"],
  ["pickup", "double-cabin", "mpv", "angkot"],
  ["city-car", "convertible", "bajaj", "jeepney"],
] as const;
export const AMBIENT_FLEET = [8, 12, 12].flatMap((count, lane) =>
  Array.from({ length: count }, (_, index) => ({
    id: index === 0 ? ["city-east", "city-west", "city-east-2"][lane]! : `traffic-${lane}-${index}`,
    lane: lane === 2 && index >= 8 ? 3 : lane,
    // Spread across the entire active route so the street does not empty after one convoy.
    phase: lane === 2 && index >= 8 ? (index - 8 + 0.35) / 4 : (index + 0.35) / count,
    // Every other kept NPC parks while the channel is busy (see trafficBusy).
    shed: index % 4 === 2,
    kind: (index % 3 === 1 ? "motorcycle" : "car") as VehicleKind,
    variant: (index % 3 === 1
      ? index % 2
        ? "scooter"
        : "motorcycle"
      : ROAD_CARS[lane]?.[Math.floor((index + 2) / 3)]) as VisualKind,
    color: COLORS[(lane + index) % COLORS.length]!,
  }))
    .filter((_, index) => index % 2 === 0)
    .map((v) => ({
      ...v,
      color:
        (
          {
            mpv: "#f3f3ed",
            sport: "#dce5e7",
            sedan: "#486376",
            pickup: "#d0d7d1",
            "double-cabin": "#b85e3e",
            angkot: "#368d87",
            "city-car": "#e3e9e3",
            convertible: "#eee6d5",
            bajaj: "#f3a42c",
            jeepney: "#df633f",
          } as Partial<Record<VisualKind, string>>
        )[v.variant] ?? v.color,
    })),
);
export const VEHICLE_IDS: readonly string[] = [...AMBIENT_FLEET.map((v) => v.id), "delivery"];

/** Busy channel = half full (at least 6 players); 2-player hysteresis so the street does not flicker. */
export function trafficBusy(players: number, capacity: number, was: boolean) {
  const at = Math.max(6, Math.ceil((capacity || 20) / 2));
  return players >= (was ? at - 2 : at);
}
