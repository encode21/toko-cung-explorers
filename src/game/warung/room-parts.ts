import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { LEVEL_LOOK } from "./model";
import { FLOOR_TILES, WALL_COLOR, awningStripe, extraParts, type WarungStyle } from "./decor";
import { BACK_RACK_X, RACK_LEVELS, SIDE_RACK_X, SIDE_RACK_Z } from "./merchandise";
export interface RoomPartsOptions {
  furnishings?: boolean;
  surroundings?: boolean;
  extras?: boolean;
  fixtures?: boolean;
}
export const WALL_H = 3.5;
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "bevel",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

/** Open steel uprights keep the groceries visible from either side of the aisle. */
function rackParts(x: number, z: number, face: 1 | -1): AssetPart[] {
  const frame = "#50665d";
  return [
    ...[-1.43, 1.43].flatMap((dx) => [
      ...[-0.34, 0.34].map((dz) =>
        part([x + dx, 1.31, z + dz], [0.065, 2.62, 0.065], frame, "box", "metal"),
      ),
      part([x + dx, 0.09, z], [0.12, 0.18, 0.8], "#49544d", "box", "rubber"),
    ]),
    // The cross-brace sits behind the goods and below the top shelf.
    ...[-1, 1].map((sign) => ({
      ...part([x, 1.4, z - face * 0.36], [3.59, 0.035, 0.025], frame, "box", "metal"),
      rz: sign * Math.atan2(2.24, 2.8),
    })),
    ...RACK_LEVELS.flatMap((y) => [
      part([x, y - 0.04, z], [2.92, 0.08, 0.76], "#c39a6d", "box", "wood"),
      part([x, y - 0.075, z + face * 0.385], [2.86, 0.15, 0.035], "#f2e2bf", "box"),
      part([x, y - 0.07, z - face * 0.37], [2.86, 0.1, 0.035], frame, "box", "metal"),
    ]),
    part([x, 2.6, z], [3, 0.11, 0.82], frame, "bevel", "metal"),
  ];
}

