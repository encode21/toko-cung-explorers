import type { AssetPart } from "./parts";
import type { Vec3 } from "../world/layout";
export type VehicleKind = "car" | "van" | "motorcycle" | "pickup" | "truck";
export const VEHICLE_SIZE: Record<VehicleKind, Vec3> = {
  car: [1.9, 1.65, 4.3],
  van: [1.9, 2.15, 4.3],
  motorcycle: [0.7, 1.45, 1.9],
  pickup: [1.9, 1.8, 4.3],
  truck: [2.3, 2.8, 4.4],
};
export interface StagedVehicle {
  id: string;
  kind: VehicleKind;
  p: Vec3;
  color: string;
  assetUrl?: string;
}
export const STAGED_VEHICLES: StagedVehicle[] = [
  { id: "customer-car", kind: "car", p: [-12.75, 0, 7.8], color: "#677f89" },
  { id: "delivery-van", kind: "van", p: [-6, 0, -26], color: "#b93e45" },
  { id: "courier-motorcycle", kind: "motorcycle", p: [12.5, 0, 5.7], color: "#ba4347" },
  { id: "customer-motorcycle", kind: "motorcycle", p: [14.1, 0, 5.7], color: "#5c7880" },
  { id: "logistics-pickup", kind: "pickup", p: [-10.25, 0, 7.8], color: "#738e83" },
  { id: "supplier-truck", kind: "truck", p: [6, 0, -26.5], color: "#c4c7bf" },
];
export function vehicleParts(kind: VehicleKind, color: string, rider = false): AssetPart[] {
  const a: AssetPart[] = [];
  const add = (p: Vec3, s: Vec3, c: string, extra: Partial<AssetPart> = {}) =>
    a.push({ p, s, color: c, ...extra });
  const wheel = (x: number, y: number, z: number, r: number) => {
    add([x, y, z], [r * 2, 0.18, r * 2], "#303b40", {
      shape: "cylinder",
      rz: Math.PI / 2,
      finish: "rubber",
    });
    add([x + (x < 0 ? -0.1 : 0.1), y, z], [r * 1.1, 0.025, r * 1.1], "#bac4c3", {
      shape: "cylinder",
      rz: Math.PI / 2,
      finish: "metal",
    });
  };
  if (kind === "motorcycle") {
    add([0.24, 0.28, -0.84], [0.1, 0.22, 0.1], "#465259", {
      shape: "cylinder",
      rx: Math.PI / 2,
      finish: "metal",
    });
    wheel(0, 0.3, -0.62, 0.3);
    wheel(0, 0.3, 0.63, 0.3);
    add([0, 0.52, 0], [0.25, 0.18, 1.2], "#4c5c60", { finish: "metal" });
    add([0, 0.75, 0.15], [0.44, 0.35, 0.55], color);
    add([0, 0.84, -0.27], [0.36, 0.14, 0.64], "#343e43", { finish: "fabric" });
    add([0, 1.08, 0.58], [0.05, 0.56, 0.05], "#a8b4b4", { rx: -0.25, finish: "metal" });
    add([0, 1.32, 0.5], [0.65, 0.055, 0.07], "#35494b", { finish: "metal" });
    add([0, 1.12, 0.72], [0.32, 0.26, 0.16], color);
    add([0, 1.13, 0.812], [0.24, 0.16, 0.025], "#fff1c6", { finish: "glass" });
    add([0, 1.05, -0.65], [0.5, 0.48, 0.5], "#ceccbb", { finish: "fabric" });
    add([0, 1.05, -0.91], [0.32, 0.12, 0.02], color);
    add([0.17, 0.92, -0.2], [0.32, 0.36, 0.36], color, { shape: "dome", finish: "plastic" });
    add([0.17, 0.96, -0.04], [0.25, 0.1, 0.035], "#3e5963", { finish: "glass" });
    if (rider) {
      // Lightweight helmeted rider built into the same batch as the moving motorcycle.
      add([0, 1.22, -0.18], [0.45, 0.6, 0.33], color, { finish: "fabric" });
      add([0, 1.72, -0.12], [0.4, 0.4, 0.4], "#263b45", { shape: "dome", finish: "plastic" });
      add([0, 1.71, 0.085], [0.31, 0.13, 0.025], "#8eaeb5", { finish: "glass" });
      for (const side of [-1, 1]) {
        add([side * 0.25, 1.31, 0.2], [0.15, 0.17, 0.57], color, { rx: -0.15, finish: "fabric" });
        add([side * 0.25, 0.78, -0.02], [0.19, 0.55, 0.24], "#344452", { finish: "fabric" });
        add([side * 0.25, 0.52, 0.1], [0.2, 0.13, 0.32], "#25353a", { finish: "rubber" });
      }
    }
    return a;
  }
  const truck = kind === "truck",
    van = kind === "van",
    pickup = kind === "pickup";
  const width = truck ? 2.15 : 1.8;
  add([0.58, 0.28, -2.05], [0.12, 0.24, 0.12], "#465259", {
    shape: "cylinder",
    rx: Math.PI / 2,
    finish: "metal",
  });
  add([0, 0.49, 0], [width, 0.28, truck ? 4.4 : 4.1], "#34454b");
  add([0, 0.76, 0], [width, 0.45, 4.1], color);
  const cabinZ = pickup || truck ? 0.85 : 0.1,
    cabinLength = pickup || truck ? 1.6 : van ? 3.1 : 2.25;
  add(
    [0, van ? 1.43 : 1.15, cabinZ],
    [width - 0.18, van ? 1.25 : 0.78, cabinLength],
    van ? "#e5e5db" : color,
  );
  const glassZ = cabinZ + cabinLength / 2 + 0.005;
  add([0, van ? 1.52 : 1.28, glassZ], [width - 0.38, van ? 0.6 : 0.44, 0.04], "#739ca8", {
    rx: -0.15,
    finish: "glass",
  });
  for (const side of [-1, 1]) {
    add(
      [side * (width / 2 - 0.075), van ? 1.52 : 1.26, cabinZ + (van ? 0.8 : 0.12)],
      [0.04, 0.43, van ? 0.8 : pickup || truck ? 1.15 : 1.6],
      "#739ca8",
      { finish: "glass" },
    );
    add([side * (width / 2 - 0.047), 1.05, cabinZ - 0.25], [0.035, 0.06, 0.25], "#d3d9d5", {
      finish: "metal",
    });
    add([side * (width / 2 - 0.23), 0.81, 2.055], [0.36, 0.19, 0.07], "#f9e8b5", {
      finish: "glass",
    });
    add([side * (width / 2 - 0.23), 0.8, -2.055], [0.25, 0.17, 0.05], "#a43f43");
    for (const z of [-1.32, 1.32]) wheel(side * (truck ? 1.04 : 0.87), 0.34, z, 0.34);
  }
  add([0, 0.61, 2.08], [width - 0.12, 0.14, 0.09], "#a8b4b5", { finish: "metal" });
  add([0, 0.8, 2.105], [0.62, 0.12, 0.03], "#37454c");
  add([0, 0.59, 2.133], [0.34, 0.075, 0.01], "#ebe9df");
  if (pickup) {
    add([0, 0.98, -1.15], [1.48, 0.08, 1.5], "#526267");
    for (const side of [-1, 1]) add([side * 0.82, 1.2, -1.14], [0.13, 0.45, 1.65], color);
    add([0, 1.2, -1.95], [1.7, 0.45, 0.13], color);
    add([0, 1.18, -1.2], [0.9, 0.32, 0.7], "#bda276", { finish: "cardboard" });
  }
  if (truck) {
    add([0, 1.77, -0.93], [2.22, 1.95, 2.4], "#e0dfd5");
    for (const side of [-1, 1]) add([side * 1.12, 1.05, -0.93], [0.025, 0.16, 2.35], "#b4484d");
    add([0, 1.7, -2.15], [2.04, 1.72, 0.045], "#c3c8c3");
    for (const x of [-0.65, 0.65])
      add([x, 1.65, -2.183], [0.045, 1.4, 0.025], "#7c8d8f", { finish: "metal" });
  }
  if (van)
    for (const side of [-1, 1]) add([side * 0.816, 1.52, -0.83], [0.025, 0.4, 1.5], "#b93e45");
  return a;
}
