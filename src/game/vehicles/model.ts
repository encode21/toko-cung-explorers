export type RideModel = "car" | "mpv" | "pickup" | "angkot" | "motorcycle" | "scooter";
export type RidePose = { x: number; y: number; z: number; yaw: number; speed: number };
export type VehicleAction =
  | "vehicle-spawn"
  | "vehicle-mount"
  | "vehicle-invite"
  | "vehicle-accept"
  | "vehicle-decline"
  | "vehicle-leave";
export interface RideSeat {
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
export function rideSeatPose(v: RideVehicle, p: RidePose, id: string) {
  const seat = v.occupants.find((s) => s.connectionId === id)?.seat ?? 0;
  const bike = bikeModel(v.model);
  const x = bike ? 0 : seat % 2 === 0 ? 0.43 : -0.43;
  const z = bike ? (seat === 0 ? 0 : -0.65) : seat < 2 ? 0.6 : -0.8;
  return {
    x: p.x + x * Math.cos(p.yaw) + z * Math.sin(p.yaw),
    y: p.y + (bike ? 1.1 : 1.18),
    z: p.z - x * Math.sin(p.yaw) + z * Math.cos(p.yaw),
    ry: p.yaw,
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
