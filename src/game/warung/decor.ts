import type { AssetPart, Finish, Shape } from "@/game/assets/parts";

/** Server `WarungDecor::style`: active paint/awning/floor, extras switched on, decor ids owned. */
export interface WarungStyle {
  wall: string;
  awning: string;
  floor: string;
  extras: string[];
  owned: string[];
}
export interface WarungDecorItem {
  id: string;
  slot: "wall" | "awning" | "floor" | "extra";
  name: string;
  price: number;
  level: number;
}

const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "box",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

/** Render colours per decor id; the default (price 0) ids keep the level look. */
export const WALL_COLOR: Record<string, string> = {
  // Saturated enough to read from the overhead camera, even at night.
  "wall-mint": "#9fe0c0",
  "wall-pink": "#f4adc0",
  "wall-biru": "#9fcdf0",
  "wall-bata": "#b4643f",
};
const RAINBOW = ["#e2483d", "#f28c28", "#f2c14e", "#59b36a", "#3fa7c9", "#7b5cc4"];
/** Awning stripe colour i (12 stripes across the front). */
export function awningStripe(id: string, levelColor: string, i: number) {
  if (id === "awning-pelangi") return RAINBOW[i % RAINBOW.length]!;
  const [a, b] =
    id === "awning-tosca"
      ? ["#1fb5a8", "#fff6e8"]
      : id === "awning-kuning"
        ? ["#f2c14e", "#fff6e8"]
        : id === "awning-emas"
          ? ["#1d1d1f", "#d4af37"]
          : [levelColor, "#fff6e8"];
  return i % 2 === 0 ? a : b;
}
/** Floor tile colours [odd, even]. */
export const FLOOR_TILES: Record<string, [string, string]> = {
  "floor-kotak": ["#e9dcc4", "#f6efe1"],
  "floor-catur": ["#2f3134", "#f4f4f2"],
  "floor-kayu": ["#b07a4c", "#c48d5c"],
  "floor-teraso": ["#ddd5c6", "#ece6db"],
};

