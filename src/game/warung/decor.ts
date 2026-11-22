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
  "wall-mint": "#cfeee0",
  "wall-pink": "#f6d5dc",
  "wall-biru": "#d3e7f7",
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
    out.push(
      part([-5.8, 2.1, 1.8], [0.04, 0.9, 0.65], "#ffd23f"),
      part([-5.78, 2.25, 1.8], [0.05, 0.3, 0.5], "#e2483d"),
      part([5.8, 2.1, 2.6], [0.04, 0.9, 0.65], "#3fa7c9"),
      part([5.78, 1.95, 2.6], [0.05, 0.25, 0.5], "#fff6e8"),
    );
  if (on.has("tanaman"))
    for (const x of [-5.25, 5.25])
      out.push(
        part([x, 0.3, 4.3], [0.5, 0.6, 0.5], "#b55d3c", "cylinder", "plastic"),
        part([x, 0.95, 4.3], [0.8, 0.8, 0.8], "#4f9d55", "sphere"),
        part([x + 0.15, 1.3, 4.15], [0.45, 0.45, 0.45], "#67b86b", "sphere"),
      );
  if (on.has("kipas"))
    out.push(
      part([-5.78, 2.9, 0.8], [0.12, 0.25, 0.25], "#f4f4f4", "box", "plastic"),
      part([-5.6, 2.9, 0.8], [0.08, 0.7, 0.7], "#8fd0e8", "cylinder", "plastic"),
    );
  if (on.has("lampu-hias"))
    for (let i = 0; i < 12; i++)
      out.push(
        part(
          [-5.5 + i, 3.18, 6.0],
          [0.16, 0.2, 0.16],
          ["#ffe066", "#ff6b9d", "#7ee0ff", "#9cff7a"][i % 4]!,
          "sphere",
          "glass",
        ),
      );
  if (on.has("lampu-gantung"))
    for (const x of [-1.6, 0, 1.6])
      out.push(
        part([x, 3.05, 0.9], [0.03, 0.9, 0.03], "#3a3a3a", "cylinder", "metal"),
        part([x, 2.5, 0.9], [0.55, 0.3, 0.55], "#2f6f5e", "cylinder", "metal"),
        part([x, 2.33, 0.9], [0.3, 0.12, 0.3], "#fff2b3", "sphere", "glass"),
      );
  if (on.has("meja-makan"))
    out.push(
      part([3.6, 0.75, 3.3], [1.2, 0.08, 0.8], "#c99a6a", "bevel", "wood"),
      part([3.6, 0.37, 3.3], [0.12, 0.74, 0.12], "#7c5534", "cylinder", "wood"),
      part([2.8, 0.25, 3.3], [0.42, 0.5, 0.42], "#59b36a", "cylinder", "plastic"),
      part([4.4, 0.25, 3.3], [0.42, 0.5, 0.42], "#f2c14e", "cylinder", "plastic"),
    );
  if (on.has("neon-buka"))
    out.push(part([4.35, 1.75, 5.08], [1.6, 0.6, 0.06], "#1d1d1f", "bevel", "plastic"));
  if (on.has("kulkas-neon"))
    out.push(
      part([-5.2, 1.1, -3.6], [1, 2.2, 1], "#f4f4f4", "bevel", "plastic"),
      part([-4.68, 1.15, -3.6], [0.04, 1.8, 0.8], "#bfe6f7", "box", "glass"),
      part([-4.66, 2.12, -3.6], [0.05, 0.12, 0.85], "#ff4fa3", "box", "glass"),
      part([-4.66, 0.2, -3.6], [0.05, 0.08, 0.85], "#7ee0ff", "box", "glass"),
    );
  if (on.has("akuarium"))
    out.push(
      part([5.35, 0.4, 1.7], [0.8, 0.8, 1.6], "#7c5534", "bevel", "wood"),
      part([5.35, 1.18, 1.7], [0.72, 0.72, 1.5], "#7fd3f0", "box", "glass"),
      part([5.35, 0.86, 1.7], [0.7, 0.08, 1.48], "#e8d39a", "box"),
      part([5.3, 1.2, 1.4], [0.06, 0.1, 0.18], "#ff8a3d", "box", "plastic"),
      part([5.4, 1.35, 2.0], [0.06, 0.1, 0.18], "#ffd23f", "box", "plastic"),
      part([5.35, 1.0, 1.9], [0.08, 0.3, 0.08], "#4f9d55", "cylinder", "plastic"),
    );
  return out;
}
