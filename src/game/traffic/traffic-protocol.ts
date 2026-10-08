export type VehicleState =
  "SPAWNING" | "MOVING" | "WAITING" | "PARKED" | "RECOVERING" | "DESPAWNING";
export const VEHICLE_IDS = ["city-east", "city-west", "city-east-2", "delivery"] as const;
export const ROUTE_IDS = [
  "neighborhood",
  "west-to-north",
  "eastbound",
  "delivery-in",
  "delivery-out",
] as const;
export interface TrafficVehicleSnap {
  id: string;
  distance: number;
  speed: number;
  active: boolean;
  routeId: string;
  state: VehicleState;
}
export interface TrafficSnap {
  host: string;
  epoch: string;
  seq: number;
  at: number;
  truck: "away" | "incoming" | "loading" | "leaving";
  vehicles: TrafficVehicleSnap[];
}
export function validTrafficSnapshot(s: TrafficSnap) {
  return (
    !!s &&
    typeof s.host === "string" &&
    typeof s.epoch === "string" &&
    Number.isSafeInteger(s.seq) &&
    s.seq > 0 &&
    ["away", "incoming", "loading", "leaving"].includes(s.truck) &&
    Array.isArray(s.vehicles) &&
    s.vehicles.length === VEHICLE_IDS.length &&
    new Set(s.vehicles.map((v) => v?.id)).size === s.vehicles.length &&
    s.vehicles.every(
      (v) =>
        !!v &&
        (VEHICLE_IDS as readonly string[]).includes(v.id) &&
        (ROUTE_IDS as readonly string[]).includes(v.routeId ?? "") &&
        Number.isFinite(v.distance) &&
        v.distance >= 0 &&
        v.distance < 2000 &&
        Number.isFinite(v.speed) &&
        v.speed >= 0 &&
        v.speed <= 10 &&
        typeof v.active === "boolean" &&
        ["SPAWNING", "MOVING", "WAITING", "PARKED", "RECOVERING", "DESPAWNING"].includes(
          v.state ?? "",
        ),
    )
  );
}
export function reconcileProgress(current: number, target: number, total: number, dt: number) {
  const bounded = Math.max(0, Math.min(total, target));
  return Math.abs(bounded - current) > 12
    ? bounded
    : current + (bounded - current) * Math.min(1, dt * 10);
}
