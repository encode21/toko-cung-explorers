import type { Point } from "../world/outdoor-layout.ts";

export type VehicleKind = "car" | "truck" | "motorcycle";
export type VehiclePose = Point & {
  dx: number;
  dz: number;
  speed: number;
  kind?: VehicleKind;
};

export function relativeToVehicle(p: Point, v: VehiclePose) {
  const x = p.x - v.x,
    z = p.z - v.z;
  return { along: x * v.dx + z * v.dz, side: x * -v.dz + z * v.dx };
}
export function vehicleOverlaps(p: Point, v: VehiclePose, radius = 0.4) {
  const r = relativeToVehicle(p, v);
  return (
    Math.abs(r.along) < (v.kind === "motorcycle" ? 1 : 2.05) + radius &&
    Math.abs(r.side) < (v.kind === "motorcycle" ? 0.36 : 0.92) + radius
  );
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
