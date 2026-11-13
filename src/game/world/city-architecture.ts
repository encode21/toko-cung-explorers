import type { OutdoorPart } from "./OutdoorBatch";
import type { BuildingLot } from "./outdoor-layout";

export interface ArchitectureSign {
  text: string;
  p: [number, number, number];
  size: number;
  width: number;
  color: string;
}
export interface CityArchitecture {
  masonry: OutdoorPart[];
  trim: OutdoorPart[];
  glazing: OutdoorPart[];
  signs: ArchitectureSign[];
}
const PALETTES = [
  { wall: "#c5c4b9", inset: "#76817b", fascia: "#304d48", metal: "#777e79" },
  { wall: "#c6b4a3", inset: "#a38472", fascia: "#733d31", metal: "#7e817b" },
  { wall: "#c9cdca", inset: "#737d82", fascia: "#334c5b", metal: "#828c8f" },
  { wall: "#b7bdac", inset: "#7d896d", fascia: "#475844", metal: "#778079" },
];
function seedFor(id: string) {
  return [...id].reduce((sum, char, i) => sum + char.charCodeAt(0) * (i + 1), 0);
}

/** Facades use metre-scale details and stay within the validated one-metre lot envelope. */
export function cityArchitecture(lot: BuildingLot): CityArchitecture {
  const out: CityArchitecture = { masonry: [], trim: [], glazing: [], signs: [] };
  const seed = seedFor(lot.id),
    palette = PALETTES[seed % PALETTES.length]!,
    w = lot.width,
    d = lot.depth,
    h = lot.height,
    front = d / 2,
    house = lot.kind === "house",
    floors = house ? (h > 4.5 ? 2 : 1) : h > 8 ? 3 : h > 5 ? 2 : 1,
    floorHeight = h / floors,
    light = "#d9d8ce",
    dark = "#303b3d";
  const box = (
    group: "masonry" | "trim" | "glazing",
    p: OutdoorPart["p"],
    s: OutdoorPart["s"],
    color: string,
    extra: Partial<OutdoorPart> = {},
  ) => out[group].push({ p, s, color, ...extra });
  // Keep the plinth inside the lot. A narrow doorstep joins the pedestrian verge.
  box("masonry", [0, h / 2, 0], [w, h, d], palette.wall);
  box("masonry", [0, 0.16, 0], [w + 0.22, 0.32, d + 0.22], "#858c88");
  box("masonry", [0, 0.07, front + 0.48], [w + 0.16, 0.14, 0.84], "#b5b8ae");
  box("trim", [-w / 2 + 0.14, h / 2, front + 0.11], [0.28, h, 0.24], light);
  box("trim", [w / 2 - 0.14, h / 2, front + 0.11], [0.28, h, 0.24], light);
  const bays = Math.max(2, Math.floor(w / 3.25)),
    bayWidth = (w - 0.65) / bays;
  const window = (x: number, y: number, width: number, height: number, z = front + 0.05) => {
    box("trim", [x, y, z], [width + 0.15, height + 0.15, 0.11], "#485251");
    box("glazing", [x, y, z + 0.065], [width, height, 0.025], "#283e47");
    box("trim", [x, y, z + 0.09], [0.04, height, 0.035], "#9da6a0");
    box("trim", [x, y + height * 0.15, z + 0.09], [width, 0.035, 0.035], "#9da6a0");
    box("masonry", [x, y - height / 2 - 0.075, z + 0.12], [width + 0.25, 0.12, 0.3], light);
  };
  if (house) {
    const doorX = w * 0.24;
    box("trim", [doorX, 1.27, front + 0.06], [1.02, 2.3, 0.12], "#6b6254");
    box("trim", [doorX, 1.31, front + 0.13], [0.82, 2.04, 0.035], "#9d9787");
    box("trim", [doorX - 0.31, 1.16, front + 0.17], [0.055, 0.2, 0.05], "#c6c4ae");
    window(-w * 0.2, 1.6, Math.min(2.3, w * 0.34), 1.18);
    if (floors === 2) {
      window(-w * 0.23, floorHeight + 1.45, 1.7, 1.4);
      window(w * 0.23, floorHeight + 1.45, 1.7, 1.4);
      box("masonry", [0, floorHeight, front + 0.25], [w + 0.2, 0.24, 0.55], light);
    }
    // Sheet-metal gable roof: two pitched planes, individual standing seams and ridge cap.
    const rise = 0.9,
      run = d / 2 + 0.3,
      slope = Math.atan2(rise, run),
      roofLength = Math.hypot(run, rise),
      roofColor = seed % 2 ? "#8c9695" : "#9b9d92";
    for (const side of [-1, 1]) {
      box("trim", [0, h + rise / 2, (side * run) / 2], [w + 0.58, 0.07, roofLength], roofColor, {
        rx: side * slope,
      });
      for (let x = -w / 2 - 0.18; x < w / 2 + 0.2; x += 0.34)
        box(
          "trim",
          [x, h + rise / 2 + 0.04, (side * run) / 2],
          [0.035, 0.045, roofLength],
          "#b2b8b1",
          { rx: side * slope },
        );
    }
    box("trim", [0, h + rise + 0.045, 0], [w + 0.64, 0.09, 0.17], "#737f7e");
    // Low garden fence leaves the entrance gap clear. The shallow front strip is decorative.
    for (const [x, span] of [
      [-w * 0.2, w * 0.53],
      [w * 0.435, w * 0.12],
    ] as const) {
      box("masonry", [x, 0.29, front + 0.84], [span, 0.42, 0.16], palette.inset);
      for (const y of [0.61, 1.11]) box("trim", [x, y, front + 0.84], [span, 0.045, 0.045], dark);
      for (let a = -span / 2; a <= span / 2; a += 0.24)
        box("trim", [x + a, 0.85, front + 0.84], [0.035, 0.65, 0.035], dark);
    }
  } else {
    for (let i = 0; i < bays; i++) {
      const x = -w / 2 + 0.325 + bayWidth * (i + 0.5),
        opening = bayWidth - 0.25,
        shopHeight = Math.min(2.28, floorHeight - 0.8),
        openShop = (i + seed) % 3 === 0;
      box("trim", [x, shopHeight / 2 + 0.18, front + 0.035], [opening, shopHeight, 0.06], dark);
      if (openShop) {
        // Display glazing and a low shop counter distinguish open businesses from shutters.
        box(
          "glazing",
          [x, shopHeight / 2 + 0.2, front + 0.085],
          [opening - 0.15, shopHeight - 0.1, 0.03],
          "#395558",
        );
        for (const side of [-1, 1])
          box(
            "trim",
            [x + side * opening * 0.29, shopHeight / 2 + 0.2, front + 0.12],
            [0.045, shopHeight - 0.1, 0.04],
            "#c0c5bd",
          );
        box("masonry", [x, 0.51, front + 0.14], [opening - 0.08, 0.7, 0.2], palette.inset);
        box("trim", [x, 0.9, front + 0.24], [opening + 0.1, 0.08, 0.4], "#b2a88f");
      } else {
        box(
          "trim",
          [x, shopHeight / 2 + 0.17, front + 0.09],
          [opening - 0.08, shopHeight, 0.07],
          palette.metal,
        );
        for (let y = 0.26; y < shopHeight + 0.12; y += 0.115)
          box("trim", [x, y, front + 0.136], [opening - 0.1, 0.018, 0.018], "#626e6c");
        box("trim", [x, 0.44, front + 0.16], [0.35, 0.07, 0.05], "#333e3d");
      }
      box(
        "trim",
        [x - bayWidth / 2 + 0.05, floorHeight / 2, front + 0.13],
        [0.15, floorHeight, 0.26],
        light,
      );
      for (let floor = 1; floor < floors; floor++) {
        const base = floor * floorHeight;
        box(
          "masonry",
          [x, base + floorHeight / 2, front + 0.035],
          [bayWidth - 0.2, floorHeight - 0.3, 0.08],
          palette.inset,
        );
        window(
          x - bayWidth * 0.12,
          base + floorHeight * 0.54,
          Math.min(1.65, bayWidth * 0.52),
          Math.min(1.6, floorHeight * 0.53),
          front + 0.1,
        );
        box(
          "trim",
          [x + bayWidth * 0.29, base + 1.08, front + 0.15],
          [0.65, 1.95, 0.08],
          "#695b4d",
        );
        box(
          "trim",
          [x + bayWidth * 0.29, base + 1.18, front + 0.2],
          [0.49, 1.64, 0.035],
          "#887866",
        );
      }
    }
    const fasciaY = Math.min(floorHeight - 0.49, 2.65);
    box("trim", [0, fasciaY, front + 0.22], [w - 0.45, 0.53, 0.16], palette.fascia);
    out.signs.push({
      text: lot.label.toUpperCase(),
      p: [0, fasciaY, front + 0.31],
      size: 0.23,
      width: w - 1,
      color: "#f3ecda",
    });
    box("masonry", [0, floorHeight - 0.12, front + 0.36], [w + 0.28, 0.22, 0.78], light);
    for (let floor = 1; floor < floors; floor++) {
      const base = floor * floorHeight;
      box("masonry", [0, base + 0.04, front + 0.42], [w + 0.18, 0.19, 0.84], light);
      if (seed % 3 === 0) {
        box("masonry", [0, base + 0.55, front + 0.77], [w - 0.24, 0.82, 0.14], "#aeb8af");
        box("trim", [0, base + 1.01, front + 0.77], [w, 0.09, 0.22], light);
      } else {
        for (const y of [base + 0.32, base + 0.94])
          box("trim", [0, y, front + 0.77], [w - 0.25, 0.06, 0.06], dark);
        for (let x = -w / 2 + 0.22; x < w / 2 - 0.15; x += 0.42)
          box("trim", [x, base + 0.6, front + 0.77], [0.035, 0.68, 0.035], dark);
      }
    }
    box("masonry", [0, h + 0.1, 0], [w + 0.25, 0.24, d + 0.25], light);
    box("masonry", [0, h + 0.38, front - 0.08], [w, 0.55, 0.18], palette.wall);
    // Roof tank and external AC bring occupied-town detail without new gameplay obstacles.
    box("trim", [w * 0.29, h + 0.48, -d * 0.2], [1.1, 0.7, 1.05], "#8a9391");
    box("trim", [-w * 0.34, Math.min(3.9, h - 0.8), front + 0.31], [0.82, 0.52, 0.4], "#c2c6b9");
    for (let y = -0.16; y <= 0.16; y += 0.08)
      box(
        "trim",
        [-w * 0.34, Math.min(3.9, h - 0.8) + y, front + 0.52],
        [0.64, 0.025, 0.015],
        "#7f8981",
      );
  }
  // Rainwater pipe, side elevation windows and unevenly faded wall courses.
  box("trim", [w / 2 + 0.065, h / 2, front - 0.18], [0.07, h, 0.07], "#687774");
  for (const side of [-1, 1]) {
    for (let floor = 0; floor < floors; floor++) {
      const y = floor * floorHeight + Math.min(1.6, floorHeight * 0.55);
      box(
        "trim",
        [side * (w / 2 + 0.025), y, -d * 0.2],
        [0.06, 1.17, Math.min(d * 0.4, 2)],
        "#485251",
      );
      box(
        "glazing",
        [side * (w / 2 + 0.061), y, -d * 0.2],
        [0.025, 1.02, Math.min(d * 0.4, 2) - 0.14],
        "#30474c",
      );
    }
  }
  return out;
}
