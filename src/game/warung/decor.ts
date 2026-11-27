import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { DECOR_DEFAULT_INSTANCES, getDecorInstances } from "./decor-placement";

export interface DecorPlacement {
  surface: "floor" | "back-wall" | "left-wall" | "right-wall" | "ceiling";
  x: number;
  y: number;
  z: number;
  rotation: number;
}

/** Server `WarungDecor::style`: active paint/awning/floor, extras switched on, decor ids owned. */
export interface WarungStyle {
  wall: string;
  awning: string;
  floor: string;
  extras: string[];
  owned: string[];
  placements?: Record<string, DecorPlacement>;
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

/** Wall models face +z. All models share the same local anchor in the editor and the shop. */
function shopPoster(index: number): AssetPart[] {
  const ink = ["#97432e", "#206d68", "#355d83"][index]!;
  const paper = ["#f1d69d", "#f1e4c6", "#e9d9b9"][index]!;
  const parts = [
    part([0, 0, 0], [0.95, 1.24, 0.045], "#645342", "bevel", "wood"),
    part([0, 0, 0.027], [0.87, 1.16, 0.012], paper),
    part([0, 0.43, 0.04], [0.73, 0.16, 0.012], ink),
    part([-0.08, -0.42, 0.04], [0.58, 0.033, 0.012], ink),
    part([-0.19, -0.49, 0.04], [0.36, 0.018, 0.012], ink),
  ];
  // Flat illustrations of a coffee cup, bottled syrup, and a sardine tin.
  if (index === 0) {
    parts.push(
      part([0.16, 0.01, 0.044], [0.23, 0.23, 0.025], ink, "ring"),
      part([-0.05, 0.0, 0.05], [0.38, 0.29, 0.02], ink, "bevel"),
      part([-0.03, -0.16, 0.048], [0.54, 0.055, 0.02], "#bb8051", "bevel"),
      { ...part([-0.1, 0.23, 0.046], [0.026, 0.1, 0.012], ink), rz: -0.24 },
    );
  } else if (index === 1) {
    parts.push(
      part([0, -0.02, 0.045], [0.24, 0.46, 0.015], ink, "bevel"),
      part([0, 0.225, 0.045], [0.115, 0.09, 0.015], ink),
      part([0, 0.28, 0.045], [0.14, 0.035, 0.02], "#a95035"),
      part([0, -0.01, 0.058], [0.19, 0.14, 0.01], "#e3ac4d"),
    );
  } else {
    parts.push(
      part([0, 0, 0.045], [0.56, 0.37, 0.02], ink, "bevel"),
      part([-0.025, 0, 0.059], [0.27, 0.12, 0.014], paper, "sphere"),
      { ...part([0.135, 0, 0.059], [0.12, 0.12, 0.014], paper), rz: Math.PI / 4 },
    );
  }
  return parts;
}

function pottedPlant(index: number): AssetPart[] {
  const clay = index === 0 ? "#a76242" : "#ae7555";
  const leaves = ["#4d713f", "#73894b", "#395f3a", "#64844c"];
  const parts = [
    part([0, 0.35, 0], [0.63, 0.58, 0.63], clay, "cylinder"),
    part([0, 0.075, 0], [0.66, 0.085, 0.66], "#85563e", "cylinder"),
    part([0, 0.635, 0], [0.72, 0.12, 0.72], clay, "cylinder"),
    part([0, 0.696, 0], [0.6, 0.019, 0.6], "#554431", "cylinder"),
  ];
  for (let i = 0; i < 8; i++) {
    const angle = ((i + index * 0.4) * Math.PI) / 4;
    const length = 0.82 + ((i * 3 + index) % 5) * 0.12;
    const lean = i % 2 ? 0.44 : 0.23;
    const offset = 0.04 + (length * Math.sin(lean)) / 2;
    parts.push({
      ...part(
        [offset * Math.cos(angle), 0.69 + (length * Math.cos(lean)) / 2, -offset * Math.sin(angle)],
        [0.17, length, 0.09],
        leaves[i % leaves.length]!,
        "sphere",
      ),
      ry: angle,
      rz: -lean,
    });
  }
  return parts;
}

function wallFan(): AssetPart[] {
  const parts = [
    part([0, -0.08, 0.02], [0.21, 0.41, 0.1], "#dfd5bd", "bevel", "plastic"),
    part([0, -0.07, 0.1], [0.14, 0.19, 0.17], "#60665e", "bevel", "metal"),
    part([0, 0, 0.14], [0.94, 0.94, 0.1], "#3d514f", "ring", "metal"),
  ];
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    parts.push({
      ...part(
        [-0.2 * Math.sin(angle), 0.2 * Math.cos(angle), 0.18],
        [0.25, 0.43, 0.08],
        "#7fa5a0",
        "sphere",
        "plastic",
      ),
      rz: angle - 0.32,
    });
  }
  for (let rib = 0; rib < 6; rib++)
    parts.push({
      ...part([0, 0, 0.24], [0.014, 0.9, 0.019], "#b1b8ae", "box", "metal"),
      rz: (rib * Math.PI) / 6,
    });
  parts.push(part([0, 0, 0.25], [0.22, 0.22, 0.07], "#d8cfb5", "sphere", "metal"));
  return parts;
}

