import { smoothRoadPath } from "./road-path.ts";
import { HALTE_BOARD, HALTE_BUS } from "./halte-jpo.ts";

export type BusStopId = "kota" | "gerbang" | "pasar" | "kampung";
export type BusDestination = "kota" | "gerbang" | "pasar" | "gang" | "keliling";
export type RidePoint = { x: number; z: number };
export type BusStop = {
  id: BusStopId;
  name: string;
  board: [number, number, number];
  pose: RidePoint;
  yaw: number;
};
export const BUS_FARE = 3500;
export const BUS_STOPS: Record<Exclude<BusStopId, "kampung">, BusStop> = {
  kota: {
    id: "kota",
    name: "Halte Toko Cung",
    board: HALTE_BOARD,
    pose: HALTE_BUS,
    yaw: -Math.PI / 2,
  },
  gerbang: {
    id: "gerbang",
    name: "Halte Gerbang Kampung",
    board: [-36.5, 0.83, -47],
    pose: { x: -31.6, z: -47 },
    yaw: Math.PI,
  },
  pasar: {
    id: "pasar",
    name: "Halte Pasar",
    board: [126.5, 0.83, 12.6],
    pose: { x: 126.5, z: 17.2 },
    yaw: Math.PI / 2,
  },
};
export const BUS_DESTINATIONS: { id: BusDestination; label: string; description: string }[] = [
  { id: "kota", label: "Halte Toko Cung", description: "Pusat kota · depan Toko Cung" },
  {
    id: "gerbang",
    label: "Halte Gerbang Kampung",
    description: "Turun di gerbang kampung, sisi kota",
  },
  { id: "pasar", label: "Halte Pasar", description: "Belanja dan jalan-jalan di pasar" },
  {
    id: "gang",
    label: "Gang Kampung",
    description: "Pilih kampung 1, 2, 3… · rumahmu atau tetangga",
  },
  {
    id: "keliling",
    label: "Keliling kota",
    description: "Singgah di semua halte, kembali ke halte asal",
  },
];
export function busDestinations(from: BusStopId) {
  // From a kampung, "gang" means another kampung (picked by number in the halte menu).
  return BUS_DESTINATIONS.filter((d) => d.id !== from);
}
export function kampungBusStop(origin: readonly number[]): BusStop {
  return {
    id: "kampung",
    name: "Halte Gang Kampung",
    board: [origin[0]! - 5.5, 0.83, origin[2]! - 7],
    pose: { x: origin[0]! - 1.6, z: origin[2]! - 7 },
    yaw: Math.PI,
  };
}

function turnArc(x: number, z: number, from: number, to: number): RidePoint[] {
  const steps = Math.ceil(Math.abs(to - from) / 0.04);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = from + ((to - from) * i) / steps;
    return { x: x + 8.5 * Math.cos(angle), z: z + 8.5 * Math.sin(angle) };
  });
}

// One left-hand circuit; the gate loop has an 8.5 m centreline radius for an 11 m bus.
const CITY_PATHS: Record<"kota" | "gerbang" | "pasar", RidePoint[]> = {
  kota: [
    BUS_STOPS.kota.pose,
    // Clear the JPO stair railing with the rear of the bus before merging inward.
    { x: -14.5, z: 24.6 },
    { x: -27, z: 23.2 },
    { x: -31.6, z: 23.2 },
    BUS_STOPS.gerbang.pose,
  ],
  gerbang: [
    BUS_STOPS.gerbang.pose,
    ...turnArc(-40.1, -47, 0, -Math.PI * 1.5).slice(1),
    ...turnArc(-36.9, -30, -Math.PI / 2, 0),
    ...smoothRoadPath([{ x: -28.4, z: -30 }, { x: -28.4, z: 17.2 }, BUS_STOPS.pasar.pose], 6).slice(
      1,
    ),
  ],
  pasar: [
    BUS_STOPS.pasar.pose,
    { x: 134.4, z: 17.2 },
    { x: 134.4, z: -22.4 },
    { x: 73.6, z: -22.4 },
    { x: 73.6, z: 22.8 },
    { x: 20, z: 22.8 },
    { x: 8, z: 24.6 },
    BUS_STOPS.kota.pose,
  ],
};
const NEXT = { kota: "gerbang", gerbang: "pasar", pasar: "kota" } as const;
export function cityBusLegs(
  from: "kota" | "gerbang" | "pasar",
  to: "kota" | "gerbang" | "pasar" | "keliling",
) {
  const legs: { path: RidePoint[]; stop: BusStop }[] = [];
  let at = from;
  do {
    const next = NEXT[at];
    legs.push({
      path:
        at === "gerbang" ? CITY_PATHS[at] : smoothRoadPath(CITY_PATHS[at], at === "pasar" ? 3 : 6),
      stop: BUS_STOPS[next],
    });
    at = next;
  } while (at !== (to === "keliling" ? from : to));
  return legs;
}
