import type { Vec3 } from "../world/layout";
export const RIDE_MODELS = [
  "car",
  "mpv",
  "pickup",
  "angkot",
  "motorcycle",
  "scooter",
  "convertible",
  "bajaj",
  "jeepney",
] as const;
export type VehicleKind = (typeof RIDE_MODELS)[number] | "van" | "truck";
export interface VehicleSeatDefinition {
  cushion: Vec3;
  door: Vec3;
  hinge?: Vec3;
  doorWidth: number;
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
  headlights: { x: number; y: number; z: number; round: boolean };
  seats: VehicleSeatDefinition[];
}
function definition(kind: VehicleKind): VehicleDefinition {
  const bike = kind === "motorcycle" || kind === "scooter";
  const truck = kind === "truck",
    bajaj = kind === "bajaj",
    jeep = kind === "jeepney",
    open = kind === "convertible";
  const tall = ["van", "mpv", "angkot"].includes(kind);
  const roof =
    bike || open
      ? 0
      : truck
        ? 2.32
        : jeep
          ? 2.2
          : bajaj
            ? 2.1
            : kind === "mpv"
              ? 2.04
              : tall
                ? 2.2
                : 2.06;
  const width = bike ? 0.72 : bajaj ? 1.74 : truck ? 2.3 : jeep ? 2.12 : 2.04;
  const length = bike ? 2.1 : bajaj ? 3.3 : jeep ? 5.15 : truck ? 6 : 4.4;
  const seats = Array.from(
    { length: bike || truck || open ? 2 : bajaj ? 3 : jeep ? 6 : 4 },
    (_, i): VehicleSeatDefinition => {
      const side = bajaj ? (i === 2 ? -1 : 1) : i % 2 === 0 ? 1 : -1;
      const x = bike || (bajaj && i === 0) ? 0 : side * (bajaj ? 0.43 : 0.49);
      const z = bike
        ? i === 0
          ? 0.02
          : -0.64
        : bajaj
          ? i === 0
            ? 0.5
            : -0.63
          : open
            ? -0.1
            : truck
              ? 1.8
              : jeep
                ? 0.75 - Math.floor(i / 2) * 1.1
                : i < 2
                  ? 0.54
                  : -0.65;
      const y = bike ? 0.83 : truck ? 0.99 : 0.8;
      const doorWidth = open ? 1.45 : truck ? 1.3 : 1.13;
      const hinge =
        !bike && !bajaj && !(jeep && i > 1)
          ? ([side * (width / 2 - 0.1), 0, z + doorWidth / 2] as Vec3)
          : undefined;
      return {
        cushion: [x, y, z],
        door: [side * (bike ? 0.85 : bajaj ? 1.3 : 1.65), 0.93, z],
        ...(hinge ? { hinge } : {}),
        doorWidth,
        foot: [x, bike ? 0.38 : truck ? 0.54 : 0.35, z + 0.47],
        grips: [
          [x - 0.22, y + 0.37, z + 0.22],
          [x + 0.22, y + 0.37, z + 0.22],
        ],
      };
    },
  );
  const height = bike ? 1.5 : open ? 1.92 : truck ? 2.8 : roof + 0.08;
  const wheelRadius = bike ? 0.32 : bajaj ? 0.34 : 0.4;
  return {
    collision: { half: [width / 2, (height - 0.22) / 2, length / 2], centerY: (height + 0.22) / 2 },
    size: [width, height, length],
    roof,
    cabin: truck
      ? [1, 2.7]
      : bajaj
        ? [-1.15, 0.95]
        : jeep
          ? [-2.05, 1.35]
          : open
            ? [-0.87, 0.9]
            : kind === "pickup"
              ? [-1.12, 1.22]
              : tall
                ? [-1.55, 1.3]
                : [-1.3, 1.2],
    wheels: bike
      ? [
          [0, 0.32, -0.75],
          [0, 0.32, 0.76],
        ]
      : bajaj
        ? [
            [-0.73, 0.34, -0.94],
            [0.73, 0.34, -0.94],
            [0, 0.34, 1.29],
          ]
        : [-1, 1].flatMap((side) =>
            (truck ? [-1.8, 2.1] : [-1.4, 1.4]).map(
              (z) => [side * (width / 2 - 0.12), wheelRadius, jeep ? z * 1.24 : z] as Vec3,
            ),
          ),
    wheelRadius,
    headlights: {
      x: bike ? 0 : bajaj ? 0.48 : truck ? 0.87 : kind === "mpv" ? 0.67 : width * 0.34,
      y: bike ? 1.13 : bajaj ? 0.92 : truck ? 0.92 : kind === "mpv" ? 0.94 : 0.9,
      z: bike ? 0.87 : truck ? 3.055 : kind === "mpv" ? 2.204 : length / 2 - 0.06,
      round: open || bajaj || jeep,
    },
    seats,
  };
}
export const VEHICLE_DEFINITIONS = Object.fromEntries(
  ([...RIDE_MODELS, "van", "truck"] as const).map((k) => [k, definition(k)]),
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
