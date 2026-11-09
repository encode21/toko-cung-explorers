import { VEHICLE_DEFINITIONS, SEAT_ROOT_OFFSET } from "./definitions";
export type RideModel = "car" | "mpv" | "pickup" | "angkot" | "motorcycle" | "scooter";
export type RidePose = { x: number; y: number; z: number; yaw: number; speed: number };
export type VehicleAction =
  | "vehicle-spawn"
  | "vehicle-mount"
  | "vehicle-invite"
  | "vehicle-accept"
  | "vehicle-decline"
  | "vehicle-leave";
export interface SeatTransition {
  phase: "entering" | "seated" | "exiting";
  startedAt: number;
  durationMs: number;
  from: [number, number, number];
  to: [number, number, number];
}
export interface RideSeat {
  transition?: SeatTransition | null;
  connectionId: string;
  seat: number;
  status: "pending" | "active";
}
export interface RideVehicle {
  id: string;
  model: RideModel;
  color: string;
  pose: RidePose;
  revision: number;
  occupants: RideSeat[];
}
export const bikeModel = (model: string) => model === "motorcycle" || model === "scooter";
export function vehicleFor(vehicles: RideVehicle[], id: string) {
  return vehicles.find((v) =>
    v.occupants.some((s) => s.connectionId === id && s.status === "active"),
  );
}
export function vehicleTransitioning(v: RideVehicle) {
  return v.occupants.some((s) => s.transition && s.transition.phase !== "seated");
}
export function transitionProgress(s: RideSeat, now: number) {
  const t = s.transition;
  return !t || t.phase === "seated"
    ? 1
    : Math.max(0, Math.min(1, (now - t.startedAt) / t.durationMs));
}
export function doorAngle(s: RideSeat | undefined, now: number) {
  if (!s?.transition || s.transition.phase === "seated") return 0;
  const u = transitionProgress(s, now);
  return Math.max(0, Math.min(1, (u - 0.16) / 0.16, (1 - u) / 0.18)) * 1.05;
}
export function rideAnimation(v: RideVehicle, id: string, now: number) {
  const s = v.occupants.find((s) => s.connectionId === id)!;
  const u = transitionProgress(s, now);
  if (s.transition?.phase === "entering" && u < 0.27) return "Walk" as const;
  if (s.transition?.phase === "exiting" && u > 0.76) return "Idle" as const;
  if (s.transition && s.transition.phase !== "seated" && u > 0.27 && u < 0.78)
    return "RideBoard" as const;
  return bikeModel(v.model)
    ? ("RideBike" as const)
    : s.seat === 0
      ? ("RideDrive" as const)
      : ("RidePassenger" as const);
}
export function rideSeatPose(
  v: RideVehicle,
  p: RidePose,
  id: string,
  now = Infinity,
  visual = { lift: 0, roll: 0 },
) {
  const occupant = v.occupants.find((s) => s.connectionId === id)!;
  const seat = VEHICLE_DEFINITIONS[v.model].seats[occupant?.seat ?? 0]!;
  const [x, y, z] = seat.cushion;
  const rootY = y + SEAT_ROOT_OFFSET;
  const sx = x * Math.cos(visual.roll) - (rootY - 0.83) * Math.sin(visual.roll);
  const sy = x * Math.sin(visual.roll) + (rootY - 0.83) * Math.cos(visual.roll) + 0.83;
  const target = {
    x: p.x + sx * Math.cos(p.yaw) + z * Math.sin(p.yaw),
    y: p.y + sy + visual.lift,
    z: p.z - sx * Math.sin(p.yaw) + z * Math.cos(p.yaw),
    ry: p.yaw,
    rz: visual.roll,
  };
  const t = occupant?.transition;
  if (!t || t.phase === "seated") return target;
  const u = transitionProgress(occupant, now);
  const smooth = (n: number) => {
    const a = Math.max(0, Math.min(1, n));
    return a * a * (3 - 2 * a);
  };
  const outside = { x: t.to[0], y: t.to[1], z: t.to[2], ry: p.yaw, rz: 0 };
  if (t.phase === "entering" && u < 0.27) {
    const a = smooth(u / 0.27);
    return {
      x: t.from[0] + (outside.x - t.from[0]) * a,
      y: t.from[1] + (outside.y - t.from[1]) * a,
      z: t.from[2] + (outside.z - t.from[2]) * a,
      ry: Math.atan2(outside.x - t.from[0], outside.z - t.from[2]),
      rz: 0,
    };
  }
  const a = smooth((u - 0.32) / 0.44),
    from = t.phase === "entering" ? outside : target,
    to = t.phase === "entering" ? target : outside;
  return {
    x: from.x + (to.x - from.x) * a,
    y: from.y + (to.y - from.y) * a,
    z: from.z + (to.z - from.z) * a,
    ry: p.yaw,
    rz: visual.roll * (t.phase === "entering" ? a : 1 - a),
  };
}
export function advanceRide(
  p: RidePose,
  input: { throttle: number; steer: number; brake: boolean },
  dt: number,
): RidePose {
  dt = Math.min(0.05, Math.max(0, dt));
  const target = input.brake
    ? 0
    : Math.max(-1, Math.min(1, input.throttle)) * (input.throttle < 0 ? 3 : 10);
  const step = (input.brake ? 18 : target === 0 ? 4 : 5) * dt;
  const speed = p.speed + Math.max(-step, Math.min(step, target - p.speed));
  const angle = p.yaw - Math.max(-1, Math.min(1, input.steer)) * speed * 0.24 * dt;
  const yaw = Math.atan2(Math.sin(angle), Math.cos(angle));
  return {
    x: p.x + Math.sin(yaw) * speed * dt,
    y: p.y,
    z: p.z + Math.cos(yaw) * speed * dt,
    yaw,
    speed,
  };
}