function festoonLights(): AssetPart[] {
  const parts: AssetPart[] = [];
  const colors = ["#ffc367", "#e5826c", "#9ac7c1", "#f6d99a"];
  const height = (i: number) => 0.24 - 0.19 * Math.sin(((i % 8) * Math.PI) / 8);
  for (let i = 0; i < 16; i++) {
    const x = -5.6 + i * 0.7;
    const y = height(i),
      nextY = height(i + 1);
    parts.push(
      {
        ...part(
          [x + 0.35, (y + nextY) / 2, 0],
          [Math.hypot(0.7, nextY - y), 0.026, 0.026],
          "#403e35",
          "box",
          "rubber",
        ),
        rz: Math.atan2(nextY - y, 0.7),
      },
      part([x, y - 0.055, 0], [0.075, 0.11, 0.075], "#5d5446", "cylinder", "metal"),
      part([x, y - 0.17, 0], [0.16, 0.19, 0.16], colors[i % 4]!, "sphere", "glass"),
    );
  }
  return parts;
}

function pendantLamp(): AssetPart[] {
  return [
    part([0, -0.04, 0], [0.24, 0.075, 0.24], "#645d4c", "cylinder", "metal"),
    part([0, -0.42, 0], [0.028, 0.75, 0.028], "#363936", "cylinder", "rubber"),
    part([0, -0.81, 0], [0.15, 0.17, 0.15], "#a68b58", "cylinder", "metal"),
    part([0, -1.08, 0], [0.79, 0.5, 0.79], "#3e7169", "dome", "metal"),
    part([0, -1.075, 0], [0.78, 0.028, 0.78], "#e7debc", "cylinder", "metal"),
    part([0, -1.13, 0], [0.19, 0.23, 0.19], "#ffe8a5", "sphere", "glass"),
  ];
}

function diningTable(): AssetPart[] {
  const parts = [
    part([0, 0.78, 0], [1.6, 0.09, 1.0], "#b78050", "bevel", "wood"),
    part([0, 0.68, 0], [1.42, 0.12, 0.85], "#765038", "box", "wood"),
    part([0.27, 0.855, -0.18], [0.22, 0.06, 0.16], "#ac5040", "bevel", "plastic"),
    part([0.27, 0.896, -0.18], [0.14, 0.04, 0.022], "#efe4cb"),
  ];
  for (const x of [-0.63, 0.63])
    for (const z of [-0.35, 0.35])
      parts.push(part([x, 0.35, z], [0.09, 0.7, 0.09], "#805c42", "box", "wood"));
  for (const [x, z, color] of [
    [-1.05, 0, "#538777"],
    [1.05, 0, "#b69551"],
    [0, 0.9, "#608695"],
  ] as const) {
    parts.push(part([x, 0.46, z], [0.45, 0.1, 0.44], color, "bevel", "plastic"));
    for (const dx of [-0.16, 0.16])
      for (const dz of [-0.15, 0.15])
        parts.push(part([x + dx, 0.215, z + dz], [0.055, 0.43, 0.055], color, "box", "plastic"));
  }
  return parts;
}

function neonSign(): AssetPart[] {
  const parts = [part([0, 0, -0.032], [2.18, 0.78, 0.065], "#304244", "bevel", "metal")];
  for (const x of [-0.99, 0.99])
    for (const y of [-0.29, 0.29])
      parts.push(part([x, y, 0.008], [0.042, 0.042, 0.02], "#b4ada1", "sphere", "metal"));
  return parts;
}