/** Extra decor pieces in warung-local space (room is 12×10, open front at +z). */
export function extraParts(style: Pick<WarungStyle, "wall" | "extras">): AssetPart[] {
  const on = new Set([...style.extras, style.wall]);
  const out: AssetPart[] = [];
  if (on.has("wall-bata"))
    // Mortar lines so the brick reads as brick, not just orange paint.
    for (let y = 0.35; y < 3.4; y += 0.35)
      out.push(part([0, y, -4.84], [11.6, 0.03, 0.02], "#e8d2b8"));
  if (on.has("poster"))
    for (const [x, z, bg, band] of [
      [-5.8, 1.6, "#ffd23f", "#e2483d"],
      [-5.8, 3.1, "#ff7ab6", "#ffffff"],
      [5.8, 2.6, "#3fa7c9", "#fff6e8"],
    ] as const)
      out.push(
        part([x, 2.1, z], [0.04, 1.25, 0.95], bg),
        part([x + (x < 0 ? 0.02 : -0.02), 2.4, z], [0.05, 0.32, 0.8], band),
        part([x + (x < 0 ? 0.02 : -0.02), 1.85, z], [0.05, 0.12, 0.6], band),
      );
  if (on.has("tanaman"))
    for (const x of [-5.2, 5.2])
      out.push(
        part([x, 0.35, 4.25], [0.65, 0.7, 0.65], "#c4653f", "cylinder", "plastic"),
        part([x, 1.15, 4.25], [1.15, 1.1, 1.15], "#3f9a4c", "sphere"),
        part([x + 0.25, 1.75, 4.05], [0.7, 0.7, 0.7], "#5fbf63", "sphere"),
        part([x - 0.2, 1.6, 4.45], [0.55, 0.55, 0.55], "#4dae57", "sphere"),
      );
  if (on.has("kipas"))
    out.push(
      part([-5.76, 2.9, 0.8], [0.14, 0.3, 0.3], "#f4f4f4", "box", "plastic"),
      part([-5.58, 2.9, 0.8], [0.08, 1.05, 1.05], "#e9f6fb", "cylinder", "plastic"),
      part([-5.53, 2.9, 0.8], [0.06, 0.95, 0.22], "#5ab8dd", "box", "plastic"),
      part([-5.53, 2.9, 0.8], [0.06, 0.22, 0.95], "#5ab8dd", "box", "plastic"),
    );
  if (on.has("lampu-hias")) {
    out.push(part([0, 3.24, 6.05], [11.6, 0.03, 0.03], "#2b2b2b", "box"));
    for (let i = 0; i < 16; i++)
      out.push(
        part(
          [-5.6 + i * 0.75, 3.05 - (i % 2) * 0.08, 6.05],
          [0.26, 0.32, 0.26],
          ["#ffe14d", "#ff5c9a", "#5fe0ff", "#8dff6a"][i % 4]!,
          "sphere",
          "plastic",
        ),
      );
  }
  if (on.has("lampu-gantung"))
    for (const x of [-1.8, 0, 1.8])
      out.push(
        part([x, 3.1, 0.9], [0.04, 0.8, 0.04], "#3a3a3a", "cylinder", "metal"),
        part([x, 2.55, 0.9], [0.8, 0.4, 0.8], "#2f6f5e", "cylinder", "metal"),
        part([x, 2.3, 0.9], [0.42, 0.24, 0.42], "#fff3a6", "sphere", "plastic"),
      );
  if (on.has("meja-makan"))
    out.push(
      part([3.6, 0.78, 3.3], [1.6, 0.1, 1.0], "#c99a6a", "bevel", "wood"),
      part([3.6, 0.38, 3.3], [0.14, 0.76, 0.14], "#7c5534", "cylinder", "wood"),
      part([3.6, 0.86, 3.3], [0.2, 0.12, 0.2], "#ff8a3d", "cylinder", "plastic"),
      part([2.55, 0.27, 3.3], [0.48, 0.54, 0.48], "#59b36a", "cylinder", "plastic"),
      part([4.65, 0.27, 3.3], [0.48, 0.54, 0.48], "#f2c14e", "cylinder", "plastic"),
      part([3.6, 0.27, 4.2], [0.48, 0.54, 0.48], "#3fa7c9", "cylinder", "plastic"),
    );
  if (on.has("neon-buka"))
    out.push(part([4.35, 1.8, 5.08], [2.2, 0.8, 0.06], "#1d1d1f", "bevel", "plastic"));
  if (on.has("kulkas-neon"))
    out.push(
      part([-5.15, 1.15, -3.6], [1.1, 2.3, 1.05], "#f4f4f4", "bevel", "plastic"),
      part([-4.58, 1.2, -3.6], [0.04, 1.85, 0.85], "#bfe6f7", "box", "glass"),
      part([-4.56, 2.2, -3.6], [0.05, 0.2, 0.9], "#ff4fa3", "box", "plastic"),
      part([-4.56, 0.22, -3.6], [0.05, 0.14, 0.9], "#3fe0ff", "box", "plastic"),
      ...[0.7, 1.15, 1.6].flatMap((y, i) =>
        [-3.9, -3.6, -3.3].map((z, j) =>
          part(
            [-4.75, y, z],
            [0.14, 0.32, 0.14],
            ["#e2483d", "#59b36a", "#f2c14e"][(i + j) % 3]!,
            "cylinder",
            "plastic",
          ),
        ),
      ),
    );
  if (on.has("akuarium"))
    out.push(
      part([5.3, 0.45, 1.7], [0.9, 0.9, 1.9], "#7c5534", "bevel", "wood"),
      part([5.3, 1.35, 1.7], [0.82, 0.9, 1.8], "#7fd3f0", "box", "glass"),
      part([5.3, 0.96, 1.7], [0.8, 0.1, 1.78], "#e8d39a", "box"),
      part([5.25, 1.4, 1.3], [0.08, 0.16, 0.26], "#ff8a3d", "box", "plastic"),
      part([5.35, 1.55, 2.1], [0.08, 0.16, 0.26], "#ffd23f", "box", "plastic"),
      part([5.3, 1.25, 1.75], [0.08, 0.14, 0.24], "#ff5c9a", "box", "plastic"),
      part([5.3, 1.15, 2.2], [0.1, 0.4, 0.1], "#4f9d55", "cylinder", "plastic"),
      part([5.3, 1.1, 1.2], [0.1, 0.3, 0.1], "#67b86b", "cylinder", "plastic"),
    );
  return out;
}
