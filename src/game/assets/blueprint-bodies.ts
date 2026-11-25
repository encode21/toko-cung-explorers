import { CAR_BLUEPRINTS, type BlueprintModel } from "../vehicles/blueprints.ts";
import type { VehicleDefinition } from "../vehicles/definitions";
import type { Vec3 } from "../world/layout";
import type { VehiclePart } from "./vehicles";
import type { BlueprintShape } from "./blueprint-geometry";

/** Hollow painted shells and dark glazing, using the same material language as the city bus. */
export function blueprintBody(
  model: BlueprintModel,
  d: VehicleDefinition,
  color: string,
  emptyBed: boolean,
) {
  const b = CAR_BLUEPRINTS[model],
    parts: VehiclePart[] = [];
  const dark = "#101d29",
    chrome = "#b6c7cf",
    glass = "#183441";
  const half = b.length / 2,
    shellX = b.width / 2 - 0.055;
  const [rear, front] = b.cabin,
    [roofRear, roofFront] = b.roofEnds;
  const pickup = model === "pickup" || model === "double-cabin";
  const sporty = model === "sport" || model === "sedan";
  const ev = model === "city-car",
    van = model === "angkot";
  const add = (p: Vec3, s: Vec3, paint: string, extra: Partial<VehiclePart> = {}) =>
    parts.push({ p, s, color: paint, shape: "coach", finish: "autoPaint", ...extra });
  const shape = (section: string, x = 0, paint = color, extra: Partial<VehiclePart> = {}) =>
    add([x, 0, 0], [1, 1, 1], paint, {
      shape: `${model}-${section}${x < 0 ? "-left" : ""}` as BlueprintShape,
      ...extra,
    });
  const beam = (
    a: Vec3,
    c: Vec3,
    thickness: number,
    paint: string,
    extra: Partial<VehiclePart> = {},
  ) => {
    const dx = c[0] - a[0],
      dy = c[1] - a[1],
      dz = c[2] - a[2];
    add(
      a.map((n, i) => (n + c[i]!) / 2) as Vec3,
      [thickness, Math.hypot(dx, dy, dz), thickness],
      paint,
      { rx: Math.atan2(dz, dy), rz: -Math.atan2(dx, Math.hypot(dy, dz)), ...extra },
    );
  };
  add([0, b.seat - 0.55, 0], [b.width - 0.4, 0.1, b.length - 0.3], dark, { finish: "rubber" });
  add([0, b.seat - 0.51, (rear + front) / 2], [b.width - 0.19, 0.1, front - rear], dark, {
    finish: "plastic",
  });
  shape("hood");
  if (!pickup) shape("boot");
  shape("roof", 0, ev ? dark : color);
  shape("windshield", 0, glass, { finish: "autoGlass" });
  shape("backlight", 0, glass, { finish: "autoGlass" });

  for (const side of [1, -1]) {
    const x = side * shellX;
    shape("flank", x);
    shape("quarter", x, glass, { finish: "autoGlass" });
    const topX = x - side * 0.15;
    beam(
      [x - side * 0.035, b.belt, front],
      [topX, b.roof - 0.035, roofFront],
      0.08,
      ev ? dark : color,
    );
    beam(
      [x - side * 0.035, b.belt, rear],
      [topX, b.roof - 0.035, roofRear],
      0.095,
      ev ? dark : color,
    );
    beam(
      [topX, b.roof - 0.045, roofRear],
      [topX, b.roof - 0.045, roofFront],
      0.065,
      ev ? dark : color,
    );
    for (const [row, [start, end]] of b.doors.entries()) {
      const door = row * 2 + (side === 1 ? 0 : 1),
        middle = (start + end) / 2;
      shape(`door${row}`, x, color, { door });
      shape(`glass${row}`, x, glass, { finish: "autoGlass", door });
      add([x, b.belt + 0.015, middle], [0.085, 0.045, end - start - 0.015], dark, {
        door,
        finish: "plastic",
      });
      // The B-pillar is part of the moving door; there is no opaque cabin box behind it.
      const pillarZ = Math.max(start + 0.04, roofRear + 0.025);
      if (pillarZ < roofFront)
        beam([x - side * 0.03, b.belt, pillarZ], [topX, b.roof - 0.06, pillarZ], 0.08, dark, {
          door,
        });
      add(
        [x + side * 0.045, b.belt - 0.16, start + 0.22],
        [0.035, 0.055, ev ? 0.075 : 0.23],
        ev ? dark : chrome,
        { door, finish: "metal" },
      );
      if (ev)
        add([x + side * 0.045, b.belt + 0.12, start + 0.13], [0.04, 0.3, 0.065], chrome, {
          door,
          finish: "metal",
        });
      if (van) {
        add([x + side * 0.045, 0.99, middle], [0.02, 0.15, end - start - 0.03], "#e5c84d", {
          door,
        });
        if (row === 1)
          beam([x - side * 0.03, b.belt, middle], [topX, b.roof - 0.06, middle], 0.065, color, {
            door,
          });
      }
    }
    const mirrorZ = front - 0.24;
    add([x + side * 0.07, b.belt + 0.09, mirrorZ], [0.2, 0.04, 0.07], dark);
    add([x + side * 0.17, b.belt + 0.13, mirrorZ], [0.21, 0.17, 0.25], ev ? dark : color);
    add([x + side * 0.17, b.belt + 0.13, mirrorZ - 0.128], [0.16, 0.11, 0.018], chrome, {
      finish: "metal",
      detail: true,
    });
    if (sporty) {
      add([x, 0.34, 0], [0.12, 0.1, 2.0], dark);
      for (const z of [-0.15, 0, 0.15])
        add([x + side * 0.04, 0.94, 1.01 + z], [0.025, 0.065, 0.09], dark, { detail: true });
    }
    if (model === "mpv" || model === "double-cabin")
      add([side * (shellX + 0.02), 0.38, -0.1], [0.15, 0.1, 2.0], dark, { finish: "rubber" });
    if (model === "mpv")
      add([side * (shellX - 0.12), b.roof + 0.055, -0.45], [0.065, 0.06, 2.35], chrome, {
        finish: "metal",
      });
    if (van) {
      add([x + side * 0.03, 0.99, -1.61], [0.03, 0.15, 1.18], "#e5c84d");
      add([x + side * 0.04, 0.34, -0.26], [0.23, 0.1, 1.18], chrome, { finish: "metal" });
    }
  }
  // Curved bumpers and separate fascia details keep the body open around all four wheels.
  for (const end of [1, -1]) {
    const top = end === 1 ? b.belt - (model === "sport" ? 0.3 : 0.16) : b.belt - 0.07;
    add([0, (top + 0.34) / 2, end * (half - 0.1)], [b.width - 0.18, top - 0.34, 0.22], color);
    add([0, 0.36, end * (half - 0.045)], [b.width - 0.18, 0.08, 0.11], dark, { finish: "plastic" });
    add([0, 0.59, end * (half + 0.008)], [0.4, 0.13, 0.018], "#121921", { finish: "plastic" });
    add([0, 0.615, end * (half + 0.02)], [0.28, 0.012, 0.008], "#cbd3d5", { detail: true });
  }
  const grilleY = model === "sport" ? 0.64 : b.belt - 0.39;
  if (!ev)
    add(
      [0, grilleY, half - 0.002],
      [
        model === "double-cabin" || model === "sport" ? 1.1 : 0.88,
        model === "sport" ? 0.22 : 0.28,
        0.045,
      ],
      dark,
    );
  else add([0, 0.47, half + 0.005], [1.03, 0.1, 0.025], dark);
  if (model === "car" || model === "sedan") {
    for (const side of [-1, 1]) {
      add([side * 0.23, grilleY + 0.03, half + 0.025], [0.4, 0.25, 0.025], chrome, {
        finish: "metal",
      });
      add([side * 0.23, grilleY + 0.03, half + 0.041], [0.31, 0.18, 0.02], dark);
      for (const dx of [-0.09, 0, 0.09])
        add([side * 0.23 + dx, grilleY + 0.03, half + 0.054], [0.018, 0.16, 0.014], chrome, {
          finish: "metal",
          detail: true,
        });
    }
  } else if (!ev && model !== "sport") {
    for (const y of [-0.085, 0, 0.085])
      add([0, grilleY + y, half + 0.023], [0.86, 0.025, 0.025], chrome, { finish: "metal" });
  }
  for (const side of [-1, 1]) {
    const x = side * d.headlights.x;
    add(
      [x, d.headlights.y, half - 0.035],
      [
        ev ? 0.31 : model === "pickup" ? 0.35 : 0.45,
        ev ? 0.39 : model === "pickup" ? 0.35 : 0.16,
        0.08,
      ],
      dark,
    );
    add([x, d.headlights.y + 0.06, half + 0.01], [ev ? 0.22 : 0.42, 0.035, 0.02], "#dcecf4", {
      finish: "glass",
    });
    add([x + side * 0.18, d.headlights.y - 0.065, half + 0.012], [0.065, 0.04, 0.018], "#e7a03a", {
      finish: "glass",
    });
    if (!pickup && !van && !ev) add([side * 0.7, 0.55, half + 0.014], [0.4, 0.14, 0.025], dark);
    add(
      [x, d.headlights.y, -half + 0.025],
      [ev || pickup ? 0.23 : 0.48, ev || pickup ? 0.3 : 0.18, 0.045],
      "#8f2536",
      { finish: "glass" },
    );
    add(
      [x, d.headlights.y + 0.035, -half - 0.002],
      [ev || pickup ? 0.16 : 0.4, 0.035, 0.015],
      "#ee4a50",
      { finish: "glass" },
    );
    if (model === "sport")
      for (const dx of [-0.11, 0.11])
        add([x + dx, 0.93, -half - 0.015], [0.15, 0.035, 0.15], "#bf3548", {
          shape: "cylinder",
          rx: Math.PI / 2,
          finish: "glass",
        });
  }
  if (ev) {
    add([0, b.belt + 0.025, front + 0.02], [b.width - 0.12, 0.04, 0.045], chrome, {
      finish: "metal",
    });
    add([0, b.belt - 0.015, half - 0.002], [b.width - 0.22, 0.035, 0.03], "#e5f4ff", {
      finish: "glass",
    });
    add([0, b.belt + 0.025, rear - 0.01], [b.width - 0.2, 0.04, 0.035], "#e33f4b", {
      finish: "glass",
    });
  }
  if (model === "sport") {
    for (const side of [-1, 1]) add([side * 0.67, 1.4, -half + 0.3], [0.09, 0.44, 0.16], dark);
    add([0, 1.61, -half + 0.28], [b.width - 0.08, 0.095, 0.38], color);
    for (const side of [-1, 1])
      add([side * (b.width / 2 - 0.08), 1.63, -half + 0.28], [0.045, 0.21, 0.4], color);
  }
  if (model === "sedan") add([0, b.belt + 0.045, -half + 0.1], [b.width - 0.25, 0.055, 0.18], dark);
  if (pickup) {
    const bedFront = rear - 0.08,
      bedBack = -half + 0.12,
      middle = (bedFront + bedBack) / 2;
    add(
      [0, 0.62, middle],
      [b.width - 0.2, 0.09, bedFront - bedBack],
      model === "pickup" ? color : dark,
    );
    add([0, 1.0, bedFront], [b.width - 0.2, 0.72, 0.08], color);
    add([0, 0.91, bedBack], [b.width - 0.16, 0.55, 0.09], color);
    for (const side of [-1, 1]) {
      add(
        [side * shellX, b.belt - 0.17, middle],
        [0.12, 0.065, bedFront - bedBack],
        model === "pickup" ? color : dark,
      );
      for (const y of [0.83, 0.96])
        add([side * (shellX + 0.04), y, middle], [0.02, 0.024, bedFront - bedBack - 0.1], color, {
          detail: true,
        });
    }
    for (const x of [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6])
      add([x, 0.68, middle], [0.024, 0.018, bedFront - bedBack - 0.05], chrome, { detail: true });
    add([0, b.belt - 0.28, -half - 0.005], [0.26, 0.07, 0.02], dark, { detail: true });
    if (!emptyBed)
      add([0, 0.91, bedBack + 0.48], [0.66, 0.46, 0.64], "#ba9a68", {
        finish: "cardboard",
        detail: true,
      });
  }
  if (van) {
    add([0, b.roof + 0.075, 1.1], [0.72, 0.12, 0.18], "#f3d465");
    add([0, b.roof + 0.075, 1.2], [0.54, 0.065, 0.015], dark);
    for (const x of [-0.52, 0, 0.52])
      add([x, b.roof + 0.065, -0.3], [0.025, 0.025, 2.9], color, { detail: true });
  }
  // Seats and controls use the actual player anchors. Pickup retains its two rear bed seats.
  for (const [i, seat] of d.seats.entries()) {
    const [x, y, z] = seat.cushion;
    const upholstery = model === "pickup" && i > 1 ? "#725e42" : sporty ? "#27303c" : "#4a555c";
    add([x, y - 0.055, z], [0.68, 0.12, 0.64], upholstery, { finish: "fabric", detail: true });
    if (model === "pickup" && i > 1) continue;
    add([x, y + 0.29, z - 0.3], [0.64, 0.65, 0.13], upholstery, {
      finish: "fabric",
      rx: -0.08,
      detail: true,
    });
    add([x, y + 0.72, z - 0.33], [0.38, 0.22, 0.15], upholstery, {
      finish: "fabric",
      detail: true,
    });
  }
  const driver = d.seats[0]!;
  add([0, 1.15, front - 0.17], [b.width - 0.25, 0.18, 0.3], dark, {
    finish: "plastic",
    detail: true,
  });
  add([driver.cushion[0], driver.grips[0][1], driver.grips[0][2]], [0.59, 0.59, 0.59], dark, {
    shape: "ring",
    rx: -0.38,
    finish: "rubber",
    detail: true,
  });
  for (const side of [-1, 1])
    add([side * 0.44, b.belt + 0.04, front + 0.008], [0.53, 0.022, 0.025], dark, {
      rz: side * 0.1,
      detail: true,
    });
  return parts;
}
