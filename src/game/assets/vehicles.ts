import { trafficDriverParts } from "./vehicle-driver";
import type { AssetPart } from "./parts";
import type { Vec3 } from "../world/layout";
import { VEHICLE_DEFINITIONS, type VehicleKind } from "../vehicles/definitions";
export { VEHICLE_SIZE, type VehicleKind } from "../vehicles/definitions";
export interface VehiclePart extends AssetPart {
  wheel?: number;
  door?: number;
  detail?: boolean;
  npc?: boolean;
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
/** Sculpted body profiles and sloped cabins share seat, hinge and wheel anchors. */
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
  const beam = (
    from: Vec3,
    to: Vec3,
    thickness: number,
    c: string,
    extra: Partial<VehiclePart> = {},
  ) => {
    const dx = to[0] - from[0],
      dy = to[1] - from[1],
      dz = to[2] - from[2];
    add(
      from.map((n, i) => (n + to[i]!) / 2) as Vec3,
      [thickness, Math.hypot(dx, dy, dz), thickness],
      c,
      { rx: Math.atan2(dz, dy), rz: -Math.atan2(dx, Math.hypot(dy, dz)), ...extra },
    );
  };
  const metal = "#d9e1df",
    dark = "#202c36",
    glass = "#739ba9";
  const bike = kind === "motorcycle" || kind === "scooter",
    open = kind === "convertible",
    bajaj = kind === "bajaj",
    jeep = kind === "jeepney",
    truck = kind === "truck";
  const width = d.size[0],
    length = d.size[2],
    radius = d.wheelRadius;
  const trim = open ? "#e7d9be" : jeep ? "#f5ce57" : metal;
  const upholstery = open ? "#8255aa" : jeep ? "#d5a267" : "#dac8a7";
  d.wheels.forEach(([x, y, z], wheel) => {
    add([x, y, z], [radius * 2, 0.23, radius * 2], "#20262c", {
      shape: "cylinder",
      rz: Math.PI / 2,
      finish: "rubber",
      wheel,
    });
    for (const side of [-1, 1]) {
      add([x + side * 0.122, y, z], [radius * 1.46, 0.025, radius * 1.46], dark, {
        shape: "cylinder",
        rz: Math.PI / 2,
        finish: "metal",
        wheel,
      });
      add([x + side * 0.14, y, z], [radius * 1.7, radius * 1.7, 0.16], metal, {
        shape: "ring",
        ry: Math.PI / 2,
        finish: "metal",
        wheel,
      });
      add([x + side * 0.14, y, z], [radius * 0.34, 0.035, radius * 0.34], trim, {
        shape: "cylinder",
        rz: Math.PI / 2,
        finish: "metal",
        wheel,
      });
      for (let i = 0; i < 6; i++) {
        const t = (i * Math.PI) / 3;
        add(
          [x + side * 0.143, y + Math.sin(t) * radius * 0.38, z + Math.cos(t) * radius * 0.38],
          [0.025, 0.052, radius * 0.56],
          metal,
          { rx: -t, finish: "metal", wheel, detail: true },
        );
      }
    }
    if (!bike)
      add([x, y, z], [radius * 2.28, radius * 2.28, 0.7], bajaj ? dark : color, {
        shape: "arch",
        ry: Math.PI / 2,
      });
  });
  if (bike) {
    add([0, 0.48, -0.05], [0.25, 0.17, 1.45], dark, { finish: "metal" });
    add([0, 0.63, -0.43], [0.48, 0.33, 0.9], color);
    add([0, 0.79, -0.34], [0.44, 0.1, 1.18], dark, { finish: "fabric" });
    add([0, 0.43, 0.2], [0.56, 0.09, 0.68], dark, { finish: "rubber" });
    add([0, 0.83, 0.46], [kind === "scooter" ? 0.58 : 0.3, 0.66, 0.32], color, {
      shape: "hood",
      rx: -0.14,
    });
    add([0, 1.12, 0.71], [0.46, 0.28, 0.26], color);
    add([0, 0.72, -0.95], [0.29, 0.13, 0.08], "#e25c63", { finish: "glass" });
    beam([0, 0.4, 0.76], [0, 1.14, 0.45], 0.08, metal, { finish: "metal" });
    add([0.28, 0.39, -0.53], [0.14, 0.67, 0.14], metal, {
      shape: "cylinder",
      rx: Math.PI / 2,
      finish: "metal",
    });
    for (const [i, seat] of d.seats.entries()) {
      add([0, seat.foot[1], seat.foot[2]], [0.7, 0.065, 0.1], metal, { finish: "metal" });
      if (i === 0)
        add([0, seat.grips[0][1], seat.grips[0][2]], [0.66, 0.07, 0.08], dark, {
          finish: "rubber",
        });
    }
    for (const side of [-1, 1]) {
      beam([side * 0.25, 1.18, 0.42], [side * 0.34, 1.43, 0.48], 0.03, metal, { finish: "metal" });
      add([side * 0.36, 1.45, 0.48], [0.2, 0.12, 0.06], glass, { finish: "glass" });
    }
    if (!emptyBed && !rider)
      add([0, 1.04, -0.68], [0.5, 0.48, 0.43], "#dec39c", { finish: "fabric" });
  } else {
    const [rear, front] = d.cabin,
      roof = open ? 1.86 : d.roof;
    const slope = truck ? 0.12 : bajaj ? 0.17 : jeep ? 0.12 : 0.34;
    add([0, 0.29, 0], [width - 0.16, 0.19, length - 0.2], dark, { finish: "rubber" });
    add([0, 0.4, 0], [width - 0.17, 0.14, length - 0.2], color);
    const noseRear = front - 0.1,
      noseFront = length / 2 - 0.12;
    add(
      [0, bajaj ? 0.88 : truck ? 0.91 : kind === "mpv" ? 1.02 : 0.95, (noseFront + noseRear) / 2],
      [width - 0.12, truck ? 0.49 : kind === "mpv" ? 0.72 : 0.62, noseFront - noseRear],
      color,
      { shape: "hood" },
    );
    if (!truck && !bajaj)
      add([0, 0.86, -length / 2 + 0.27], [width - 0.16, 0.5, 0.46], color, {
        shape: "hood",
        ry: Math.PI,
      });
    if (!open)
      add(
        [0, bajaj ? roof - 0.08 : roof, (rear + front - slope) / 2],
        [width - 0.15, bajaj ? 0.42 : 0.18, front - rear - slope + 0.15],
        bajaj ? "#252c34" : jeep ? "#264fbd" : color,
        { shape: bajaj ? "dome" : "coach" },
      );
    for (const side of [-1, 1]) {
      add([side * (width / 2 - 0.09), 0.55, 0], [0.15, 0.28, length - 0.45], color);
      add([side * (width / 2 - 0.015), 0.44, 0], [0.06, 0.07, length - 0.35], trim, {
        finish: "metal",
      });
      beam(
        [side * (width / 2 - 0.15), 1.13, front],
        [side * (width / 2 - 0.23), roof - 0.03, front - slope],
        0.105,
        open ? trim : color,
      );
      if (!open)
        beam(
          [side * (width / 2 - 0.15), 1.09, rear],
          [side * (width / 2 - 0.23), roof - 0.04, rear + 0.18],
          0.12,
          bajaj ? dark : color,
        );
      add(
        [side * (width / 2 + 0.045), 1.34, front - 0.03],
        [0.23, 0.15, 0.25],
        open ? trim : color,
      );
      add([side * (width / 2 + 0.165), 1.34, front - 0.045], [0.018, 0.105, 0.18], glass, {
        finish: "glass",
        detail: true,
      });
    }
    const screenHeight = roof - 1.2;
    add(
      [0, 1.18 + screenHeight / 2, front - slope / 2],
      [width - 0.42, Math.hypot(screenHeight, slope), 0.026],
      glass,
      { finish: "window", rx: -Math.atan2(slope, screenHeight) },
    );
    beam(
      [-width / 2 + 0.2, roof - 0.02, front - slope],
      [width / 2 - 0.2, roof - 0.02, front - slope],
      0.07,
      open ? trim : color,
    );
    if (!open)
      add([0, (roof + 1.17) / 2, rear + 0.09], [width - 0.38, roof - 1.27, 0.025], glass, {
        finish: "window",
        rx: Math.atan2(0.18, roof - 1.27),
      });
    for (const [i, seat] of d.seats.entries()) {
      const [x, y, z] = seat.cushion;
      add(seat.foot, [0.63, 0.025, 0.38], dark, { finish: "rubber", detail: true });
      add([x, y - 0.06, z], [0.68, 0.13, 0.65], upholstery, { finish: "fabric", detail: true });
      add([x, y + 0.31, z - 0.3], [0.65, 0.67, 0.15], upholstery, {
        finish: "fabric",
        rx: -0.08,
        detail: true,
      });
      add([x, y + 0.75, z - 0.35], [0.42, 0.24, 0.16], upholstery, {
        finish: "fabric",
        detail: true,
      });
      for (const dx of [-0.16, 0, 0.16])
        add([x + dx, y + 0.32, z - 0.208], [0.014, 0.43, 0.014], open ? "#bba0d6" : "#b99f7e", {
          finish: "fabric",
          detail: true,
          rx: -0.08,
        });
      if (!seat.hinge) continue;
      const side = seat.hinge[0] > 0 ? 1 : -1,
        len = seat.doorWidth;
      add([seat.hinge[0], 0.92, z], [0.13, 0.67, len - 0.035], color, { door: i });
      add([seat.hinge[0] + side * 0.035, 1.255, z], [0.055, 0.05, len - 0.05], trim, {
        finish: "metal",
        door: i,
      });
      if (!open) {
        add([seat.hinge[0], (roof + 1.3) / 2, z], [0.026, roof - 1.4, len - 0.12], glass, {
          shape: "sideWindow",
          finish: "window",
          door: i,
        });
        add([seat.hinge[0], roof - 0.12, z], [0.065, 0.08, len - 0.13], color, { door: i });
        beam(
          [seat.hinge[0], 1.25, z - len / 2 + 0.05],
          [seat.hinge[0], roof - 0.14, z - len / 2 + 0.15],
          0.075,
          color,
          { door: i },
        );
      }
      add([seat.hinge[0] + side * 0.085, 1.11, z - 0.31], [0.035, 0.05, 0.21], trim, {
        finish: "metal",
        door: i,
        detail: true,
      });
    }
    const driver = d.seats[0]!;
    add([0, 1.12, front - 0.2], [width - 0.38, 0.22, 0.3], dark, {
      finish: "plastic",
      detail: true,
    });
    if (!bajaj) {
      add([driver.cushion[0], driver.grips[0][1], driver.grips[0][2]], [0.59, 0.59, 0.59], dark, {
        shape: "ring",
        rx: -0.38,
        finish: "rubber",
        detail: true,
      });
      add([driver.cushion[0], 1.2, front - 0.37], [0.36, 0.13, 0.03], "#83b6c4", {
        finish: "glass",
        detail: true,
      });
    } else
      add([0, driver.grips[0][1], driver.grips[0][2]], [0.62, 0.07, 0.08], dark, {
        finish: "rubber",
        detail: true,
      });
    add([0, 0.59, length / 2 - 0.1], [width - 0.12, 0.18, 0.18], trim, { finish: "metal" });
    add([0, 0.49, length / 2 + 0.025], [width - 0.28, 0.07, 0.13], dark, { finish: "rubber" });
    add([0, 0.58, -length / 2 + 0.01], [width - 0.12, 0.14, 0.15], trim, { finish: "metal" });
    add([0, 0.77, length / 2 - 0.06], [jeep ? 0.83 : bajaj ? 0.34 : 1, 0.39, 0.06], dark);
    if (jeep)
      for (const x of [-0.33, -0.22, -0.11, 0, 0.11, 0.22, 0.33])
        add([x, 0.77, length / 2 - 0.015], [0.045, 0.32, 0.035], metal, { finish: "metal" });
    else
      for (const y of [0.66, 0.76, 0.86])
        add([0, y, length / 2 - 0.012], [bajaj ? 0.25 : 0.86, 0.025, 0.035], metal, {
          finish: "metal",
          detail: true,
        });
    add([0, 0.48, length / 2 + 0.1], [0.34, 0.09, 0.015], "#f4e4a2");
    if (open || jeep || bajaj)
      for (const side of [-1, 1])
        add(
          [side * d.headlights.x, d.headlights.y, d.headlights.z - 0.025],
          [0.39, 0.06, 0.39],
          trim,
          { shape: "cylinder", rx: Math.PI / 2, finish: "metal" },
        );
    else
      for (const side of [-1, 1])
        add(
          [side * d.headlights.x, d.headlights.y, d.headlights.z - 0.075],
          [0.5, kind === "car" || kind === "mpv" ? 0.19 : 0.26, 0.1],
          dark,
        );
    if (kind === "pickup" || (truck && emptyBed)) {
      const bedFront = rear - 0.1,
        bedRear = -length / 2 + 0.1,
        center = (bedFront + bedRear) / 2;
      add([0, 0.78, center], [width - 0.3, 0.09, bedFront - bedRear], dark);
      for (const side of [-1, 1])
        add([side * (width / 2 - 0.1), 1.01, center], [0.15, 0.46, bedFront - bedRear], color);
      add([0, 1.01, bedRear], [width - 0.15, 0.46, 0.13], color);
      if (!emptyBed) add([0, 1.03, center], [0.75, 0.44, 0.6], "#c7aa7b", { finish: "cardboard" });
    }
    if (truck && !emptyBed) {
      add([0, 1.72, -1.1], [2.22, 2.06, 1.98], "#eceae2");
      for (const x of [-1.12, 1.12]) {
        add([x, 1.02, -1.1], [0.025, 0.12, 1.9], color);
        for (const z of [-1.85, -1.35, -0.85, -0.35])
          add([x, 1.84, z], [0.03, 1.55, 0.025], metal, { finish: "metal", detail: true });
      }
      for (const x of [-0.6, 0.6])
        add([x, 1.7, -2.12], [0.035, 1.7, 0.03], metal, { finish: "metal" });
    }
    if (bajaj) {
      beam([0, 0.95, 0.85], [0, 0.34, 1.29], 0.08, dark, { finish: "metal" });
      add([0, 0.88, -1.35], [1.54, 0.85, 0.32], color);
      for (const side of [-1, 1]) {
        add([side * 0.77, 1.29, -1.13], [0.08, 0.78, 0.45], "#275d3e");
        beam([side * 0.8, 0.52, -0.8], [side * 0.8, 1.45, -0.8], 0.055, metal, { finish: "metal" });
        add([side * 0.8, 0.5, -0.15], [0.22, 0.07, 1.03], dark);
      }
      add([0, 1.15, 0.99], [1.12, 0.12, 0.1], "#f3bf3c");
    }
    if (jeep) {
      for (const side of [-1, 1]) {
        add([side * (width / 2 - 0.07), 0.94, -1.18], [0.12, 0.67, 2.28], color);
        add([side * (width / 2 + 0.01), 0.91, -1.18], [0.025, 0.17, 2.26], "#f1c445");
        beam(
          [side * (width / 2 - 0.08), 1.31, -2.02],
          [side * (width / 2 - 0.08), 1.31, -0.25],
          0.055,
          metal,
          { finish: "metal" },
        );
        add([side * (width / 2 + 0.08), 0.4, -1.12], [0.26, 0.08, 2.58], metal, {
          finish: "metal",
        });
      }
      add([0, 2.08, 1.26], [1.4, 0.18, 0.12], "#f2d368");
      add([0, 0.37, -2.56], [1.25, 0.1, 0.38], metal, { finish: "metal" });
    }
    if (kind === "angkot" || kind === "van") {
      for (const side of [-1, 1]) {
        add(
          [side * (width / 2 - 0.02), 0.81, -0.3],
          [0.03, 0.17, 3.3],
          kind === "angkot" ? "#f8ce59" : "#eee2c6",
        );
        if (kind === "van") add([side * (width / 2 - 0.09), 1.6, -0.86], [0.1, 0.64, 1.12], color);
      }
      if (kind === "angkot") add([0, roof + 0.11, 0.67], [0.84, 0.16, 0.25], "#f8e5bb");
    }
    if (open) {
      add([0, 1.1, -1.35], [width - 0.22, 0.2, 1.1], color, { shape: "hood", ry: Math.PI });
      for (const side of [-1, 1])
        beam([side * 0.49, 1.45, -0.52], [side * 0.49, 1.61, -0.52], 0.08, metal, {
          finish: "metal",
          detail: true,
        });
    }
  }
  if (rider) a.push(...trafficDriverParts(d, bike));
  return a;
}
