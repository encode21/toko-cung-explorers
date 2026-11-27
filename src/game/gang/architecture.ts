import { cityArchitecture, type CityArchitecture } from "@/game/world/city-architecture";
import type { OutdoorPart } from "@/game/world/OutdoorBatch";
import type { GangHouse } from "./model";
import {
  warungBuildingHeight,
  warungFacadePanels,
  warungEnvelope,
  WARUNG_DOOR,
  WARUNG_SIGN,
} from "@/game/warung/storefront";

/** Fit the kampung house onto a smaller plot (city kavling): body size, and how deep the teras may reach. */
export type HouseFit = { width: number; depth: number; teras: number };

/**
 * Reuse the city's plaster, framed windows, pitched roofs and instanced material batches.
 * With `fit` the same house and per-level warung kit is squeezed onto a city lot: the body takes the lot size,
 * teras parts keep their layout but are scaled to `fit.teras` of their depth and to the body width.
 */
export function gangArchitecture(h: GangHouse, fit?: HouseFit): CityArchitecture {
  const level = h.warung?.lot === null ? h.warung.level : 0;
  const gangWarung = !!h.ownerId && h.warung?.lot === null;
  const height = warungBuildingHeight(level);
  // Kit coordinates below are authored for the kampung plot; `fit` maps them onto the lot.
  const width = level === 5 ? 14 : 10;
  const depth = fit?.depth ?? (level === 5 ? 11 : 9);
  const bodyWidth = fit ? Math.min(fit.width, width) : width;
  const shift = fit ? 0.3 : 2;
  const front = depth / 2;
  const out = cityArchitecture({
    id: `gang-house-${h.number}`,
    kind: level === 5 ? "workshop" : "house",
    label: "",
    x: 0,
    z: 0,
    width: bodyWidth,
    depth,
    height,
    rotation: 0,
    color: h.style.paint.color,
  });
  const wall = out.masonry[0]!.color;
  for (const group of [out.masonry, out.trim, out.glazing])
    for (const p of group) {
      if (p.color === wall) p.color = h.style.paint.color;
      if (p.p[1] > height + 0.1) p.color = h.style.roof.color;
    }
  // The city's fixed front fence is replaced by the player's chosen yard fence.
  for (const key of ["masonry", "trim"] as const)
    out[key] = out[key].filter((p) => !(p.p[2] > front + 0.6 && p.p[1] < 1.5));
  for (const group of [out.masonry, out.trim, out.glazing]) for (const p of group) p.p[2] -= shift;
  out.signs = [];
  // Kampung house front is z = 2.5; a fitted house maps teras offsets from its own front.
  const sx = bodyWidth / width,
    t = fit?.teras ?? 1,
    bodyFront = front - shift;
  const add = (
    group: "masonry" | "trim" | "glazing",
    p: OutdoorPart["p"],
    s: OutdoorPart["s"],
    color: string,
    extra: Partial<OutdoorPart> = {},
  ) => {
    if (!fit) return void out[group].push({ p, s, color, ...extra });
    if (p[2] < 0) return; // the back annex only fits the kampung plot
    out[group].push({
      p: [p[0] * sx, p[1], bodyFront + (p[2] - 2.5) * t],
      s: [s[0] > 1.5 ? s[0] * sx : s[0], s[1], s[2] > 1.5 ? s[2] * t : s[2]],
      color,
      ...extra,
    });
  };
  add("masonry", [0, 0.04, 4.8], [width + 0.4, 0.08, 5.5], "#b5b8ae");
  // A shaded teras with a glass cabinet, then larger stocked racks at Kelontong.
  if (level < 5 && !gangWarung) {
    add("trim", [0, 3.05, 5.1], [width + 0.5, 0.09, 5.4], h.style.roof.color, { rx: 0.06 });
    for (let x = -width / 2; x <= width / 2; x += 0.35)
      add("trim", [x, 3.1, 5.1], [0.035, 0.04, 5.4], "#b8afa0", { rx: 0.06 });
    for (const x of [-width / 2 + 0.2, width / 2 - 0.2])
      add("trim", [x, 1.48, 7.4], [0.16, 2.96, 0.16], "#76614a");
  }
  if (gangWarung) warungStorefront(out, bodyWidth, h.style.paint.color, level, fit);
  // Kelontong: wooden lattice fascia over the teras and cartons stacked by the door.
  if (gangWarung && level === 2) {
    add("trim", [0, 2.7, 7.1], [width - 0.6, 0.5, 0.12], "#d9c08e");
    for (let x = -width / 2 + 0.7; x < width / 2 - 0.5; x += 0.9)
      add("trim", [x, 2.7, 7.17], [0.06, 0.42, 0.04], "#a8875a");
    for (const [x, y, z] of [
      [-4.2, 0.25, 6.3],
      [-4.2, 0.75, 6.3],
      [-3.55, 0.25, 6.3],
      [-3.55, 0.75, 6.3],
      [-4.2, 0.25, 5.65],
      [-3.55, 0.25, 5.65],
    ] as const)
      add("trim", [x, y, z], [0.6, 0.48, 0.6], "#58bfd8");
    rencengan(add, -width / 2 + 0.8, -1.5, 5.8, 2.8, h.number);
  }
  if (gangWarung && level >= 3) rencengan(add, -width / 2 + 0.8, -1.5, 5.8, 2.85, h.number);
  if (h.ownerId && h.warung?.lot == null && level < 4 && level !== 1) {
    add("trim", [-2.55, 0.48, 4.3], [3.8, 0.96, 1.25], "#8b7455");
    add("glazing", [-2.55, 1.22, 4.3], [3.7, 0.5, 1.2], h.warung ? "#98b1ae" : "#b7ae97"); // berdebu
    for (const x of [-4.39, -0.71]) add("trim", [x, 1.22, 4.3], [0.055, 0.58, 1.3], "#65736b");
    add("trim", [-2.55, 1.51, 4.3], [3.85, 0.055, 1.3], "#65736b");
    for (let n = 0; n < (level >= 2 ? 3 : 1); n++)
      for (const y of [0.5, 1, 1.5]) {
        add("trim", [1.1 + n * 1.3, y, 3.3], [1.2, 0.08, 0.85], "#806f55");
        for (let i = 0; i < 3; i++)
          add(
            "trim",
            [0.75 + n * 1.3 + i * 0.35, y + 0.2, 3.3],
            [0.27, 0.32, 0.6],
            ["#a96a4f", "#97a37c", "#b8a277"][i]!,
          );
      }
  }
  if (level === 4) {
    add("masonry", [0, 2.5, -9], [width + 1, 5, 5], "#b2b8ad");
    add("trim", [0, 5.1, -9], [width + 1.5, 0.18, 5.4], h.style.roof.color);
  }
  if (level >= 4) {
    for (const x of [-4.15, 4.15])
      for (const y of [0.55, 1.55]) {
        add("trim", [x, y, 5.3], [1.0, 0.95, 1.6], "#ad946b");
        add("trim", [x, y, 6.12], [0.1, 0.95, 0.04], "#79654b");
      }
  }
  if (h.style.fence.id !== "none")
    for (const x of [-width / 2 - 0.45, width / 2 + 0.45]) {
      for (const y of [0.45, 1.1]) add("trim", [x, y, 5], [0.09, 0.09, 5], h.style.fence.color);
      for (let z = 2.6; z <= 7.5; z += 0.38)
        add("trim", [x, 0.75, z], [0.07, 1.35, 0.08], h.style.fence.color);
    }
  if (h.style.plants.id !== "none")
    for (const x of [-4.4, 4.4]) add("trim", [x, 0.3, 6.7], [0.7, 0.6, 0.7], "#a77f65");
  if (h.style.lamp.id !== "none")
    add("glazing", [0, 2.7, 2.8], [0.3, 0.4, 0.3], h.style.lamp.color);
  if (!gangWarung) add("trim", [0, 3.53, 7.42], [width, 1.15, 0.15], "#243d32");
  return out;
}

