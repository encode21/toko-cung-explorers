import type { Mission, MissionAction } from "./model";
export const TRUCK_SOURCE = "truck-delivery-v1";
// Existing gray pickup driveway: clear of the promo booths, benches and courier drop-off.
export const TRUCK_START = { x: 14.9, z: 10.5, yaw: 0 };
export const TRUCK_PARCELS: [number, number, number] = [16.6, 0, 13.7];
export const TRUCK_DOCK: [number, number, number] = [0, 0, -26];
export const TRUCK_WAREHOUSE: [number, number, number] = [0, 0, -23.6];
export interface TruckState {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  loaded: number;
  unloaded: number;
  driver: string | null;
}
export interface TruckInput {
  throttle: number;
  steer: number;
  brake: boolean;
}
export const freshTruck = (): TruckState => ({
  ...TRUCK_START,
  speed: 0,
  loaded: 0,
  unloaded: 0,
  driver: null,
});
/** Resume a parked pre-layout checkpoint without losing packages or moving a driver. */
export function relocateLegacyTruck(t: TruckState): TruckState {
  return !t.driver && t.speed === 0 && t.x === 8 && t.z === 12.5 && t.yaw === Math.PI / 2
    ? { ...t, ...TRUCK_START }
    : t;
}
export function truckPoint(t: TruckState, x: number, z: number): [number, number, number] {
  return [
    t.x + Math.cos(t.yaw) * x + Math.sin(t.yaw) * z,
    0,
    t.z - Math.sin(t.yaw) * x + Math.cos(t.yaw) * z,
  ];
}
export const truckParked = (t: TruckState) =>
  Math.hypot(t.x - TRUCK_DOCK[0], t.z - TRUCK_DOCK[2]) < 2.3 && Math.abs(t.speed) < 0.15;
export function truckObjective(m: Mission) {
  const t = m.truck!;
  let action: MissionAction, label: string, position: [number, number, number];
  if (t.loaded < 3) {
    action = m.carrying ? "load" : "take";
    label = m.carrying ? `Muat paket ${t.loaded + 1}/3` : `Ambil paket ${t.loaded + 1}/3`;
    position = m.carrying ? truckPoint(t, 1.9, -0.8) : TRUCK_PARCELS;
  } else if (t.driver) {
    action = "exit";
    label = truckParked(t) ? "Turun · bongkar muatan" : "Turun dari truk";
    position = [t.x, 0, t.z];
  } else if (m.carrying) {
    action = "place";
    label = `Serahkan paket ${t.unloaded + 1}/3`;
    position = TRUCK_WAREHOUSE;
  } else if (truckParked(t)) {
    action = "unload";
    label = `Ambil muatan ${t.unloaded + 1}/3`;
    position = truckPoint(t, 1.9, -0.8);
  } else {
    action = "board";
    label = "Kemudikan truk";
    position = truckPoint(t, 1.85, 0.8);
  }
  return {
    id: `mission-truck-${action}`,
    action,
    label,
    position,
    radius: 1.8,
    kind: "mission" as const,
  };
}
export function truckInstruction(m: Mission) {
  if (!m.truck) return "";
  return m.truck.driver
    ? "Kemudikan ke gudang belakang · rem lalu turun di area bongkar"
    : truckObjective(m).label;
}
/** Host integrates inputs, never accepts a client-supplied truck position. */
export function advanceTruck(
  t: TruckState,
  input: TruckInput,
  dt: number,
  blocked: (t: TruckState) => boolean,
): TruckState {
  dt = Math.max(0, Math.min(dt, 0.05));
  const target = input.brake ? 0 : input.throttle * (input.throttle < 0 ? 2.5 : 6);
  const rate = input.brake || input.throttle === 0 ? 12 : 4;
  const speed =
    Math.abs(target - t.speed) < rate * dt
      ? target
      : t.speed + Math.sign(target - t.speed) * rate * dt;
  const yaw = t.yaw - input.steer * speed * 0.35 * dt;
  const next = {
    ...t,
    speed,
    yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)),
    x: t.x + Math.sin(yaw) * speed * dt,
    z: t.z + Math.cos(yaw) * speed * dt,
  };
  if (next.x < -34 || next.x > 26 || next.z < -35 || next.z > 24 || blocked(next))
    return { ...t, speed: 0 };
  return next;
}

/** Road approach keeps navigation out of the store and parked supplier vehicles. */
export function truckRouteTarget(t: TruckState): [number, number, number] {
  if (truckParked(t)) return TRUCK_DOCK;
  if (t.z > 5 && t.x < 18) return [22, 0, 15];
  if (t.z > -28 && t.x > 17) return [22, 0, -31];
  if (t.x > 2 && t.z < -22) return [0, 0, -32];
  return TRUCK_DOCK;
}
