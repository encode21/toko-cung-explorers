import type { Vec3 } from "../world/layout";
export type VehicleKind =
  "car" | "van" | "motorcycle" | "pickup" | "truck" | "scooter" | "mpv" | "angkot";
export interface VehicleSeatDefinition {
  cushion: Vec3;
  door: Vec3;
  foot: Vec3;
  grips: [Vec3, Vec3];
}
export interface VehicleDefinition {
  size: Vec3;
  roof: number;
  collision: { half: Vec3; centerY: number };
  cabin: [number, number];
  wheels: Vec3[];
  wheelRadius: number;
  seats: VehicleSeatDefinition[];
}
function definition(kind: VehicleKind): VehicleDefinition {
  const bike = kind === "motorcycle" || kind === "scooter";
  const truck = kind === "truck";
  const tall = ["van", "mpv", "angkot"].includes(kind);
  const roof = bike ? 0 : truck ? 2.32 : tall ? 2.2 : 2.06;
  const width = bike ? 0.72 : truck ? 2.3 : 2.04;
  const length = bike ? 2.1 : 4.4;
  const seats = Array.from({ length: bike || truck ? 2 : 4 }, (_, i): VehicleSeatDefinition => {
    const side = i % 2 === 0 ? 1 : -1;
    const x = bike ? 0 : side * 0.49;
    const z = bike ? (i === 0 ? 0.02 : -0.64) : truck ? 0.8 : i < 2 ? 0.54 : -0.65;
    const y = bike ? 0.83 : truck ? 0.99 : 0.8;
    return {
      cushion: [x, y, z],
      door: [side * (bike ? 0.85 : 1.65), 0.93, z],
      foot: [x, bike ? 0.38 : truck ? 0.54 : 0.35, z + 0.47],
      grips: [
        [x - 0.22, y + 0.37, z + 0.22],
        [x + 0.22, y + 0.37, z + 0.22],
      ],
    };
  });
  const height = bike ? 1.5 : truck ? 2.8 : roof + 0.08;
  return {
    collision: { half: [width / 2, (height - 0.22) / 2, length / 2], centerY: (height + 0.22) / 2 },
    size: [width, height, length],
    roof,
    cabin: truck ? [0, 1.7] : [-1.12, 1.22],
    wheels: bike
      ? [
          [0, 0.32, -0.75],
          [0, 0.32, 0.76],
        ]
      : [-1, 1].flatMap((side) =>
          [-1.4, 1.4].map((z) => [side * (width / 2 - 0.12), 0.38, z] as Vec3),
        ),
    wheelRadius: bike ? 0.32 : 0.38,
    seats,
  };
}
export const VEHICLE_DEFINITIONS = Object.fromEntries(
  (["car", "van", "motorcycle", "pickup", "truck", "scooter", "mpv", "angkot"] as const).map(
    (k) => [k, definition(k)],
  ),
) as Record<VehicleKind, VehicleDefinition>;
export const VEHICLE_SIZE = Object.fromEntries(
  Object.entries(VEHICLE_DEFINITIONS).map(([k, v]) => [k, v.size]),
) as Record<VehicleKind, Vec3>;
/** Sit contact is .36 above the avatar root; physics root stays .83 above it. */
export const SEAT_ROOT_OFFSET = 0.83 - 0.36;

export function vehicleSeatAnchor(
  kind: VehicleKind,
  p: { x: number; y?: number; z: number; yaw: number },
  index = 0,
  visual = { lift: 0, roll: 0 },
) {
  const [x, y, z] = VEHICLE_DEFINITIONS[kind].seats[index]!.cushion;
  const feet = y + SEAT_ROOT_OFFSET - 0.83;
  const sx = x * Math.cos(visual.roll) - feet * Math.sin(visual.roll);
  const sy = x * Math.sin(visual.roll) + feet * Math.cos(visual.roll) + 0.83;
  return {
    x: p.x + sx * Math.cos(p.yaw) + z * Math.sin(p.yaw),
    y: (p.y ?? 0) + sy + visual.lift,
    z: p.z - sx * Math.sin(p.yaw) + z * Math.cos(p.yaw),
    ry: p.yaw,
    rz: visual.roll,
  };
}
