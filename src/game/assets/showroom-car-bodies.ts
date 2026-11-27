import type { VehicleDefinition } from "../vehicles/definitions";
import type { Vec3 } from "../world/layout";
import type { VehiclePart } from "./vehicles";
import { SHOWROOM_DASH_Z, type ShowroomCar } from "./showroom-car-geometry.ts";

export function showroomCarParts(
  model: ShowroomCar,
  definition: VehicleDefinition,
  paint: string,
): VehiclePart[] {
  const sport = model === "cung-velocity";
  const parts: VehiclePart[] = [];
  const [width, height, length] = definition.size;
  const [rear] = definition.cabin;
  const front = SHOWROOM_DASH_Z[model];
  const end = length / 2;
  const edge = width / 2;
  const belt = sport ? 0.94 : 1.04;

  const dark = "#182128";
  const steel = "#c7d4db";
  const glass = "#254858";
  const seatColor = sport ? "#222c36" : "#a95739";
  const stitch = sport ? "#b0c9d0" : "#d6845e";
  const cyan = sport ? "#82ddfb" : "#a4e5f6";

  const add = (p: Vec3, s: Vec3, color: string, extra: Partial<VehiclePart> = {}) =>
    parts.push({ p, s, color, shape: "coach", finish: "autoPaint", ...extra });

  const beam = (from: Vec3, to: Vec3, thickness: number, color: string) => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    add(
      from.map((n, i) => (n + to[i]!) / 2) as Vec3,
      [thickness, Math.hypot(dx, dy, dz), thickness],
      color,
      { rx: Math.atan2(dz, dy), rz: -Math.atan2(dx, Math.hypot(dy, dz)), finish: "metal" },
    );
  };

  const radius = definition.wheelRadius;
  definition.wheels.forEach(([x, y, z], wheel) => {
    const outward = Math.sign(x);
    add([x, y, z], [radius * 2, 0.235, radius * 2], "#22252b", {
      shape: "showroomTire",
      rz: Math.PI / 2,
      finish: "rubber",
      wheel,
    });
    add(
      [x + outward * 0.12, y, z],
      [radius * 1.61, radius * 1.61, 0.12],
      sport ? "#496c42" : steel,
      {
        shape: "ring",
        ry: Math.PI / 2,
        finish: "metal",
        wheel,
      },
    );
    add([x + outward * 0.127, y, z], [radius * 1.24, 0.032, radius * 1.24], "#303842", {
      shape: "cylinder",
      rz: Math.PI / 2,
      finish: "metal",
      wheel,
    });
    const spokes = sport ? 5 : 10;
    for (let i = 0; i < spokes; i++) {
      const angle = (i * Math.PI * 2) / spokes;
      add(
        [
          x + outward * 0.15,
          y + Math.sin(angle) * radius * 0.4,
          z + Math.cos(angle) * radius * 0.4,
        ],
        [0.03, sport ? 0.076 : 0.031, radius * 0.71],
        steel,
        { rx: -angle, finish: "metal", wheel },
      );
    }
    add(
      [x + outward * 0.17, y, z],
      [radius * 0.36, 0.055, radius * 0.36],
      sport ? "#164b60" : steel,
      {
        shape: "cylinder",
        rz: Math.PI / 2,
        finish: "metal",
        wheel,
      },
    );
  });

  const footHeight = definition.seats[0]!.foot[1];
  add([0, footHeight - 0.09, 0], [width - 0.53, 0.16, length - 0.76], dark, {
    finish: "plastic",
  });
  add([0, footHeight - 0.04, (rear + front) / 2], [width - 0.35, 0.08, front - rear], dark, {
    finish: "rubber",
  });
  const frameColor = sport ? "#18282d" : steel;
  add([0, 0, 0], [1, 1, 1], paint, { shape: `${model}-body` });
  add([0, 0, 0], [1, 1, 1], glass, { shape: `${model}-windshield`, finish: "autoGlass" });
  add([0, 0, 0], [1, 1, 1], frameColor, { shape: `${model}-frame`, finish: "metal" });
  add([0, 0, 0], [1, 1, 1], "#101920", { shape: `${model}-intakes`, finish: "plastic" });
  add([0, 0, 0], [1, 1, 1], cyan, { shape: `${model}-daylight`, finish: "glass" });
  add([0, 0, 0], [1, 1, 1], dark, { shape: `${model}-tail`, finish: "plastic" });
  add([0, 0, 0], [1, 1, 1], "#19282c", { shape: `${model}-lower-trim`, finish: "plastic" });

  for (const [door, seat] of definition.seats.entries()) {
    const [x, y, z] = seat.cushion;
    const side = Math.sign(x);
    const [hingeX, , hingeZ] = seat.hinge!;
    const doorRear = hingeZ - seat.doorWidth;
    add([0, 0, 0], [1, 1, 1], paint, {
      shape: `${model}-door-${side > 0 ? "right" : "left"}`,
      door,
    });
    add([hingeX + side * 0.043, belt - 0.12, doorRear + 0.27], [0.03, 0.038, 0.21], steel, {
      door,
      finish: "metal",
    });
    beam(
      [side * (edge - 0.19), belt + 0.067, front - 0.109],
      [side * (edge + 0.04), belt + 0.132, front - 0.17],
      0.075,
      frameColor,
    );
    add([side * (edge + 0.02), belt + 0.144, front - 0.15], [0.27, 0.145, 0.294], paint, {
      shape: "sphere",
    });
    add([side * (edge + 0.025), belt + 0.146, front - 0.288], [0.181, 0.075, 0.02], steel, {
      shape: "sphere",
      finish: "metal",
      detail: true,
    });

    add([x, y - 0.056, z], [0.57, 0.15, 0.62], seatColor, { finish: "fabric" });
    add([x, y + 0.28, z - 0.27], [0.58, 0.58, 0.145], seatColor, {
      rx: -0.16,
      finish: "fabric",
    });
    add([x, y + 0.62, z - 0.325], [0.39, 0.2, 0.156], seatColor, { rx: -0.16, finish: "fabric" });
    for (const offset of [-0.14, 0.14]) {
      add([x + offset, y + 0.28, z - 0.185], [sport ? 0.028 : 0.014, 0.43, 0.025], stitch, {
        rx: -0.16,
        finish: "fabric",
      });
    }
    add([x, y + 0.38, z - 0.173], [sport ? 0.29 : 0.19, 0.036, 0.018], stitch, {
      finish: "fabric",
    });

    if (!sport)
      add([side * (edge - 0.39), 0.77, -end - 0.011], [0.234, 0.123, 0.049], "#d34a52", {
        shape: "sphere",
        ry: side * -0.24,
        finish: "glass",
      });
  }

  const driver = definition.seats[0]!;
  const [steeringX] = driver.cushion;
  const [, gripY, gripZ] = driver.grips[0];
  add([0, belt - 0.055, front - 0.14], [width - 0.38, 0.2, 0.32], dark, { finish: "plastic" });
  add([0, definition.seats[0]!.cushion[1] + 0.02, rear * 0.42], [0.235, 0.26, 0.88], dark, {
    finish: "plastic",
    detail: true,
  });
  add([steeringX, gripY, gripZ], [0.49, 0.49, 0.19], dark, {
    shape: "ring",
    rx: -0.36,
    finish: "rubber",
    detail: true,
  });
  add([steeringX, gripY, gripZ], [0.3, 0.036, 0.039], steel, { finish: "metal", detail: true });
  beam([steeringX, gripY, gripZ], [steeringX, belt - 0.06, front - 0.21], 0.069, dark);

  if (sport) {
    for (const x of [-0.62, -0.39, 0.39, 0.62]) {
      add([x, 0.76, -end - 0.035], [0.157, 0.157, 0.04], "#da5453", {
        shape: "ring",
        finish: "glass",
      });
    }
    for (const x of [-0.65, 0.65]) {
      beam([x, 0.91, -end + 0.25], [x, height - 0.16, -end + 0.12], 0.11, dark);
      add([x * 1.46, height - 0.135, -end + 0.1], [0.052, 0.2, 0.37], dark, { finish: "plastic" });
    }
    add([0, height - 0.14, -end + 0.11], [1.96, 0.1, 0.4], dark, { rx: -0.11, finish: "plastic" });
    add([0, height - 0.081, -end + 0.195], [1.87, 0.017, 0.036], paint, { finish: "metal" });
  } else {
    const grilleY = 0.733;
    add([0, grilleY, end - 0.01], [0.82, 0.61, 0.18], steel, { finish: "metal" });
    add([0, grilleY - 0.01, end + 0.067], [0.69, 0.494, 0.034], dark, { finish: "plastic" });
    for (let i = -6; i <= 6; i++) {
      add([i * 0.049, grilleY - 0.01, end + 0.09], [0.018, 0.462, 0.022], steel, {
        finish: "metal",
      });
    }
    add([0, 1.0, end - 0.12], [0.13, 0.073, 0.098], "#ba8c68", { finish: "metal" });
    add([0, 0.615, -end - 0.039], [1.22, 0.059, 0.039], steel, { finish: "metal" });
    for (const x of [-0.22, 0, 0.22]) {
      add([x, 1.08, -end + 0.51], [0.032, 0.026, 0.55], steel, { finish: "metal", detail: true });
    }
  }
  return parts;
}
