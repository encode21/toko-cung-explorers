import type { VehicleKind } from "../vehicles/definitions.ts";

export const SHOWROOM_MODELS = {
  "cung-velocity": { name: "Velocity R", category: "Mobil sport", color: "#75d922" },
  "cung-imperial": { name: "Imperial GT", category: "Mobil mewah", color: "#202126" },
  "cung-eclipse": { name: "Eclipse RS", category: "Motor sport", color: "#e7e3ef" },
} as const;

export type ShowroomModel = keyof typeof SHOWROOM_MODELS;

export function isShowroomModel(id: string): id is ShowroomModel {
  return Object.hasOwn(SHOWROOM_MODELS, id);
}

export const SHOWROOM_EXHIBITS = [
  {
    ...SHOWROOM_MODELS["cung-velocity"],
    id: "cung-velocity",
    model: "cung-velocity",
    kind: "showroom",
    x: -2.75,
    z: -3.3,
    yaw: 0.32,
    cameraAngle: -0.52,
  },
  {
    ...SHOWROOM_MODELS["cung-imperial"],
    id: "cung-imperial",
    model: "cung-imperial",
    kind: "showroom",
    x: 2.75,
    z: -3.3,
    yaw: -0.32,
    cameraAngle: 0.48,
  },
  {
    ...SHOWROOM_MODELS["cung-eclipse"],
    id: "cung-eclipse",
    model: "cung-eclipse",
    kind: "showroom",
    x: 10.7,
    z: 3.9,
    yaw: -0.65,
    cameraAngle: -0.72,
  },
  {
    id: "kancil",
    model: "city-car",
    kind: "car",
    name: "Kancil Kota",
    category: "Mobil kota",
    color: "#d2483a",
    x: -10.7,
    z: -4.8,
    yaw: 0.58,
    cameraAngle: 0.27,
  },
  {
    id: "bima",
    model: "sedan",
    kind: "car",
    name: "Bima Sedan Sport",
    category: "Mobil sport",
    color: "#1f2c47",
    x: -10.7,
    z: 3.9,
    yaw: 0.58,
    cameraAngle: 0.27,
  },
  {
    id: "gtr",
    model: "sport",
    kind: "car",
    name: "GT-R",
    category: "Mobil sport",
    color: "#dce5e7",
    x: 10.7,
    z: -4.8,
    yaw: -0.52,
    cameraAngle: -0.28,
  },
] as const satisfies readonly {
  id: string;
  model: VehicleKind;
  kind: "showroom" | "car";
  name: string;
  category: string;
  color: string;
  x: number;
  z: number;
  yaw: number;
  cameraAngle: number;
}[];

export type ShowroomExhibitId = (typeof SHOWROOM_EXHIBITS)[number]["id"];

export const showroomVehicleImage = (model: ShowroomModel) =>
  `/assets/vehicles/showroom/${model}.webp`;

export const regularVehicleImage = (id: string) =>
  ["kancil", "sahabat", "bima", "ningrat", "gtr"].includes(id)
    ? `/assets/vehicles/garage/${id}.webp`
    : undefined;