function displayFridge(): AssetPart[] {
  const cabinet = "#e3e3d6",
    trim = "#4b5756";
  const parts = [
    part([-0.48, 1.14, 0], [0.12, 2.22, 1.02], cabinet, "bevel", "plastic"),
    part([0, 0.17, 0], [1.08, 0.31, 1.04], cabinet, "bevel", "metal"),
    part([0, 2.13, 0], [1.08, 0.32, 1.04], cabinet, "bevel", "metal"),
    part([0.548, 2.13, 0], [0.025, 0.19, 0.87], "#ce6775", "bevel", "glass"),
    part([0.53, 1.15, 0], [0.021, 1.63, 0.84], "#dbefee", "box", "window"),
    part([0.585, 1.23, 0.4], [0.06, 0.36, 0.055], trim, "bevel", "metal"),
  ];
  for (const z of [-0.48, 0.48]) {
    parts.push(
      part([0, 1.14, z], [1.04, 1.77, 0.07], cabinet, "box", "metal"),
      part([0.535, 1.15, z * 0.93], [0.045, 1.7, 0.04], trim, "box", "rubber"),
    );
  }
  for (const y of [0.105, 0.17, 0.235]) parts.push(part([0.547, y, 0], [0.018, 0.024, 0.71], trim));
  const labels = ["#bd6550", "#61856e", "#cc9d4d"];
  for (const [row, y] of [0.4, 0.93, 1.46].entries()) {
    parts.push(part([0.01, y, 0], [0.91, 0.035, 0.88], "#babdb3", "box", "metal"));
    for (const [col, z] of [-0.26, 0, 0.26].entries()) {
      parts.push(
        part(
          [0.24, y + 0.19, z],
          [0.16, 0.34, 0.16],
          labels[(row + col) % 3]!,
          "cylinder",
          "plastic",
        ),
        part([0.24, y + 0.19, z], [0.165, 0.09, 0.165], "#e9dab8", "cylinder"),
        part([0.24, y + 0.37, z], [0.104, 0.05, 0.104], "#e6dfd0", "cylinder", "plastic"),
      );
    }
  }
  return parts;
}

function fishTank(): AssetPart[] {
  const frame = "#3e4e4b";
  const parts = [
    part([0, 0.45, 0], [0.9, 0.9, 1.88], "#886446", "bevel", "wood"),
    part([-0.44, 0.44, 0], [0.016, 0.72, 0.018], "#594734", "box", "wood"),
    part([0, 0.94, 0], [0.86, 0.1, 1.86], frame, "bevel", "metal"),
    part([0, 1.75, 0], [0.86, 0.1, 1.86], frame, "bevel", "metal"),
    part([0.39, 1.34, 0], [0.025, 0.75, 1.78], "#72a9a7"),
    part([0, 1.01, 0], [0.77, 0.09, 1.77], "#ccb994", "bevel"),
    part([-0.395, 1.34, 0], [0.018, 0.75, 1.78], "#d5eee9", "box", "window"),
  ];
  for (const z of [-0.88, 0.88]) {
    parts.push(
      part([0, 1.34, z], [0.78, 0.75, 0.016], "#c7e5dd", "box", "window"),
      part([-0.39, 1.34, z], [0.028, 0.75, 0.03], frame, "box", "metal"),
    );
  }
  for (const [z, y, color] of [
    [-0.44, 1.42, "#d98448"],
    [0.32, 1.51, "#e4b552"],
    [0.1, 1.28, "#cc755f"],
  ] as const) {
    parts.push(
      part([-0.06, y, z], [0.08, 0.14, 0.27], color, "sphere"),
      part([-0.06, y, z + 0.136], [0.042, 0.11, 0.085], color, "bevel"),
      part([-0.097, y + 0.016, z - 0.064], [0.016, 0.028, 0.028], frame, "sphere"),
    );
  }
  for (const z of [-0.65, 0.63]) {
    parts.push(
      part([0.15, 1.08, z], [0.25, 0.16, 0.31], "#87917c", "sphere"),
      { ...part([0.18, 1.22, z], [0.08, 0.42, 0.12], "#55795e", "sphere"), rz: 0.21 },
      { ...part([0.12, 1.17, z + 0.05], [0.07, 0.29, 0.1], "#75936a", "sphere"), rz: -0.38 },
    );
  }
  return parts;
}

const models: Record<string, (index: number) => AssetPart[]> = {
  poster: shopPoster,
  tanaman: pottedPlant,
  kipas: wallFan,
  "lampu-hias": festoonLights,
  "lampu-gantung": pendantLamp,
  "meja-makan": diningTable,
  "neon-buka": neonSign,
  "kulkas-neon": displayFridge,
  akuarium: fishTank,
};

export function extraInstanceParts(instanceId: string, placement?: DecorPlacement): AssetPart[] {
  const instance = DECOR_DEFAULT_INSTANCES.find((item) => item.id === instanceId);
  if (!instance) return [];
  const target = placement ?? instance.placement;
  const cosine = Math.cos(target.rotation),
    sine = Math.sin(target.rotation);
  const pieces = models[instance.decorId]!(Number(instanceId.split(":")[1]));
  return pieces.map((item) => {
    const [x, y, z] = item.p;
    return {
      ...item,
      p: [target.x + x * cosine + z * sine, target.y + y, target.z - x * sine + z * cosine],
      ry: (item.ry ?? 0) + target.rotation,
    };
  });
}

export function extraParts(
  style: Pick<WarungStyle, "wall" | "extras" | "placements">,
): AssetPart[] {
  const parts: AssetPart[] = [];
  if (style.wall === "wall-bata")
    for (let y = 0.35; y < 3.4; y += 0.35)
      parts.push(part([0, y, -4.84], [11.6, 0.03, 0.02], "#e8d2b8"));
  return parts.concat(
    getDecorInstances(style).flatMap((instance) =>
      extraInstanceParts(instance.id, instance.placement),
    ),
  );
}