type Add = (
  group: "masonry" | "trim" | "glazing",
  p: OutdoorPart["p"],
  s: OutdoorPart["s"],
  color: string,
  extra?: Partial<OutdoorPart>,
) => void;
const SACHET = [
  "#f2c230",
  "#d8362f",
  "#2f9e57",
  "#2f6fc4",
  "#f08a24",
  "#e45d9a",
  "#7a4bb5",
  "#f4ede0",
];
/** Rencengan: strips of sachets hanging from a rail (kopi, sampo, deterjen). */
function rencengan(add: Add, x0: number, x1: number, z: number, top: number, seed: number) {
  add("trim", [(x0 + x1) / 2, top + 0.04, z], [x1 - x0, 0.03, 0.03], "#6b6b6b");
  let i = seed * 7;
  for (let x = x0; x <= x1; x += 0.17, i++) {
    if (i % 5 === 4) continue; // gaps so the shop behind stays readable
    const color = SACHET[i % SACHET.length]!,
      alt = SACHET[(i + 3) % SACHET.length]!,
      n = 2 + (i % 3);
    for (let k = 0; k < n; k++)
      add("trim", [x, top - 0.1 - k * 0.15, z], [0.13, 0.13, 0.02], k % 2 ? alt : color);
  }
}
/** One enclosed shopfront joins the house, with one clear shared entry down the centre. */
function warungStorefront(
  out: CityArchitecture,
  width: number,
  paint: string,
  level: number,
  fit?: HouseFit,
) {
  const envelope = warungEnvelope(width, level, fit);
  const { front, back, half, slope } = envelope;
  const t = fit?.teras ?? 1;
  const doorHalf = WARUNG_DOOR.width / 2;
  const cream = "#f5e7cb",
    wood = "#a5825b",
    green = "#416750";
  const box: Add = (group, p, s, color, extra = {}) => out[group].push({ p, s, color, ...extra });

  // Full-height pilasters, timber siding and two shaded display windows flank the doors.
  for (const { x, width: span } of warungFacadePanels(width)) {
    box("masonry", [x, 1.85, front - 0.07], [span, 3.7, 0.16], paint);
    box("trim", [x, 0.48, front + 0.05], [span, 0.8, 0.12], wood);
    box("glazing", [x, 2.05, front + 0.06], [span - 0.32, 2.12, 0.04], "#586f73");
    for (const y of [0.97, 3.13])
      box("trim", [x, y, front + 0.12], [span - 0.18, 0.09, 0.12], cream);
    box("trim", [x, 2.05, front + 0.12], [0.065, 2.1, 0.1], cream);
  }
  for (const side of [-1, 1]) {
    for (const edge of [doorHalf + 0.12, half]) {
      box("trim", [side * edge, 1.89, front + 0.04], [0.2, 3.78, 0.26], cream);
      box("trim", [side * edge, 0.24, front + 0.1], [0.28, 0.48, 0.32], "#bda383");
    }
    // Stocked wooden display crates add the warung silhouette without narrowing its entrance.
    const crateWidth = 1.3;
    const crateX = side * Math.min(half - 0.8, 2.65);
    const crateZ = front + 0.64 * t;
    box("trim", [crateX, 0.3, crateZ], [crateWidth, 0.52, Math.max(0.5, 0.72 * t)], "#c7a275");
    for (const y of [0.13, 0.33, 0.53])
      box(
        "trim",
        [crateX, y, crateZ + Math.max(0.25, 0.36 * t)],
        [crateWidth + 0.04, 0.11, 0.065],
        "#e0bd89",
      );
    for (let i = 0; i < 4; i++)
      box(
        "trim",
        [crateX - 0.45 + i * 0.3, 0.7, crateZ],
        [0.23, 0.36, 0.3],
        side < 0 ? "#f3cc63" : "#80a16d",
      );
  }
  box("trim", [0, 3.42, front], [WARUNG_DOOR.width + 0.1, 0.3, 0.2], wood);
  box("trim", [0, 0.04, front], [WARUNG_DOOR.width + 0.25, 0.08, 0.55], "#d9c9ad");

  // The porch is an enclosed extension. Side walls overlap the house instead of leaving an alley.
  const wallDepth = front - back + 0.12;
  const wallZ = (front + back) / 2;
  const roofAt = (z: number) => envelope.backY - (z - envelope.roofBack) * Math.tan(slope);
  for (const side of [-1, 1]) {
    box("masonry", [side * half, 1.89, wallZ], [0.24, 3.78, wallDepth], paint);
    box("trim", [side * half, 0.22, wallZ], [0.28, 0.44, wallDepth], "#bda383");
    // A deep sloped cap overlaps the wall and reaches the underside of the canopy without gaps.
    box(
      "masonry",
      [side * half, roofAt(wallZ) - 0.43, wallZ],
      [0.24, 0.8, wallDepth / Math.cos(slope)],
      paint,
      { rx: slope },
    );
    box(
      "trim",
      [side * half, roofAt(wallZ) - 0.12, wallZ],
      [0.3, 0.18, wallDepth / Math.cos(slope)],
      cream,
      { rx: slope },
    );
  }
  box("trim", [0, 3.69, front - 0.04], [half * 2, 0.42, 0.2], cream);
  box("trim", [0, envelope.backY - 0.12, back + 0.1], [width + 0.1, 0.24, 0.24], cream);

  // Continuous fabric canopy runs from the house wall all the way to the scalloped street edge.
  const canopyWidth = width + 0.3;
  const stripeCount = 12;
  for (let i = 0; i < stripeCount; i++) {
    const x = -canopyWidth / 2 + (canopyWidth / stripeCount) * (i + 0.5);
    const stripe = canopyWidth / stripeCount;
    const color = i % 2 ? "#c5a580" : "#fff2d7";
    box(
      "trim",
      [x, envelope.roofY, envelope.roofZ],
      [stripe + 0.01, 0.075, envelope.roofLength],
      color,
      { rx: slope },
    );
    box("trim", [x, 3.58, envelope.roofEdge], [stripe + 0.01, 0.33, 0.075], color);
    box("trim", [x, 3.4, envelope.roofEdge], [stripe * 0.74, 0.1, 0.075], color);
  }

  // Raise the name board above the awning rather than covering the doorway.
  const boardZ = fit ? fit.depth / 2 - 0.3 + (WARUNG_SIGN.front - 2.5) * t : WARUNG_SIGN.front;
  const boardWidth = Math.min(width - 0.4, 8.5);
  for (const x of [-boardWidth * 0.32, boardWidth * 0.32])
    box("trim", [x, 4.12, boardZ - 0.16], [0.12, 1.12, 0.14], green);
  box("trim", [0, WARUNG_SIGN.centerY, boardZ], [boardWidth, 1.12, 0.19], cream);
  box("trim", [0, WARUNG_SIGN.centerY, boardZ + 0.11], [boardWidth - 0.16, 0.96, 0.045], green);
  box("trim", [0, WARUNG_SIGN.centerY, boardZ + 0.14], [boardWidth - 0.25, 0.87, 0.03], "#f5e7cb");
}
export function gateParts(height = 7.6): OutdoorPart[] {
  const out: OutdoorPart[] = [];
  for (const x of [-4.9, 4.9]) {
    out.push(
      { p: [x, height / 2, 0], s: [0.8, height, 0.9], color: "#c1bdac" },
      { p: [x, 0.5, 0], s: [1.15, 1, 1.2], color: "#747d72" },
      { p: [x, height + 0.15, 0], s: [1.2, 0.3, 1.25], color: "#9f8170" },
    );
  }
  out.push(
    { p: [0, height - 0.6, 0], s: [9.2, 1.2, 0.6], color: "#344f43" },
    { p: [0, height + 0.08, 0], s: [11.3, 0.22, 1.3], color: "#93755d" },
    { p: [0, height + 0.36, 0], s: [9.8, 0.34, 0.8], color: "#b1a085" },
  );
  return out;
}
