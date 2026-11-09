import type { AssetPart } from "./parts";
import type { Vec3 } from "../world/layout";
import { VEHICLE_DEFINITIONS, type VehicleKind } from "../vehicles/definitions";
export { VEHICLE_SIZE, type VehicleKind } from "../vehicles/definitions";
export interface VehiclePart extends AssetPart {
  wheel?: number;
  door?: number;
  detail?: boolean;
}
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
/** Hollow body shells; all seat and moving-part anchors come from the same definition. */
export function vehicleParts(
  kind: VehicleKind,
  color: string,
  rider = false,
  emptyBed = false,
): VehiclePart[] {
  const d = VEHICLE_DEFINITIONS[kind],
    a: VehiclePart[] = [];
  const add = (p: Vec3, s: Vec3, c: string, extra: Partial<VehiclePart> = {}) =>
    a.push({ p, s, color: c, shape: "coach", ...extra });
  const metal = "#d2dedc",
    dark = "#283c45",
    glass = "#a7dde0",
    cream = "#ecdcc0";
  const bike = kind === "motorcycle" || kind === "scooter";
  const width = d.size[0],
    radius = d.wheelRadius;
  d.wheels.forEach(([x, y, z], wheel) => {
    add([x, y, z], [radius * 2, 0.2, radius * 2], "#26333b", {
      shape: "cylinder",
      rz: Math.PI / 2,
      finish: "rubber",
      wheel,
    });
    for (const side of [-1, 1]) {
      add([x + side * 0.106, y, z], [radius * 1.46, 0.025, radius * 1.46], metal, {
        shape: "cylinder",
        rz: Math.PI / 2,
        finish: "metal",
        wheel,
      });
      add([x + side * 0.122, y, z], [0.16, 0.035, 0.16], dark, {
        shape: "cylinder",
        rz: Math.PI / 2,
        finish: "metal",
        wheel,
      });
      for (let i = 0; i < 5; i++) {
        const t = (i * Math.PI * 2) / 5;
        add(
          [x + side * 0.124, y + Math.sin(t) * radius * 0.4, z + Math.cos(t) * radius * 0.4],
          [0.03, 0.065, radius * 0.47],
          "#f3e7d2",
          { rx: -t, finish: "metal", wheel, detail: true },
        );
      }
    }
  });
  if (bike) {
    add([0, 0.49, -0.03], [0.24, 0.18, 1.55], dark, { finish: "metal" });
    add([0, 0.67, -0.43], [0.48, 0.32, 0.93], color);
    add([0, 0.79, -0.34], [0.42, 0.1, 1.18], dark, { finish: "fabric" });
    add([0, 0.45, 0.21], [0.54, 0.1, 0.68], dark, { finish: "rubber" });
    add([0, 0.87, 0.52], [kind === "scooter" ? 0.56 : 0.27, 0.66, 0.24], color, { rx: -0.18 });
    add([0, 1.12, 0.73], [0.43, 0.28, 0.25], color);
    add([0, 1.13, 0.87], [0.3, 0.16, 0.045], "#fff3cc", { finish: "glass" });
    add([0, 0.71, -0.96], [0.27, 0.12, 0.05], "#e85c62");
    add([0.28, 0.4, -0.55], [0.13, 0.65, 0.13], metal, {
      shape: "cylinder",
      rx: Math.PI / 2,
      finish: "metal",
    });
    for (const [i, seat] of d.seats.entries()) {
      add([0, seat.foot[1], seat.foot[2]], [0.7, 0.07, 0.09], metal, { finish: "metal" });
      if (i === 0) {
        add([0, seat.grips[0][1], seat.grips[0][2]], [0.64, 0.07, 0.08], dark, {
          finish: "rubber",
        });
        for (const side of [-1, 1]) {
          add([side * 0.32, 1.35, 0.51], [0.035, 0.24, 0.035], metal, {
            finish: "metal",
            rz: side * -0.24,
          });
          add([side * 0.35, 1.48, 0.51], [0.2, 0.11, 0.07], glass, { finish: "glass" });
        }
      }
    }
    if (!emptyBed) add([0, 1.05, -0.67], [0.52, 0.5, 0.46], cream, { finish: "fabric" });
    if (rider) {
      add([0, 1.2, -0.13], [0.44, 0.6, 0.3], color, { finish: "fabric" });
      add([0, 1.66, -0.08], [0.42, 0.48, 0.42], dark, { shape: "dome", finish: "plastic" });
      for (const side of [-1, 1]) {
        add([side * 0.25, 1.19, 0.24], [0.15, 0.17, 0.5], color, { rx: -0.25, finish: "fabric" });
        add([side * 0.25, 0.65, 0.12], [0.18, 0.5, 0.24], dark, { finish: "fabric" });
      }
    }
    return a;
  }
  const [rear, front] = d.cabin;
  // Floor, sills and sculpted bonnet leave a genuinely open passenger volume.
  add([0, 0.25, 0], [width - 0.16, 0.18, 4.22], dark, { finish: "rubber" });
  add([0, 0.31, 0], [width - 0.12, 0.08, 4.16], color);
  add([0, 0.86, 1.69], [width - 0.1, 0.49, 0.85], color, { rx: 0.08 });
  add([0, 0.74, -1.72], [width - 0.1, 0.36, 0.66], color);
  add([0, d.roof, (rear + front) / 2], [width - 0.15, 0.16, front - rear + 0.12], color);
  for (const side of [-1, 1]) {
    add([side * (width / 2 - 0.06), 0.6, 0], [0.12, 0.25, 3.92], color);
    add([side * (width / 2 - 0.1), 0.46, 0], [0.08, 0.075, 3.95], metal, { finish: "metal" });
    for (const z of [rear, front])
      add([side * (width / 2 - 0.15), (d.roof + 1.1) / 2, z], [0.105, d.roof - 1.1, 0.1], color);
    add([side * (width / 2 + 0.05), 1.36, 1.07], [0.22, 0.14, 0.25], color);
    add([side * (width / 2 + 0.17), 1.36, 1.06], [0.018, 0.1, 0.18], glass, {
      finish: "glass",
      detail: true,
    });
    add([side * 0.67, 0.88, 2.14], [0.44, 0.22, 0.07], "#f0fbef", { finish: "glass" });
    add([side * 0.73, 0.79, -2.1], [0.22, 0.21, 0.08], "#dc5960");
  }
  add([0, 0.62, 2.12], [width - 0.13, 0.17, 0.18], metal, { finish: "metal" });
  add([0, 0.85, 2.13], [0.72, 0.27, 0.04], dark);
  for (const y of [0.77, 0.85, 0.93])
    add([0, y, 2.16], [0.66, 0.025, 0.025], metal, { finish: "metal", detail: true });
  add([0, 0.56, 2.22], [0.34, 0.1, 0.015], cream);
  add([0, 0.57, -2.14], [width - 0.12, 0.12, 0.14], metal, { finish: "metal" });
  // Tinted panes are thin transparent shells, never opaque cabin blocks.
  add([0, (d.roof + 1.24) / 2, front], [width - 0.36, d.roof - 1.32, 0.025], glass, {
    finish: "window",
  });
  add([0, (d.roof + 1.14) / 2, rear], [width - 0.36, d.roof - 1.24, 0.025], glass, {
    finish: "window",
  });
  for (const [i, seat] of d.seats.entries()) {
    const [x, y, z] = seat.cushion,
      side = x > 0 ? 1 : -1;
    add(seat.foot, [0.64, 0.025, 0.36], dark, { finish: "rubber", detail: true });
    add([x, y - 0.06, z], [0.69, 0.12, 0.66], cream, { finish: "fabric", detail: true });
    add([x, y + 0.33, z - 0.32], [0.66, 0.72, 0.12], cream, {
      finish: "fabric",
      rx: -0.08,
      detail: true,
    });
    add([x, y + 0.78, z - 0.37], [0.43, 0.24, 0.14], cream, { finish: "fabric", detail: true });
    add([x, y + 0.02, z], [0.55, 0.035, 0.51], "#c8af91", { finish: "fabric", detail: true });
    const dz = i < 2 ? 0.55 : -0.62,
      len = 1.13;
    add([side * (width / 2 - 0.1), 0.89, dz], [0.12, 0.57, len], color, { door: i });
    add([side * (width / 2 - 0.1), d.roof - 0.14, dz], [0.08, 0.12, len], color, { door: i });
    add(
      [side * (width / 2 - 0.1), (d.roof + 1.24) / 2, dz],
      [0.025, d.roof - 1.43, len - 0.12],
      glass,
      { finish: "window", door: i },
    );
    add(
      [side * (width / 2 - 0.1), (d.roof + 1.17) / 2, dz - len / 2 + 0.04],
      [0.09, d.roof - 1.17, 0.08],
      color,
      { door: i },
    );
    add([side * (width / 2 - 0.02), 1.08, dz - 0.32], [0.045, 0.05, 0.22], metal, {
      finish: "metal",
      door: i,
      detail: true,
    });
  }
  add([0, 1.11, 1.04], [width - 0.35, 0.2, 0.29], dark, { finish: "plastic", detail: true });
  const driver = d.seats[0]!;
  add([driver.cushion[0], driver.grips[0][1], driver.grips[0][2]], [0.59, 0.59, 0.59], dark, {
    shape: "ring",
    rx: -0.38,
    finish: "rubber",
    detail: true,
  });
  add([driver.cushion[0], 1.13, 1.04], [0.3, 0.13, 0.025], "#8be1d8", { detail: true });
  if (kind === "pickup" || (kind === "truck" && emptyBed)) {
    const bedRear = -2.05,
      bedFront = rear - 0.1;
    add([0, 0.75, (bedRear + bedFront) / 2], [width - 0.3, 0.08, bedFront - bedRear], dark);
    for (const side of [-1, 1])
      add(
        [side * (width / 2 - 0.09), 1, (bedRear + bedFront) / 2],
        [0.14, 0.48, bedFront - bedRear],
        color,
      );
    add([0, 1, bedRear], [width - 0.16, 0.48, 0.12], color);
    if (!emptyBed) add([0, 1.01, -1.62], [0.8, 0.43, 0.65], "#c6ae84", { finish: "cardboard" });
  }
  if (kind === "truck" && !emptyBed) {
    add([0, 1.72, -1.11], [2.22, 2.06, 1.98], "#e8e6d8");
    for (const x of [-1.12, 1.12]) add([x, 1.02, -1.11], [0.025, 0.14, 1.9], color);
    for (const x of [-0.6, 0.6])
      add([x, 1.7, -2.12], [0.035, 1.7, 0.03], metal, { finish: "metal" });
  }
  if (kind === "angkot" || kind === "van")
    for (const side of [-1, 1])
      add(
        [side * (width / 2 + 0.005), 0.72, -0.5],
        [0.025, 0.12, 2.8],
        kind === "angkot" ? "#ffd479" : "#f8dfb3",
      );
  if (kind === "angkot") add([0, d.roof + 0.13, 0.6], [0.86, 0.18, 0.26], cream);
  return a;
}
