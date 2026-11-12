import type { Vec3 } from "../world/layout";
import type { VehicleDefinition } from "../vehicles/definitions";
import type { VehiclePart } from "./vehicles";

/** Cab-over hauler and family MPV shells. Seat/hinge anchors remain the shared source of truth. */
export function roadVehicleBody(
  kind: "truck" | "mpv",
  d: VehicleDefinition,
  paint: string,
  emptyBed: boolean,
): VehiclePart[] {
  const a: VehiclePart[] = [];
  const add = (p: Vec3, s: Vec3, color: string, extra: Partial<VehiclePart> = {}) =>
    a.push({ p, s, color, shape: "coach", ...extra });
  const beam = (
    from: Vec3,
    to: Vec3,
    thickness: number,
    color: string,
    extra: Partial<VehiclePart> = {},
  ) => {
    const dx = to[0] - from[0],
      dy = to[1] - from[1],
      dz = to[2] - from[2];
    add(
      from.map((n, i) => (n + to[i]!) / 2) as Vec3,
      [thickness, Math.hypot(dx, dy, dz), thickness],
      color,
      { rx: Math.atan2(dz, dy), rz: -Math.atan2(dx, Math.hypot(dy, dz)), ...extra },
    );
  };
  const truck = kind === "truck";
  const color = truck ? "#d6c471" : paint;
  const dark = "#202930",
    metal = "#b7bec0",
    glass = "#9fb5bd";
  const width = d.size[0],
    length = d.size[2],
    roof = d.roof;
  const [rear, cabinFront] = d.cabin;
  const front = truck ? cabinFront : 1.46;
  const shellX = width / 2 - 0.1;
  const slope = truck ? 0.13 : 0.78;
  const bottom = truck ? 1.32 : 1.39;

  // A full dark chassis is visible below the cargo bed and the sills.
  add([0, 0.32, 0], [width - 0.4, 0.16, length - 0.26], dark, { finish: "metal" });
  add([0, truck ? 0.82 : 0.49, (rear + front) / 2], [width - 0.32, 0.1, front - rear], dark, {
    finish: "rubber",
  });
  if (truck) {
    add([0, 1.03, 2.78], [width - 0.17, 0.72, 0.38], color, { shape: "truckCab" });
    add([0, 1.22, 2.61], [width - 0.21, 0.16, 0.46], color);
    add([0, 1.63, rear + 0.015], [width - 0.25, 1.3, 0.1], color);
    for (const side of [-1, 1]) {
      add([side * 0.7, 0.42, -0.55], [0.12, 0.2, 4.25], dark, { finish: "metal" });
      add([side * 1.04, 0.46, -0.45], [0.08, 0.11, 1.7], metal, { finish: "metal" });
      add([side * 1.0, 0.48, 1.3], [0.26, 0.09, 0.62], dark, { finish: "rubber" });
      for (const y of [0.69, 0.78])
        add([side * 1.04, y, 1.26], [0.2, 0.06, 0.53], metal, { finish: "metal", detail: true });
      add([side * 0.73, 0.56, -0.56], [0.45, 0.33, 0.92], dark, { finish: "metal" });
      add([side * 1.02, 0.38, -2.28], [0.28, 0.44, 0.055], "#151d22", { finish: "rubber" });
    }
  } else {
    // Stamped sides follow the wheel arches; no rectangular body covering the tires.
    for (const side of [-1, 1]) {
      add([side * shellX, 0.75, 0], [0.14, 1, length], color, { shape: "mpvPanel" });
      add([side * (shellX - 0.025), 0.36, 0], [0.12, 0.12, 1.88], color);
      add([side * (shellX + 0.067), 0.45, 0], [0.022, 0.045, 1.93], metal, {
        finish: "metal",
        detail: true,
      });
      add([side * 0.84, 1.24, -1.63], [0.23, 0.43, 0.72], color, { shape: "mpvHood", ry: Math.PI });
      add([side * 0.86, 1.68, -1.45], [0.024, 0.58, 0.52], glass, {
        shape: "sideWindow",
        finish: "window",
      });
      beam([side * 0.92, 1.3, -1.98], [side * 0.77, 1.99, -1.68], 0.14, color);
      add([side * 0.84, 1.08, -2.1], [0.21, 0.56, 0.13], "#9b3435", { finish: "glass" });
      add([side * 0.84, 1.14, -2.175], [0.15, 0.1, 0.025], "#d8d9cb", {
        finish: "glass",
        detail: true,
      });
    }
    add([0, 1.13, 1.61], [width - 0.05, 0.53, 1.13], color, { shape: "mpvHood" });
    add([0, 0.89, -2.03], [width - 0.2, 0.7, 0.23], color);
    add([0, 1.18, -2.065], [width - 0.35, 0.18, 0.2], color);
    add([0, 0.6, 2.1], [width - 0.09, 0.38, 0.22], color);
    add([0, 0.84, 2.095], [width - 0.15, 0.18, 0.17], color);
    add([0, 0.53, -2.09], [width - 0.13, 0.25, 0.18], color);
    add([0, 1.99, -1.77], [width - 0.35, 0.075, 0.2], color);
    add([0, 1.985, -1.88], [0.46, 0.035, 0.025], "#9d3237", { finish: "glass", detail: true });
    add([0, 0.52, 2.225], [1.12, 0.21, 0.035], dark, { finish: "plastic" });
    for (const side of [-1, 1]) {
      add([side * 0.78, 0.59, 2.19], [0.27, 0.22, 0.065], dark, { finish: "plastic" });
      add([side * 0.78, 0.6, 2.23], [0.13, 0.035, 0.13], "#d8e3df", {
        shape: "cylinder",
        rx: Math.PI / 2,
        finish: "glass",
      });
      // Flush lenses sit below the hood edge, in the same fascia plane as the grille.
      add([side * 0.7, 0.94, 2.185], [0.026, 0.17, 0.5], "#c8d7d8", {
        shape: "sideWindow",
        ry: (side * Math.PI) / 2,
        finish: "glass",
      });
      add([side * 0.86, 0.93, 2.204], [0.065, 0.08, 0.007], "#d6a044", {
        finish: "glass",
        detail: true,
      });
    }
  }

  // Tapered A/C pillars enclose a genuinely transparent cabin.
  if (truck)
    add(
      [0, roof, (rear + front - slope) / 2],
      [width - 0.22, 0.13, front - rear - slope + 0.18],
      color,
    );
  else add([0, roof, -0.48], [width - 0.18, 0.16, 2.62], color, { shape: "mpvRoof" });
  for (const side of [-1, 1]) {
    beam(
      [side * shellX, bottom, front],
      [side * (shellX - 0.11), roof - 0.02, front - slope],
      0.105,
      color,
    );
    if (truck)
      beam(
        [side * shellX, 1.22, rear],
        [side * (shellX - 0.06), roof - 0.03, rear + 0.06],
        0.11,
        color,
      );
    const mirrorZ = front - 0.12;
    beam(
      [side * shellX, truck ? 1.66 : 1.36, mirrorZ],
      [side * (width / 2 + 0.03), truck ? 1.74 : 1.42, mirrorZ + 0.03],
      0.045,
      dark,
      { finish: "plastic" },
    );
    add(
      [side * (width / 2 + 0.08), truck ? 1.73 : 1.44, mirrorZ],
      [0.2, truck ? 0.33 : 0.16, 0.22],
      dark,
      { finish: "plastic" },
    );
    add(
      [side * (width / 2 + 0.19), truck ? 1.73 : 1.44, mirrorZ - 0.025],
      [0.02, truck ? 0.26 : 0.11, 0.15],
      metal,
      { finish: "metal", detail: true },
    );
  }
  const screenHeight = roof - bottom - 0.08;
  add(
    [0, bottom + screenHeight / 2, front - slope / 2],
    [width - 0.4, Math.hypot(screenHeight, slope), 0.026],
    glass,
    { finish: "window", rx: -Math.atan2(slope, screenHeight) },
  );
  add([0, bottom - 0.035, front - 0.015], [width - 0.27, 0.07, 0.07], dark, { finish: "rubber" });
  for (const side of [-1, 1])
    beam(
      [side * 0.55, bottom + 0.015, front + 0.012],
      [side * 0.12, bottom + 0.1, front - 0.01],
      0.025,
      dark,
      { finish: "rubber", detail: true },
    );
  if (!truck) {
    add([0, 1.65, rear - 0.27], [width - 0.48, 0.59, 0.025], glass, { finish: "window", rx: 0.3 });
    add([0, 1.3, -2.19], [0.67, 0.055, 0.026], metal, { finish: "metal" });
    beam([0.28, 1.39, rear - 0.17], [-0.22, 1.48, rear - 0.19], 0.026, dark, {
      finish: "rubber",
      detail: true,
    });
  }

  d.seats.forEach((seat, i) => {
    const [x, y, z] = seat.cushion;
    const side = x > 0 ? 1 : -1,
      len = seat.doorWidth;
    add([x, y - 0.055, z], [0.67, 0.14, 0.65], "#4b4e4a", { finish: "fabric", detail: true });
    add([x, y + 0.3, z - 0.3], [0.64, 0.68, 0.14], "#4b4e4a", {
      finish: "fabric",
      rx: -0.08,
      detail: true,
    });
    add([x, y + 0.73, z - 0.34], [0.38, 0.22, 0.13], "#383e3d", { finish: "fabric", detail: true });
    if (!seat.hinge) return;
    const hx = seat.hinge[0];
    add([hx, truck ? 1.11 : 1.08, z], [0.1, truck ? 0.49 : 0.61, len - 0.045], color, { door: i });
    add([hx + side * 0.055, bottom - 0.018, z], [0.035, 0.045, len - 0.035], dark, {
      door: i,
      finish: "rubber",
    });
    const frontDoor = !truck && i < 2;
    add(
      [hx, (roof + bottom) / 2 - (truck ? 0.055 : 0.025), frontDoor ? 0.65 : z],
      [0.025, roof - bottom - (truck ? 0.17 : 0.06), frontDoor ? 1.3 : len - 0.1],
      glass,
      { shape: frontDoor ? "mpvFrontWindow" : "sideWindow", finish: "window", door: i },
    );
    if (truck) add([hx, roof - 0.12, z - 0.04], [0.07, 0.065, len - 0.12], color, { door: i });
    beam(
      [hx, bottom, z - len / 2 + 0.025],
      [hx - side * 0.07, roof - (truck ? 0.11 : 0.015), z - len / 2 + 0.09],
      0.07,
      dark,
      { door: i, finish: "rubber" },
    );
    add(
      [hx + side * 0.063, truck ? 1.18 : 1.13, z - 0.29],
      [0.045, 0.055, 0.22],
      truck ? dark : metal,
      { finish: "metal", door: i, detail: true },
    );
    add(
      [hx + side * 0.061, truck ? 0.91 : 0.96, z - len / 2 + 0.01],
      [0.018, truck ? 0.32 : 0.28, 0.014],
      "#858c86",
      { detail: true, door: i },
    );
  });
  const driver = d.seats[0]!;
  add([0, truck ? 1.28 : 1.15, front - 0.25], [width - 0.3, 0.2, 0.33], dark, {
    finish: "plastic",
    detail: true,
  });
  add([driver.cushion[0], driver.grips[0][1], driver.grips[0][2]], [0.59, 0.59, 0.59], dark, {
    shape: "ring",
    rx: -0.38,
    finish: "rubber",
    detail: true,
  });
  add([0, truck ? 0.54 : 0.69, length / 2 + 0.005], [0.51, 0.16, 0.025], "#172126", {
    finish: "plastic",
  });
  add([0, 0.51, -length / 2 + 0.025], [0.51, 0.16, 0.025], "#172126", { finish: "plastic" });
  const grilleY = truck ? 0.91 : 1.01;
  add(
    [0, grilleY, length / 2 + (truck ? 0.017 : -0.04)],
    [truck ? 1.5 : 1.08, truck ? 0.39 : 0.2, 0.045],
    dark,
    {
      finish: "plastic",
    },
  );
  for (const y of truck ? [0.81, 0.91, 1.01] : [0.98, 1.06])
    add([0, y, length / 2 + (truck ? 0.045 : -0.007)], [truck ? 1.32 : 0.94, 0.027, 0.02], metal, {
      finish: "metal",
      detail: true,
    });
  add([0, grilleY + 0.045, length / 2 + (truck ? 0.064 : 0.012)], [0.13, 0.055, 0.13], metal, {
    shape: "ring",
    rx: Math.PI / 2,
    finish: "metal",
  });

  if (truck) {
    const cargo = "#a94337",
      ribs = "#bd5141";
    const bedFront = 0.82,
      bedRear = -2.91,
      bedLength = bedFront - bedRear,
      center = (bedFront + bedRear) / 2;
    add([0, 0.87, center], [2.18, 0.16, bedLength], "#75372d", { finish: "metal" });
    for (const side of [-1, 1]) {
      add([side * 1.065, 1.77, center], [0.085, 1.66, bedLength], cargo, { shape: "box" });
      for (const y of [1.02, 1.75, 2.59])
        add([side * 1.12, y, center], [0.075, 0.09, bedLength + 0.04], ribs, { shape: "box" });
      for (let z = bedRear + 0.13; z < bedFront; z += 0.53) {
        add([side * 1.12, 1.8, z], [0.075, 1.66, 0.09], ribs, { shape: "box" });
        add([side * 1.12, 0.91, z], [0.065, 0.19, 0.08], dark, { finish: "metal", detail: true });
      }
      for (const z of [bedRear + 0.14, bedFront - 0.14])
        add([side * 1.11, 2.51, z], [0.035, 0.06, 0.15], "#d49b42", {
          finish: "glass",
          detail: true,
        });
    }
    for (const z of [bedRear, bedFront]) {
      add([0, 1.77, z], [2.17, 1.66, 0.085], cargo, { shape: "box" });
      for (const y of [1.02, 1.75, 2.59])
        add([0, y, z], [2.25, 0.09, 0.11], ribs, { shape: "box" });
      for (const x of [-0.7, 0, 0.7]) add([x, 1.78, z], [0.09, 1.66, 0.11], ribs, { shape: "box" });
    }
    add([0, 0.5, -2.94], [2.16, 0.12, 0.1], dark, { finish: "metal" });
    add([0, 0.57, 2.91], [2.18, 0.18, 0.16], color);
    for (const side of [-1, 1]) {
      add([side * 0.87, 0.88, 3.008], [0.4, 0.47, 0.065], dark, { finish: "plastic" });
      add([side * 0.87, 0.94, 3.05], [0.31, 0.24, 0.023], "#dde3da", { finish: "glass" });
      add([side * 0.87, 0.75, 3.052], [0.31, 0.09, 0.025], "#c99535", { finish: "glass" });
      add([side * 0.75, 1.02, -2.98], [0.08, 0.19, 0.06], metal, { finish: "metal", detail: true });
    }
    // The mission supplies its actual parcels; parked supply trucks carry generic cartons.
    if (!emptyBed)
      for (let i = 0; i < 4; i++)
        add(
          [(i % 2) * 0.84 - 0.42, 1.22, -0.6 - Math.floor(i / 2) * 1.03],
          [0.75, 0.55, 0.78],
          "#ba9162",
          { finish: "cardboard" },
        );
  }
  return a;
}
