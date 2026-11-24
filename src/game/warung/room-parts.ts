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

/** Open shelves have a thin back panel; merchandise sits in front instead of inside a solid box. */
function rackParts(x: number, z: number, face: 1 | -1): AssetPart[] {
  return [
    part([x, 1.35, z - face * 0.34], [2.88, 2.54, 0.055], "#a18364", "box", "wood"),
    ...[-1.43, 1.43].flatMap((dx) => [
      part([x + dx, 1.31, z], [0.09, 2.62, 0.76], "#70533d", "box", "wood"),
      part([x + dx, 0.08, z], [0.14, 0.16, 0.8], "#4d5551", "box", "metal"),
    ]),
    ...RACK_LEVELS.flatMap((y) => [
      part([x, y - 0.04, z], [2.92, 0.08, 0.76], "#c3a17a", "box", "wood"),
      part([x, y - 0.075, z + face * 0.385], [2.86, 0.15, 0.035], "#f2e2bf", "box", "paint"),
    ]),
    part([x, 2.6, z], [3, 0.13, 0.82], "#70533d", "bevel", "wood"),
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
          // Cashier-side service counter, with the central handing-over area kept clear.
          part([0, 0.54, -1], [7.5, 0.98, 1.08], "#77533b", "bevel", "wood"),
          ...Array.from({ length: 7 }, (_, i) =>
            part(
              [-3.15 + i * 1.05, 0.54, -1.55],
              [1, 0.84, 0.04],
              i % 2 ? "#a67c54" : "#98704d",
              "box",
              "wood",
            ),
          ),
          part([0, 1.08, -1], [7.7, 0.13, 1.24], "#cba879", "bevel", "wood"),
          part([0, 1.151, -1.04], [2.5, 0.014, 0.78], "#e6d5ac", "bevel", "fabric"),
          part([0, 1.16, -0.66], [2.6, 0.025, 0.05], "#b19a77", "box", "wood"),
          // Register, drawer and display face the shopkeeper.
          part([-2.9, 1.23, -1.04], [0.68, 0.16, 0.56], "#d9d6c8", "bevel", "metal"),
          part([-2.9, 1.38, -0.99], [0.58, 0.18, 0.4], "#efe9db", "bevel", "plastic"),
          part([-2.9, 1.63, -0.86], [0.44, 0.28, 0.1], "#515953", "bevel", "plastic"),
          part([-2.9, 1.64, -0.918], [0.34, 0.16, 0.012], "#a9ceae", "box", "glass"),
          ...Array.from({ length: 3 }, (_, i) =>
            part([-3.06 + i * 0.16, 1.48, -1.08], [0.1, 0.025, 0.12], "#6b7166", "box", "plastic"),
          ),
          // Paper bags and a balance scale are tools, not invented saleable stock.
          part([2.9, 1.21, -1.03], [0.65, 0.14, 0.53], "#728f7d", "bevel", "metal"),
          part([2.9, 1.35, -1.03], [0.46, 0.12, 0.38], "#e2dfcb", "bevel", "metal"),
          part([2.9, 1.43, -1.03], [0.68, 0.04, 0.5], "#b7bbb0", "bevel", "metal"),
          part([3.44, 1.37, -1.08], [0.3, 0.44, 0.24], "#c6a16f", "box", "cardboard"),
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
          ...(level >= 3
            ? [
                part([5.15, 1.1, -2.7], [1, 2.2, 1], "#eee9da", "bevel", "metal"),
                part([5.15, 1.15, -2.18], [0.82, 1.8, 0.035], "#96b9b8", "box", "window"),
                part([5.51, 1.1, -2.14], [0.05, 0.7, 0.06], "#4a625a", "box", "metal"),
              ]
            : []),
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
