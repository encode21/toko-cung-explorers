import type { VehiclePart } from "./vehicles";
import type { Vec3 } from "../world/layout";
import type { MotorcycleModel } from "../vehicles/motorcycles";
import { motorcycleDefinition } from "../vehicles/motorcycles.ts";
import { trafficDriverParts } from "./vehicle-driver.ts";

export function motorcycleParts(
  model: MotorcycleModel,
  color: string,
  rider: boolean,
): VehiclePart[] {
  const d = motorcycleDefinition(model),
    parts: VehiclePart[] = [];
  const retro = model === "motorcycle",
    maxi = model === "scooter",
    sport = model === "sport-bike";
  const dark = "#1c2328",
    rubber = "#252a2d",
    silver = "#b9c1c4",
    seat = retro ? "#65493a" : "#292d31",
    rim = maxi ? "#877453" : retro ? "#b4b9bb" : "#4e5961";
  const add = (p: Vec3, s: Vec3, c: string, extra: Partial<VehiclePart> = {}) =>
    parts.push({ p, s, color: c, shape: "coach", finish: "autoPaint", ...extra });
  const beam = (
    from: Vec3,
    to: Vec3,
    thickness: number,
    c: string,
    extra: Partial<VehiclePart> = {},
  ) => {
    const [dx, dy, dz] = to.map((v, i) => v - from[i]!) as Vec3;
    add(
      from.map((v, i) => (v + to[i]!) / 2) as Vec3,
      [thickness, Math.hypot(dx, dy, dz), thickness],
      c,
      {
        shape: "cylinder",
        rx: Math.atan2(dz, dy),
        rz: -Math.atan2(dx, Math.hypot(dy, dz)),
        finish: "metal",
        ...extra,
      },
    );
  };
  const body = (
    shape: NonNullable<VehiclePart["shape"]>,
    c = color,
    p: Vec3 = [0, 0, 0],
    finish: VehiclePart["finish"] = "autoPaint",
  ) => add(p, [1, 1, 1], c, { shape, finish });
  d.wheels.forEach(([x, y, z], wheel) => {
    const r = d.wheelRadius;
    add([x, y, z], [r * 2, r * 2, sport ? 1 : 0.9], rubber, {
      shape: "motoTire",
      ry: Math.PI / 2,
      finish: "rubber",
      wheel,
    });
    for (const side of [-1, 1]) {
      add([side * 0.085, y, z], [r * 1.5, r * 1.5, 0.55], rim, {
        shape: "motoRim",
        ry: Math.PI / 2,
        finish: "metal",
        wheel,
      });
      add([side * 0.09, y, z], [0.13, 0.055, 0.13], rim, {
        shape: "cylinder",
        rz: Math.PI / 2,
        finish: "metal",
        wheel,
      });
      for (let i = 0; i < 5; i++) {
        const t = (i * Math.PI * 2) / 5;
        beam(
          [side * 0.075, y + Math.sin(t) * 0.04, z + Math.cos(t) * 0.04],
          [side * 0.075, y + Math.sin(t + 0.15) * r * 0.7, z + Math.cos(t + 0.15) * r * 0.7],
          retro ? 0.045 : 0.03,
          rim,
          { wheel },
        );
      }
    }
    add([0.112, y, z], [r * 1.1, 0.018, r * 1.1], silver, {
      shape: "cylinder",
      rz: Math.PI / 2,
      finish: "metal",
      wheel,
    });
    for (let i = 0; i < 12; i++) {
      const t = (i * Math.PI) / 6;
      add(
        [0.125, y + Math.sin(t) * r * 0.45, z + Math.cos(t) * r * 0.45],
        [0.008, 0.019, 0.019],
        dark,
        { shape: "motoRound", wheel, detail: true },
      );
    }
    add([0.14, y + 0.1, z - 0.08], [0.06, 0.14, 0.08], maxi ? "#a99458" : dark, {
      finish: "metal",
    });
    if (wheel === 1) {
      add([0, y, z], [r * 2.26, r * 2.26, 1], color, { shape: "motoFender" });
      for (const side of [-1, 1]) {
        beam([side * 0.14, y, z], [side * 0.14, 0.91, z - 0.2], 0.055, silver);
        beam([side * 0.14, y + 0.17, z - 0.06], [side * 0.14, 1.05, z - 0.25], 0.072, dark);
      }
    } else {
      add([0, y - 0.01, z], [r * 2.18, r * 2.18, 0.85], dark, {
        shape: "motoFender",
        finish: "rubber",
      });
      for (const side of [-1, 1]) {
        beam([side * 0.16, y, z], [side * 0.16, 0.69, -0.25], 0.055, dark);
        add([side * 0.19, 0.56, z + 0.04], [0.12, 0.31, 0.12], silver, {
          shape: "motoSpring",
          rx: -0.2,
          finish: "metal",
        });
      }
    }
  });
  if (retro) {
    body("skupiPod");
    body("skupiApron");
    body("skupiFloor");
    body("skupiSeat", seat, [0, 0, 0], "fabric");
    add([0, 0.439, -0.02], [0.48, 0.025, 0.63], "#493d33", { finish: "rubber" });
    add([0, 0.61, -0.05], [0.35, 0.32, 0.2], "#413b37", { finish: "plastic" });
    add([0, 0.99, 0.747], [0.34, 0.4, 0.045], silver, {
      shape: "motoRound",
      rx: -0.28,
      finish: "metal",
    });
    add([0, 0.99, 0.775], [0.275, 0.34, 0.024], "#556b74", {
      shape: "motoRound",
      rx: -0.28,
      finish: "glass",
    });
    add([0, 1.07, 0.757], [0.19, 0.024, 0.018], "#ecf5ee", { rx: -0.28, finish: "glass" });
    for (const side of [-1, 1]) {
      add([side * 0.23, 0.75, 0.744], [0.075, 0.18, 0.036], silver, {
        shape: "motoRound",
        rx: -0.18,
        finish: "metal",
      });
      add([side * 0.23, 0.75, 0.768], [0.042, 0.12, 0.024], "#edd1a0", {
        shape: "motoRound",
        finish: "glass",
      });
      add([side * 0.274, 0.66, -0.63], [0.014, 0.03, 0.43], "#bdc9bd", {
        rx: -0.08,
        finish: "metal",
      });
    }
  } else if (maxi) {
    body("pzxPod");
    body("pzxNose");
    body("pzxSill");
    body("pzxSeat", seat, [0, 0, 0], "fabric");
    body("pzxScreen", "#293d48", [0, 0, 0], "autoGlass");
    for (const side of [-1, 1]) {
      body("pzxSide", color, [side * 0.24, 0, 0]);
      add([side * 0.23, 0.477, -0.03], [0.115, 0.03, 0.6], dark, { finish: "rubber" });
      beam([side * 0.23, 0.92, -0.98], [side * 0.25, 0.88, -0.54], 0.035, dark);
      add([side * 0.23, 1.08, 0.91], [0.2, 0.025, 0.055], silver, {
        rz: side * -0.3,
        finish: "metal",
      });
    }
  } else {
    body("zxTank");
    body("zxNose");
    body("zxTail");
    body("zxSeat", seat, [0, 0, 0], "fabric");
    body("zxScreen", "#7794a2", [0, 0, 0], "autoGlass");
    add([0, 0.51, -0.04], [0.46, 0.34, 0.5], "#444d51", { finish: "metal" });
    add([0, 0.34, 0.13], [0.5, 0.1, 0.78], dark);
    for (const side of [-1, 1]) {
      body("zxFairing", color, [side * 0.28, 0, 0]);
      body("zxVent", "#111b22", [side * 0.325, 0, 0]);
      body("zxStripe", "#6c7982", [side * 0.335, 0, 0]);
      beam([side * 0.21, 0.53, -0.74], [side * 0.21, 0.83, -0.15], 0.04, silver);
      beam([side * 0.21, 0.89, -0.72], [side * 0.21, 0.63, -0.14], 0.04, dark);
    }
    add([0, 1.227, 0.23], [0.11, 0.012, 0.11], silver, {
      shape: "cylinder",
      finish: "metal",
      detail: true,
    });
  }
  if (!retro)
    for (const sign of [-1, 1]) {
      const lamp = d.headlights;
      add([sign * lamp.x, lamp.y, lamp.z - 0.018], [0.245, 0.085, 0.025], dark, {
        ry: sign * 0.5,
        rz: -sign * 0.2,
      });
    }
  // Engine/CVT, muffler and a real mudguard beneath the tail.
  add([-0.17, 0.4, -0.57], [0.22, 0.23, 0.7], dark, { shape: "motoRound", finish: "metal" });
  add([-0.275, 0.42, -0.47], [0.025, 0.2, 0.2], "#4b5457", { shape: "motoRound", finish: "metal" });
  add([0.28, 0.39, -0.63], [0.21, 0.22, 0.72], dark, { rx: -0.13, finish: "metal" });
  add([0.386, 0.42, -0.61], [0.04, 0.17, 0.59], retro ? silver : "#697278", {
    shape: "motoRound",
    rx: -0.13,
    finish: "metal",
  });
  add([0.28, 0.44, -0.99], [0.13, 0.12, 0.025], "#11181d", {
    shape: "motoRound",
    finish: "rubber",
  });
  add([0, 0.56, -1.04], [0.2, 0.33, 0.04], dark, { rx: -0.2, finish: "rubber" });
  add([0, 0.52, -1.09], [0.22, 0.1, 0.02], "#303b41", { rx: -0.2 });
  const grips = d.seats[0]!.grips;
  beam(grips[0], grips[1], 0.045, dark);
  beam([0, 1.03, 0.52], [0, grips[0][1], grips[0][2]], 0.055, silver);
  add([0, grips[0][1], 0.38], [0.36, 0.12, 0.2], retro ? color : dark);
  add([0, grips[0][1] + 0.065, 0.345], [0.19, 0.015, 0.12], "#344a4f", {
    finish: "glass",
    rx: 0.12,
  });
  for (const side of [-1, 1]) {
    add([side * 0.23, grips[0][1], grips[0][2]], [0.14, 0.055, 0.065], rubber, {
      finish: "rubber",
    });
    beam([side * 0.18, grips[0][1], 0.35], [side * 0.36, 1.47, 0.42], 0.018, silver);
    add([side * 0.38, 1.49, 0.43], [retro ? 0.17 : 0.22, 0.14, 0.045], dark, {
      shape: retro ? "motoRound" : "coach",
      rz: side * -0.25,
    });
    add([side * 0.38, 1.49, 0.402], [retro ? 0.14 : 0.18, 0.115, 0.012], "#91a5ae", {
      shape: retro ? "motoRound" : "coach",
      rz: side * -0.25,
      finish: "metal",
    });
    beam([side * 0.24, 0.82, -0.82], [side * 0.24, 0.84, -1.02], 0.033, dark);
    const foot = d.seats[1]!.foot;
    beam([side * 0.2, foot[1], foot[2]], [side * 0.36, foot[1], foot[2]], 0.035, silver);
  }
  if (sport)
    for (const foot of d.seats.map((s) => s.foot))
      beam([-0.34, foot[1], foot[2]], [0.34, foot[1], foot[2]], 0.04, silver);
  if (rider) parts.push(...trafficDriverParts(d, true));
  return parts;
}
