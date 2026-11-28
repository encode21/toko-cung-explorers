import type { Vec3 } from "../world/layout";
import { blueprintDefinition, carBlueprint } from "./blueprints.ts";
import { isMotorcycle, motorcycleDefinition } from "./motorcycles.ts";
export const RIDE_MODELS = [
  "car",
  "mpv",
  "pickup",
  "angkot",
  "motorcycle",
  "scooter",
  "sport-bike",
  "convertible",
  "bajaj",
  "jeepney",
  "city-car",
  "family-mpv",
  "sedan",
  "luxury-van",
  "sport",
  "double-cabin",
  "cung-velocity",
  "cung-imperial",
  "cung-eclipse",
  // Kendaraan niaga Cung Niaga, dipanggil dari Garasi setelah dibeli.
  "viar",
  "truck",
] as const;
export type VehicleKind = (typeof RIDE_MODELS)[number] | "van";
export interface VehicleSeatDefinition {
  cushion: Vec3;
  door: Vec3;
  hinge?: Vec3;
  /** Rear passengers in a two-door body use the front door on their side. */
  doorSeat?: number;
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
/** Garasi (player-owned) cars reuse a base body's seats, doors and parts with their own proportions. */
const GARASI_BASE: Partial<Record<VehicleKind, VehicleKind>> = {
  "city-car": "car",
  sedan: "car",
  "family-mpv": "mpv",
  "luxury-van": "van",
};
export const vehicleBase = (kind: VehicleKind) => GARASI_BASE[kind] ?? kind;
const GARASI_SIZE: Partial<Record<VehicleKind, { width: number; length: number; roof: number }>> = {
  "luxury-van": { width: 2.1, length: 5.0, roof: 2.34 },
};
const SHOWROOM_CAR_SPECS = {
  "cung-velocity": {
    size: [2.1, 1.62, 4.55],
    wheelRadius: 0.39,
    track: 0.94,
    axles: [-1.4, 1.4],
    cushion: [0.48, 0.63, -0.23],
    cabin: [-1.14, 0.91],
    doorWidth: 1.36,
    lights: { x: 0.76, y: 0.74, z: 2.2, round: false },
  },
  "cung-imperial": {
    size: [2.18, 1.77, 4.84],
    wheelRadius: 0.41,
    track: 0.98,
    axles: [-1.51, 1.52],
    cushion: [0.5, 0.73, -0.16],
    cabin: [-1.1, 1.04],
    doorWidth: 1.45,
    lights: { x: 0.76, y: 0.88, z: 2.37, round: false },
  },
} satisfies Record<
  string,
  {
    size: Vec3;
    wheelRadius: number;
    track: number;
    axles: [number, number];
    cushion: Vec3;
    cabin: [number, number];
    doorWidth: number;
    lights: VehicleDefinition["headlights"];
  }
>;

function showroomCarDefinition(
  spec: (typeof SHOWROOM_CAR_SPECS)[keyof typeof SHOWROOM_CAR_SPECS],
): VehicleDefinition {
  const { size, wheelRadius, track, axles, cabin, doorWidth, lights } = spec;
  const [width, height, length] = size;
  const [halfSeat, y, z] = spec.cushion;
  return {
    size,
    roof: 0,
    collision: { half: [width / 2, (height - 0.22) / 2, length / 2], centerY: (height + 0.22) / 2 },
    cabin,
    wheels: [-1, 1].flatMap((side) => axles.map((axle): Vec3 => [side * track, wheelRadius, axle])),
    wheelRadius,
    headlights: lights,
    seats: [1, -1].map((side) => {
      const x = side * halfSeat;
      return {
        cushion: [x, y, z],
        door: [side * (width / 2 + 0.67), 0.93, z],
        hinge: [side * (width / 2 - 0.055), 0, z + doorWidth / 2],
        doorWidth,
        foot: [x, y - 0.45, z + 0.47],
        grips: [
          [x - 0.22, y + 0.37, z + 0.22],
          [x + 0.22, y + 0.37, z + 0.22],
        ],
      };
    }),
  };
}

function viarDefinition(): VehicleDefinition {
  const width = 1.4,
    height = 1.62,
    length = 3.2,
    wheelRadius = 0.32;
  return {
    size: [width, height, length],
    roof: 0,
    collision: { half: [width / 2, (height - 0.2) / 2, length / 2], centerY: (height + 0.2) / 2 },
    cabin: [-0.2, 0.95],
    wheels: [
      [-0.58, wheelRadius, -0.95],
      [0.58, wheelRadius, -0.95],
      [0, wheelRadius, 1.15],
    ],
    wheelRadius,
    headlights: { x: 0, y: 1.02, z: 1.42, round: true },
    seats: [
      {
        cushion: [0, 0.84, 0.42],
        // Boarding probes a 0.3 m capsule at the door: keep it clear of the 0.7 m half-width body.
        door: [1.3, 0.9, 0.42],
        doorWidth: 0.75,
        foot: [0, 0.42, 0.85],
        grips: [
          [-0.24, 1.18, 0.72],
          [0.24, 1.18, 0.72],
        ],
      },
    ],
  };
}

function definition(model: VehicleKind): VehicleDefinition {
  if (model === "viar") return viarDefinition();
  if (isMotorcycle(model)) return motorcycleDefinition(model);
  if (model === "cung-velocity" || model === "cung-imperial")
    return showroomCarDefinition(SHOWROOM_CAR_SPECS[model]);
  const blueprint = carBlueprint(model);
  if (blueprint) return blueprintDefinition(blueprint);
  const kind = vehicleBase(model),
    custom = GARASI_SIZE[model];
  const bike = kind === "motorcycle" || kind === "scooter";
  const truck = kind === "truck",
    bajaj = kind === "bajaj",
    jeep = kind === "jeepney",
    open = kind === "convertible";
  const tall = ["van", "mpv", "angkot"].includes(kind);
  const roof = custom
    ? custom.roof
    : bike || open
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
  const width = custom
    ? custom.width
    : bike
      ? 0.72
      : bajaj
        ? 1.74
        : truck
          ? 2.3
          : jeep
            ? 2.12
            : 2.04;
  const length = custom ? custom.length : bike ? 2.1 : bajaj ? 3.3 : jeep ? 5.15 : truck ? 6 : 4.4;
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
  ([...RIDE_MODELS, "van"] as const).map((k) => [k, definition(k)]),
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
