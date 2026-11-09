import type { VehicleDefinition } from "../vehicles/definitions";
import type { VehiclePart } from "./vehicles";
import type { Vec3 } from "../world/layout";

/** Low-cost original NPC, batched with its vehicle and seated at the same driver anchor. */
export function trafficDriverParts(d: VehicleDefinition, bike: boolean): VehiclePart[] {
  const seat = d.seats[0]!,
    [x, y, z] = seat.cushion,
    parts: VehiclePart[] = [];
  const skin = "#d6a77d",
    shirt = "#428dac",
    trousers = "#334553",
    hair = "#49362d";
  const add = (p: Vec3, s: Vec3, color: string, extra: Partial<VehiclePart> = {}) =>
    parts.push({
      p,
      s,
      color,
      shape: "coach",
      finish: "fabric",
      npc: true,
      detail: true,
      ...extra,
    });
  const limb = (from: Vec3, to: Vec3, width: number, color: string) => {
    const dx = to[0] - from[0],
      dy = to[1] - from[1],
      dz = to[2] - from[2];
    add(
      from.map((n, i) => (n + to[i]!) / 2) as Vec3,
      [width, Math.hypot(dx, dy, dz), width],
      color,
      { rx: Math.atan2(dz, dy), rz: -Math.atan2(dx, Math.hypot(dy, dz)) },
    );
  };
  add([x, y + 0.31, z], [0.46, 0.6, 0.28], shirt);
  add([x, y + 0.75, z + 0.02], [0.49, 0.48, 0.46], skin, { shape: "sphere" });
  add([x, y + 0.87, z], [0.51, 0.31, 0.49], bike ? "#f3c24c" : hair, { shape: "dome" });
  for (const side of [-1, 1]) {
    add([x + side * 0.25, y + 0.75, z + 0.01], [0.07, 0.11, 0.08], skin, { shape: "sphere" });
    add([x + side * 0.09, y + 0.78, z + 0.245], [0.045, 0.06, 0.02], "#26333b", {
      shape: "sphere",
    });
    const shoulder: Vec3 = [x + side * 0.25, y + 0.43, z],
      elbow: Vec3 = [x + side * 0.29, y + 0.21, z + 0.16];
    const grip = seat.grips[side < 0 ? 0 : 1];
    limb(shoulder, elbow, 0.14, shirt);
    limb(elbow, grip, 0.115, skin);
    add(grip, [0.13, 0.12, 0.14], skin, { shape: "sphere" });
    const knee: Vec3 = [x + side * (bike ? 0.24 : 0.15), y - 0.02, z + 0.37];
    limb([x + side * 0.14, y, z], knee, 0.17, trousers);
    limb(knee, [knee[0], seat.foot[1] + 0.1, seat.foot[2]], 0.16, trousers);
    add([knee[0], seat.foot[1] + 0.07, seat.foot[2] + 0.04], [0.18, 0.13, 0.3], "#253039");
  }
  add([x, y + 0.71, z + 0.265], [0.07, 0.07, 0.06], skin, { shape: "sphere" });
  return parts;
}
