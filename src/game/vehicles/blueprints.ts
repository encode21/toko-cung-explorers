import type { Vec3 } from "../world/layout";
import type { VehicleDefinition, VehicleSeatDefinition } from "./definitions";

/** Reference proportions enlarged only enough to fit the existing, unscaled avatars. +Z is front. */
export const CAR_BLUEPRINTS = {
  car: {
    name: "Sedan",
    width: 2.04,
    length: 4.85,
    roof: 1.97,
    seat: 0.73,
    belt: 1.22,
    radius: 0.38,
    axles: [-1.5, 1.48],
    cabin: [-1.62, 1.3],
    roofEnds: [-1.05, 0.61],
    rows: [0.55, -0.65],
    doors: [
      [-0.02, 1.12],
      [-1.18, -0.06],
    ],
  },
  sport: {
    name: "Sedan Sport Spoiler",
    width: 2.14,
    length: 5.1,
    roof: 1.82,
    seat: 0.61,
    belt: 1.13,
    radius: 0.39,
    axles: [-1.58, 1.59],
    cabin: [-1.32, 1.0],
    roofEnds: [-0.93, 0.32],
    rows: [-0.12],
    doors: [[-0.93, 0.83]],
  },
  sedan: {
    name: "Sedan Sport Coupe",
    width: 2.1,
    length: 5.05,
    roof: 1.87,
    seat: 0.65,
    belt: 1.2,
    radius: 0.4,
    axles: [-1.54, 1.57],
    cabin: [-1.63, 1.24],
    roofEnds: [-1.03, 0.51],
    rows: [0.42, -0.68],
    doors: [[-1.03, 1.05]],
  },
  pickup: {
    name: "Pickup Bak",
    width: 1.94,
    length: 4.3,
    roof: 2.26,
    seat: 0.81,
    belt: 1.29,
    radius: 0.35,
    axles: [-1.36, 1.35],
    cabin: [0.49, 1.98],
    roofEnds: [0.55, 1.64],
    rows: [1.08, -0.65],
    doors: [[0.53, 1.78]],
  },
  "double-cabin": {
    name: "Pickup Double Cabin",
    width: 2.12,
    length: 5.5,
    roof: 2.29,
    seat: 0.81,
    belt: 1.38,
    radius: 0.43,
    axles: [-1.78, 1.66],
    cabin: [-0.91, 1.54],
    roofEnds: [-0.83, 0.94],
    rows: [0.73, -0.44],
    doors: [
      [0.15, 1.31],
      [-0.9, 0.1],
    ],
  },
  mpv: {
    name: "MPV",
    width: 2.08,
    length: 4.8,
    roof: 2.28,
    seat: 0.81,
    belt: 1.37,
    radius: 0.39,
    axles: [-1.5, 1.47],
    cabin: [-2.05, 1.57],
    roofEnds: [-1.78, 0.8],
    rows: [0.64, -0.63],
    doors: [
      [0.04, 1.27],
      [-1.23, -0.01],
    ],
  },
  angkot: {
    name: "Angkot",
    width: 2.02,
    length: 4.65,
    roof: 2.49,
    seat: 0.81,
    belt: 1.37,
    radius: 0.37,
    axles: [-1.51, 1.48],
    cabin: [-2.13, 2.08],
    roofEnds: [-2.02, 1.69],
    rows: [1.13, -0.38],
    doors: [
      [0.55, 1.87],
      [-0.99, 0.5],
    ],
  },
  "city-car": {
    name: "AirEV",
    width: 1.88,
    length: 3.5,
    roof: 2.25,
    seat: 0.81,
    belt: 1.28,
    radius: 0.32,
    axles: [-1.12, 1.1],
    cabin: [-1.52, 1.36],
    roofEnds: [-1.36, 0.69],
    rows: [0.3, -0.83],
    doors: [[-0.92, 1.15]],
  },
} as const;
export type BlueprintModel = keyof typeof CAR_BLUEPRINTS;
export function carBlueprint(model: string): BlueprintModel | undefined {
  if (model === "family-mpv") return "mpv";
  return Object.hasOwn(CAR_BLUEPRINTS, model) ? (model as BlueprintModel) : undefined;
}

export function blueprintDefinition(model: BlueprintModel): VehicleDefinition {
  const b = CAR_BLUEPRINTS[model];
  const seats: VehicleSeatDefinition[] = b.rows.flatMap((z, row) =>
    [1, -1].map((side, column) => {
      const bed = model === "pickup" && row === 1;
      const doorRow = Math.min(row, b.doors.length - 1);
      const [rear, front] = b.doors[doorRow]!;
      const x = side * 0.47,
        y = b.seat;
      return {
        cushion: [x, y, z] as Vec3,
        door: [side * (b.width / 2 + 0.65), 0.93, bed ? z : (rear + front) / 2] as Vec3,
        ...(!bed ? { hinge: [side * (b.width / 2 - 0.055), 0, front] as Vec3 } : {}),
        ...(row > doorRow && !bed ? { doorSeat: column } : {}),
        doorWidth: front - rear,
        foot: [x, y - 0.45, z + 0.47] as Vec3,
        grips: [
          [x - 0.22, y + 0.37, z + 0.22],
          [x + 0.22, y + 0.37, z + 0.22],
        ] as [Vec3, Vec3],
      };
    }),
  );
  const height = b.roof + 0.08;
  return {
    size: [b.width, height, b.length],
    roof: b.roof,
    collision: {
      half: [b.width / 2, (height - 0.22) / 2, b.length / 2],
      centerY: (height + 0.22) / 2,
    },
    cabin: [...b.cabin],
    wheels: [-1, 1].flatMap((side) =>
      b.axles.map((z) => [side * (b.width / 2 - 0.12), b.radius, z] as Vec3),
    ),
    wheelRadius: b.radius,
    headlights: {
      x: b.width * 0.32,
      y: model === "city-car" ? 0.84 : model === "sport" ? 0.68 : b.belt - 0.36,
      z: b.length / 2 - 0.018,
      round: model === "pickup",
    },
    seats,
  };
}
