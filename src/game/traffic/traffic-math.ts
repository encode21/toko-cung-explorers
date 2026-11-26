import type { Point } from "../world/outdoor-layout.ts";

export type VehicleKind = "car" | "truck" | "motorcycle";
export type VehiclePose = Point & {
  dx: number;
  dz: number;
  speed: number;
  halfWidth?: number;
  halfLength?: number;
  kind?: VehicleKind;
  visualKind?: import("../vehicles/definitions").VehicleKind;
};

export type TrafficPoint = Point & { y?: number };
/** Ground traffic and the avatar capsule must share a vertical level (JPO is five metres up). */
export function atTrafficHeight(p: TrafficPoint) {
  const y = p.y ?? 0.83;
  return y + 0.83 >= 0 && y - 0.83 <= 3.3;
}

export function relativeToVehicle(p: Point, v: VehiclePose) {
  const x = p.x - v.x,
    z = p.z - v.z;
  return { along: x * v.dx + z * v.dz, side: x * -v.dz + z * v.dx };
}
export function vehicleOverlaps(p: TrafficPoint, v: VehiclePose, radius = 0.4) {
  const r = relativeToVehicle(p, v);
  return (
    atTrafficHeight(p) &&
    Math.abs(r.along) < vehicleHalfLength(v) + radius &&
    Math.abs(r.side) < vehicleHalfWidth(v) + radius
  );
}
const vehicleHalfLength = (v: VehiclePose) => v.halfLength ?? (v.kind === "motorcycle" ? 1 : 2.05);
const vehicleHalfWidth = (v: VehiclePose) => v.halfWidth ?? (v.kind === "motorcycle" ? 0.36 : 0.92);
export function projectedExtent(v: VehiclePose, x: number, z: number) {
  return (
    Math.abs(v.dx * x + v.dz * z) * vehicleHalfLength(v) +
    Math.abs(-v.dz * x + v.dx * z) * vehicleHalfWidth(v)
  );
}
/** Oriented rectangles: long buses and crossing vehicles need all four separating axes. */
export function vehiclesOverlap(a: VehiclePose, b: VehiclePose, gap = 0) {
  return [
    [a.dx, a.dz],
    [-a.dz, a.dx],
    [b.dx, b.dz],
    [-b.dz, b.dx],
  ].every(
    ([x, z]) =>
      Math.abs((b.x - a.x) * x! + (b.z - a.z) * z!) <
      projectedExtent(a, x!, z!) + projectedExtent(b, x!, z!) + gap,
  );
}
export function vehicleGapAhead(a: VehiclePose, b: VehiclePose) {
  const r = relativeToVehicle(b, a);
  if (
    r.along < 0 ||
    Math.abs(r.side) >= vehicleHalfWidth(a) + projectedExtent(b, -a.dz, a.dx) + 0.2
  )
    return Infinity;
  return Math.max(0, r.along - vehicleHalfLength(a) - projectedExtent(b, a.dx, a.dz));
}
/** Checks the intervening poses too, including remote traffic catching up after a network update. */
export function vehicleSweepOverlaps(from: VehiclePose, to: VehiclePose, obstacle: VehiclePose) {
  const yaw = Math.atan2(from.dx, from.dz);
  const turn = Math.atan2(
    Math.sin(Math.atan2(to.dx, to.dz) - yaw),
    Math.cos(Math.atan2(to.dx, to.dz) - yaw),
  );
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.25),
    Math.ceil(Math.abs(turn) / 0.05),
  );
  for (let i = 1; i <= steps; i++) {
    const t = i / steps,
      angle = yaw + turn * t;
    if (
      vehiclesOverlap(
        {
          ...to,
          x: from.x + (to.x - from.x) * t,
          z: from.z + (to.z - from.z) * t,
          dx: Math.sin(angle),
          dz: Math.cos(angle),
        },
        obstacle,
        0.2,
      )
    )
      return true;
  }
  return false;
}

/** Truk: terpental jauh. Mobil: dorongan sedang untuk Fall/duduk. */
export function impactVelocity(p: Point, v: VehiclePose) {
  const dx = p.x - v.x + v.dx * 0.8,
    dz = p.z - v.z + v.dz * 0.8,
    len = Math.hypot(dx, dz) || 1;
  if (v.kind === "truck") {
    const force = Math.min(9.5, Math.max(4.5, v.speed * 0.95 + 2.4));
    return { x: (dx / len) * force, z: (dz / len) * force, y: 5.4 };
  }
  const force = Math.min(7, Math.max(2.8, v.speed * 0.7 + 1));
  return { x: (dx / len) * force, z: (dz / len) * force, y: 2.1 };
}

export const HIT_DURATION_FALL = 1.25;
export const HIT_DURATION_LAUNCH = 0.55;
/** Max window — dipakai cooldown / clamp umum. */
export const HIT_DURATION = HIT_DURATION_FALL;
export const INVULNERABILITY = 2.4;

export function hitDurationFor(kind: VehicleKind | undefined) {
  return kind === "truck" ? HIT_DURATION_LAUNCH : HIT_DURATION_FALL;
}

export function canImpact(now: number, lastHit: number) {
  return now - lastHit >= INVULNERABILITY;
}
export function approachSpeed(speed: number, target: number, dt: number) {
  const change = (target < speed ? 9 : 2.2) * Math.min(dt, 0.05);
  return speed < target ? Math.min(target, speed + change) : Math.max(target, speed - change);
}
/** Yaw agar local +Z model menghadap arah (dx, dz). */
export function vehicleYaw(dx: number, dz: number) {
  return Math.atan2(dx, dz);
}

/** Shortest angular arc; no 360-degree spin when heading wraps at +/-PI. */
export function smoothVehicleYaw(current: number, target: number, dt: number) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * (1 - Math.exp(-20 * Math.min(dt, 0.05)));
}