function counterParts(): AssetPart[] {
  const aluminum = "#b3beb9";
  return [
    // The solid till cabinet supports the left end of the glazed service counter.
    part([-2.48, 0.54, -1], [2.55, 0.98, 1.08], "#916546", "bevel", "wood"),
    ...[-3.08, -1.88].flatMap((x) => [
      part([x, 0.57, -1.55], [1.14, 0.8, 0.035], "#b4885e", "box", "wood"),
      part([x + 0.4, 0.85, -1.58], [0.13, 0.04, 0.06], aluminum, "box", "metal"),
      part([x, 0.57, -0.45], [1.13, 0.69, 0.035], "#a67852", "box", "wood"),
    ]),
    part([0, 0.1, -1], [7.48, 0.17, 1.04], "#435852", "box", "metal"),
    part([1.28, 0.23, -1], [4.94, 0.13, 1.08], "#d3c6ac", "box"),
    part([1.28, 0.62, -1.02], [4.85, 0.047, 0.92], "#c6d2be", "box", "metal"),
    part([1.28, 0.65, -0.478], [4.9, 0.77, 0.025], "#c7e3db", "box", "window"),
    part([3.73, 0.65, -1], [0.025, 0.77, 1.02], "#c7e3db", "box", "window"),
    ...[-1.18, 1.28, 3.73].flatMap((x) =>
      [-1.51, -0.46].map((z) => part([x, 0.65, z], [0.055, 0.8, 0.055], aluminum, "box", "metal")),
    ),
    // Supplies live under the counter, leaving the handover mat clear.
    ...[0.33, 0.385, 0.44].map((y) =>
      part([-0.47, y, -0.98], [0.78, 0.047, 0.43], "#bf9a6a", "box", "cardboard"),
    ),
    part([2.62, 0.745, -1], [0.68, 0.2, 0.47], "#829581", "bevel", "plastic"),
    part([2.62, 0.855, -1], [0.71, 0.035, 0.5], "#a6b4a0", "box", "plastic"),
    part([0, 1.08, -1], [7.7, 0.13, 1.24], "#cba879", "bevel", "wood"),
    part([0, 1.151, -1.04], [2.5, 0.014, 0.78], "#e6d5ac", "bevel", "fabric"),
    part([0, 1.16, -0.66], [2.6, 0.025, 0.05], "#b19a77", "box", "wood"),
    // Mechanical till with a cashier keypad and a second display facing the queue.
    part([-2.9, 1.23, -1.04], [0.73, 0.16, 0.55], "#555d55", "bevel", "metal"),
    part([-2.9, 1.38, -0.99], [0.66, 0.18, 0.46], "#e8dfc9", "bevel", "plastic"),
    part([-2.9, 1.56, -0.81], [0.48, 0.2, 0.14], "#565e54", "bevel", "plastic"),
    ...[-0.886, -0.734].map((z) =>
      part([-2.9, 1.57, z], [0.37, 0.1, 0.012], "#a2c8ab", "box", "glass"),
    ),
    ...[-3.1, -2.98, -2.86].flatMap((x) =>
      [-1.14, -1.01].map((z) =>
        part([x, 1.48, z], [0.085, 0.027, 0.08], "#555f58", "box", "plastic"),
      ),
    ),
    part([-2.71, 1.48, -1.08], [0.1, 0.035, 0.19], "#a5503e", "bevel", "plastic"),
    // Enamel market scale with a round dial and a shallow weighing pan.
    part([2.74, 1.22, -1.04], [0.62, 0.15, 0.46], "#3b695b", "bevel", "metal"),
    part([2.74, 1.41, -1.03], [0.42, 0.3, 0.32], "#69937e", "bevel", "metal"),
    {
      ...part([2.74, 1.43, -0.85], [0.32, 0.06, 0.32], aluminum, "cylinder", "metal"),
      rx: Math.PI / 2,
    },
    { ...part([2.74, 1.43, -0.81], [0.27, 0.025, 0.27], "#fff0cf", "cylinder"), rx: Math.PI / 2 },
    { ...part([2.71, 1.46, -0.791], [0.017, 0.12, 0.014], "#a83e30", "box"), rz: 0.6 },
    part([2.74, 1.6, -1.04], [0.13, 0.12, 0.13], "#6d7972", "cylinder", "metal"),
    { ...part([2.74, 1.7, -1.04], [0.75, 0.12, 0.5], aluminum, "dome", "metal"), rx: Math.PI },
    part([2.74, 1.7, -1.04], [0.75, 0.025, 0.5], "#d9ded6", "cylinder", "metal"),
    part([3.42, 1.37, -1.08], [0.3, 0.44, 0.24], "#c6a16f", "box", "cardboard"),
  ];
}

function coolerParts(): AssetPart[] {
  const frame = "#e8e4d5";
  return [
    part([5.15, 1.1, -3.14], [1, 2.2, 0.12], frame, "box", "metal"),
    ...[4.69, 5.61].map((x) => part([x, 1.1, -2.7], [0.08, 2.2, 1], frame, "box", "metal")),
    part([5.15, 0.23, -2.7], [1, 0.46, 1], frame, "bevel", "metal"),
    part([5.15, 2.07, -2.7], [1, 0.26, 1], frame, "bevel", "metal"),
    part([5.15, 2.07, -2.19], [0.85, 0.15, 0.025], "#8cbbb0", "box", "plastic"),
    ...[0.15, 0.22, 0.29].map((y) =>
      part([5.15, y, -2.19], [0.63, 0.026, 0.02], "#6d7974", "box", "metal"),
    ),
    ...[0.76, 1.17, 1.58].map((y) =>
      part([5.15, y, -2.71], [0.85, 0.04, 0.79], "#cad2c6", "box", "metal"),
    ),
    part([5.15, 1.2, -2.2], [0.86, 1.47, 0.025], "#c4e3e3", "box", "window"),
    ...[4.72, 5.58].map((x) =>
      part([x, 1.2, -2.19], [0.04, 1.51, 0.045], "#526158", "box", "rubber"),
    ),
    part([5.52, 1.1, -2.14], [0.05, 0.5, 0.07], "#4a625a", "bevel", "metal"),
  ];
}

