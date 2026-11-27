import type { VehicleDefinition } from "./definitions";

export const MOTORCYCLES = {
  motorcycle: { id: "bebek", name: "Skupi", color: "#315c46" },
  scooter: { id: "matic", name: "PCX", color: "#992a37" },
  "sport-bike": { id: "touring", name: "Sport", color: "#29343e" },
  "cung-eclipse": { id: "cung-eclipse", name: "Eclipse RS", color: "#e7e3ef" },
} as const;
export type MotorcycleModel = keyof typeof MOTORCYCLES;
export const isMotorcycle = (model: string): model is MotorcycleModel =>
  Object.hasOwn(MOTORCYCLES, model);
export const motorThumbnail = (id: string) =>
  ["bebek", "matic", "touring"].includes(id) ? `/assets/vehicles/dealer/${id}.png` : undefined;

export function motorcycleDefinition(model: MotorcycleModel): VehicleDefinition {
  const sport = model === "sport-bike",
    eclipse = model === "cung-eclipse",
    maxi = model === "scooter" || eclipse;
  const radius = sport ? 0.34 : 0.31;
  const axle = sport || maxi ? 0.87 : 0.79;
  const seatY = sport ? 0.91 : maxi ? 0.87 : 0.83;
  return {
    size: [0.88, 1.53, 2 * (axle + radius)],
    roof: 0,
    collision: { half: [0.44, 0.62, axle + radius], centerY: 0.84 },
    cabin: [-0.85, 0.5],
    wheelRadius: radius,
    wheels: [
      [0, radius, -axle],
      [0, radius, axle],
    ],
    headlights: {
      x: model === "motorcycle" || eclipse ? 0 : 0.18,
      y: model === "motorcycle" || eclipse ? 0.99 : 1.02,
      z: model === "motorcycle" ? 0.795 : maxi ? 1.025 : 1.1,
      round: eclipse,
    },
    seats: [0.02, -0.64].map((z, i) => ({
      cushion: [0, seatY + (i === 1 && (maxi || sport) ? 0.06 : 0), z],
      door: [i === 0 ? 1.03 : -1.03, 0.93, z],
      doorWidth: 0.7,
      foot: [0, seatY - 0.45, z + 0.47],
      grips: [
        [-0.22, seatY + 0.37, z + 0.22],
        [0.22, seatY + 0.37, z + 0.22],
      ],
    })),
  };
}
