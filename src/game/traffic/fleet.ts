import type { VehicleKind } from "./traffic-math";

/** Stable shared roster on every quality tier; only the elected host moves it. */
const COLORS = ["#be755f", "#648b94", "#d2ad65", "#d5d8d1", "#40525c", "#8b535d"];
export const AMBIENT_FLEET = [8, 12, 12].flatMap((count, lane) =>
  Array.from({ length: count }, (_, index) => ({
    id: index === 0 ? ["city-east", "city-west", "city-east-2"][lane]! : `traffic-${lane}-${index}`,
    lane,
    // Spread across the entire active route so the street does not empty after one convoy.
    phase: (index + 0.35) / count,
    kind: (index % 3 === 1 ? "motorcycle" : "car") as VehicleKind,
    color: COLORS[(lane + index) % COLORS.length]!,
  })),
);
export const VEHICLE_IDS: readonly string[] = [...AMBIENT_FLEET.map((v) => v.id), "delivery"];
