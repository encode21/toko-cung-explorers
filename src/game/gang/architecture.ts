import { cityArchitecture, type CityArchitecture } from "@/game/world/city-architecture";
import type { OutdoorPart } from "@/game/world/OutdoorBatch";
import type { GangHouse } from "./model";

/** Reuse the city's plaster, framed windows, pitched roofs and instanced material batches. */
export function gangArchitecture(h: GangHouse): CityArchitecture {
  const level = h.warung?.lot === null ? h.warung.level : 0;
  const height = level === 3 ? 6.2 : level === 5 ? 5 : 3.4;
  const width = level === 5 ? 14 : 10;
  const depth = level === 5 ? 11 : 9;
  const front = depth / 2;
  const out = cityArchitecture({
    id: `gang-house-${h.number}`,
    kind: level === 5 ? "workshop" : "house",
    label: "",
    x: 0,
    z: 0,
    width,
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
  for (const group of [out.masonry, out.trim, out.glazing]) for (const p of group) p.p[2] -= 2;
  out.signs = [];
  const add = (
    group: "masonry" | "trim" | "glazing",
    p: OutdoorPart["p"],
    s: OutdoorPart["s"],
    color: string,
    extra: Partial<OutdoorPart> = {},
  ) => out[group].push({ p, s, color, ...extra });
  add("masonry", [0, 0.04, 4.8], [width + 0.4, 0.08, 5.5], "#b5b8ae");
  // A shaded teras with a glass cabinet, then larger stocked racks at Kelontong.
  if (level < 5) {
    add("trim", [0, 3.05, 5.1], [width + 0.5, 0.09, 5.4], h.style.roof.color, { rx: 0.06 });
    for (let x = -width / 2; x <= width / 2; x += 0.35)
      add("trim", [x, 3.1, 5.1], [0.035, 0.04, 5.4], "#b8afa0", { rx: 0.06 });
    for (const x of [-width / 2 + 0.2, width / 2 - 0.2])
      add("trim", [x, 1.48, 7.4], [0.16, 2.96, 0.16], "#76614a");
  }
  if (h.ownerId && h.warung?.lot == null && level < 4) {
    add("trim", [-2.3, 0.48, 5.2], [3.8, 0.96, 1.25], "#8b7455");
    add("glazing", [-2.3, 1.22, 5.2], [3.7, 0.5, 1.2], h.warung ? "#98b1ae" : "#b7ae97"); // berdebu
    for (const x of [-4.14, -0.46]) add("trim", [x, 1.22, 5.2], [0.055, 0.58, 1.3], "#65736b");
    add("trim", [-2.3, 1.51, 5.2], [3.85, 0.055, 1.3], "#65736b");
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
    for (const x of [-3.7, 3.7])
      for (const y of [0.55, 1.55]) {
        add("trim", [x, y, 5.3], [2.1, 0.95, 1.6], "#ad946b");
        add("trim", [x, y, 6.12], [0.1, 0.95, 0.04], "#79654b");
      }
    if (level === 5) {
      add("masonry", [0, 0.3, 5.8], [8, 0.6, 3.5], "#949b94");
      for (let x = -3; x <= 3; x += 0.5) add("trim", [x, 0.64, 5.8], [0.35, 0.09, 2.7], "#8a7354");
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
  if (h.inactive && h.warung?.lot === null) {
    for (let y = 0.15; y < 2.8; y += 0.14)
      add("trim", [0, y, 7.42], [width - 0.6, 0.12, 0.08], y % 0.28 < 0.14 ? "#7b827d" : "#929891");
  }
  add("trim", [0, 3.43, 7.42], [width, 0.72, 0.15], "#344d43");
  return out;
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