/** Batched shop furnishings: real counter proportions and open grocery racks around the customer lane. */
export function roomParts(
  level: number,
  style: WarungStyle | undefined,
  options: RoomPartsOptions = {},
): AssetPart[] {
  const { furnishings = true, surroundings = true, extras = true, fixtures = true } = options;
  const base = LEVEL_LOOK[Math.min(Math.max(level, 1), 5) - 1]!;
  const awningId = style?.awning ?? "awning-level";
  const look = {
    wall: (style && WALL_COLOR[style.wall]) ?? base.wall,
    awning: awningStripe(awningId, base.awning, 0),
  };
  const [tileA, tileB] = FLOOR_TILES[style?.floor ?? "floor-kotak"] ?? FLOOR_TILES["floor-kotak"]!;
  const tiles: AssetPart[] = [];
  for (let x = 0; x < 12; x++)
    for (let z = 0; z < 10; z++)
      tiles.push(
        part([-5.5 + x, 0.012, -4.5 + z], [0.98, 0.024, 0.98], (x + z) % 2 ? tileA : tileB, "box"),
      );
  const streetDetails: AssetPart[] = [];
  for (let i = 0; i < 12; i++) {
    streetDetails.push(
      part([-11 + i * 2, 0.06, 8.15], [1.9, 0.14, 0.28], i % 2 ? "#f4f1ea" : "#3a3e42", "box"),
    );
  }
  for (let i = -10; i <= 10; i += 4) {
    streetDetails.push(part([i, 0.015, 11.9], [2.1, 0.02, 0.18], "#f4f1ea", "box"));
  }
  return [
    part([0, -0.2, 0], [12.4, 0.4, 10.4], "#cdb89a", "box"),
    ...tiles,
    part([-6, WALL_H / 2, 0], [0.3, WALL_H, 10], look.wall, "box", "concrete"),
    part([6, WALL_H / 2, 0], [0.3, WALL_H, 10], look.wall, "box", "concrete"),
    part([0, WALL_H / 2, -5], [12, WALL_H, 0.3], look.wall, "box", "concrete"),
    part([0, 0.16, -4.82], [11.6, 0.32, 0.05], "#796651", "box", "wood"),
    part([-5.82, 0.16, 0], [0.05, 0.32, 9.6], "#796651", "box", "wood"),
    part([5.82, 0.16, 0], [0.05, 0.32, 9.6], "#796651", "box", "wood"),
    // Timber framing and warm ceiling fixtures, no ceiling across the shop camera.
    ...[-5.75, 5.75].flatMap((x) => [
      part([x, 1.75, 4.95], [0.22, 3.5, 0.22], "#76523c", "box", "wood"),
      part([x, 3.35, 0], [0.2, 0.2, 10.2], "#76523c", "box", "wood"),
    ]),
    part([0, 3.35, 4.95], [11.6, 0.2, 0.22], "#76523c", "box", "wood"),
    ...(fixtures
      ? [-3.7, 3.7].flatMap((x) => [
          part([x, 3.2, 2.5], [1.3, 0.1, 0.24], "#606157", "box", "metal"),
          part([x, 3.14, 2.5], [1.15, 0.035, 0.17], "#fff1cf", "box", "paint"),
        ])
      : []),
    ...Array.from({ length: 12 }, (_, i) =>
      part(
        [-5.5 + i, 3.35, 5.45],
        [1, 0.14, 1.1],
        awningStripe(awningId, base.awning, i),
        "box",
        "fabric",
      ),
    ),
    ...[-4.5, 4.5].flatMap((x) => [
      part([x, 0.5, 4.95], [2.5, 1, 0.24], look.wall, "box", "concrete"),
      part([x, 1.04, 4.95], [2.6, 0.1, 0.34], "#a97750", "box", "wood"),
    ]),
    ...(furnishings
      ? [
          ...counterParts(),
          ...SIDE_RACK_X.flatMap((x) => rackParts(x, SIDE_RACK_Z, -1)),
          ...BACK_RACK_X.flatMap((x) => rackParts(x, -4.25, 1)),
          // Side fixtures remain clear of the customer lane.
          part([-5.76, 2.35, -1.7], [0.04, 0.8, 0.62], "#fff7e7", "box", "cardboard"),
          part([-5.72, 2.62, -1.7], [0.05, 0.16, 0.62], "#ba4934", "box"),
          part([0, 0.03, 4.55], [2.2, 0.03, 1], "#7c5a3c", "box", "fabric"),
          ...(level >= 2
            ? [
                {
                  ...part([5.7, 2.65, -1], [0.75, 0.11, 0.75], "#e7e7d9", "cylinder", "plastic"),
                  rz: Math.PI / 2,
                },
                {
                  ...part([5.62, 2.65, -1], [0.25, 0.13, 0.25], look.awning, "cylinder", "plastic"),
                  rz: Math.PI / 2,
                },
              ]
            : []),
          ...(level >= 3 ? coolerParts() : []),
        ]
      : []),
    ...(surroundings
      ? [
          // Shopfront street stays visible beyond the customers.
          part([0, -0.26, 6.5], [32, 0.4, 28], "#9ec27b", "box"),
          part([0, -0.06, 6.6], [28, 0.14, 3.2], "#d8d1c2", "box"),
          part([0, -0.1, 12], [32, 0.12, 7.6], "#4e5358", "box"),
          part([0, -0.06, 16.8], [32, 0.14, 2.2], "#d8d1c2", "box"),
          ...streetDetails,
          part([-4.4, 0.42, 6], [2.1, 0.1, 0.55], "#b37c4d", "box", "wood"),
          part([-5.2, 0.2, 6], [0.14, 0.4, 0.45], "#7c5534", "box", "wood"),
          part([-3.6, 0.2, 6], [0.14, 0.4, 0.45], "#7c5534", "box", "wood"),
          part([4.8, 0.32, 6], [0.55, 0.64, 0.55], "#b55d3c", "cylinder", "plastic"),
          part([4.8, 0.88, 6], [0.85, 0.85, 0.85], "#59a85c", "sphere"),
          part([3.7, 0.35, 6], [0.46, 0.7, 0.46], "#4b8ec2", "cylinder", "plastic"),
        ]
      : []),
    ...(style ? extraParts(extras ? style : { ...style, extras: [] }) : []),
    ...(surroundings
      ? [
          part([7.8, 2, 7.6], [0.14, 4, 0.14], "#4a545c", "cylinder", "metal"),
          part([7.3, 3.9, 7.6], [1.1, 0.12, 0.14], "#4a545c", "box", "metal"),
          part([6.9, 3.8, 7.6], [0.4, 0.16, 0.26], "#fff2b3", "box", "glass"),
          // A modest neighbouring façade closes the horizon without another live city scene.
          ...[-8, 0, 8].flatMap((x, i) => [
            part(
              [x, 2.4, 19],
              [7.4, 4.8, 1.2],
              ["#d4bda2", "#bfc8af", "#d5c8b3"][i]!,
              "box",
              "concrete",
            ),
            part([x, 4.85, 18.7], [7.7, 0.2, 1.8], "#92765c", "bevel", "metal"),
            part([x, 1.65, 18.35], [4.8, 3.3, 0.08], "#7f8c85", "box", "metal"),
            ...Array.from({ length: 9 }, (_, j) =>
              part([x, 0.25 + j * 0.36, 18.29], [4.78, 0.025, 0.03], "#65776f", "box", "metal"),
            ),
          ]),
        ]
      : []),
  ];
}
