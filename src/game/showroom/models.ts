export const SHOWROOM_MODELS = {
  "cung-velocity": { name: "Velocity R", category: "Mobil sport", color: "#75d922" },
  "cung-imperial": { name: "Imperial GT", category: "Mobil mewah", color: "#202126" },
  "cung-eclipse": { name: "Eclipse RS", category: "Motor sport", color: "#e7e3ef" },
} as const;

export type ShowroomModel = keyof typeof SHOWROOM_MODELS;

export function isShowroomModel(id: string): id is ShowroomModel {
  return Object.hasOwn(SHOWROOM_MODELS, id);
}

export const PREMIUM_EXHIBITS = [
  { kind: "cung-velocity", x: -2.75, z: -3.3, yaw: 0.32 },
  { kind: "cung-imperial", x: 2.75, z: -3.3, yaw: -0.32 },
  { kind: "cung-eclipse", x: 10.7, z: 3.9, yaw: -0.65 },
] as const;

export const showroomVehicleImage = (model: ShowroomModel) =>
  `/assets/vehicles/showroom/${model}.webp`;
