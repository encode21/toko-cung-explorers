import type { OutdoorPart } from "../world/OutdoorBatch";
import { platformThickness, type ObbyPlatform } from "./model.ts";
type V = [number, number, number];
export const SITE = {
  steel: "#657983",
  concrete: "#d6d5c5",
  gold: "#f4ba45",
  wood: "#b8804d",
  red: "#b75542",
  teal: "#488f86",
  ink: "#344b55",
};
export const sitePart = (p: V, s: V, color: string): OutdoorPart => ({ p, s, color });
/** Instanced unit boxes also form diagonal braces; keep all rotation in the geometry plan. */
export function siteBeam(a: V, b: V, width: number, color: string): OutdoorPart {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2],
    length = Math.hypot(dx, dy, dz);
  return {
    p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    s: [width, length, width],
    color,
    rx: Math.acos(dy / length),
    ry: Math.atan2(dx, dz),
  };
}

function container(
  x: number,
  bottom: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
): OutdoorPart[] {
  return [
    sitePart([x, bottom + h / 2, z], [w, h, d], color),
    ...[-1, 1].flatMap((side) => [
      ...Array.from({ length: Math.floor(w / 0.4) }, (_, i) =>
        sitePart(
          [x - w / 2 + 0.2 + i * 0.4, bottom + h / 2, z + side * (d / 2 + 0.025)],
          [0.055, h - 0.12, 0.055],
          color,
        ),
      ),
      ...[bottom + 0.08, bottom + h - 0.08].map((y) =>
        sitePart([x, y, z + side * (d / 2 + 0.045)], [w, 0.09, 0.08], SITE.ink),
      ),
      ...[-0.28, 0.28].map((offset) =>
        sitePart(
          [x + side * (w / 2 + 0.03), bottom + h / 2, z + offset * d],
          [0.07, h - 0.22, 0.055],
          "#c5d2cf",
        ),
      ),
    ]),
  ];
}

/** Route surfaces are construction objects, sharing the exact physics footprint. */
export function constructionPlatform(p: ObbyPlatform, index: number, local = false): OutdoorPart[] {
  const x = local ? 0 : p.x,
    z = local ? 0 : p.z,
    top = local ? 0.16 : p.top;
  const parts: OutdoorPart[] = [];
  const isCargo =
    p.surface === "container" ||
    p.id === "step3" ||
    (p.kind === "checkpoint" && p.id === "checkpoint2");
  const isCrate = p.kind === "step" && !isCargo;
  if (isCargo) {
    const height = platformThickness(p);
    parts.push(
      ...container(x, top - height, z, p.width, height, p.depth, index % 3 ? SITE.teal : SITE.red),
    );
    if (top > height && p.top < 6) {
      for (const side of [-1, 1])
        for (const end of [-1, 1])
          parts.push(
            sitePart(
              [x + side * (p.width / 2 - 0.14), (top - height) / 2, z + end * (p.depth / 2 - 0.14)],
              [0.18, top - height, 0.18],
              SITE.steel,
            ),
          );
      parts.push(sitePart([x, top - height - 0.04, z], [p.width, 0.08, p.depth], SITE.steel));
    }
  } else if (isCrate) {
    const height = platformThickness(p);
    const bottom = top - height;
    parts.push(sitePart([x, bottom + height / 2, z], [p.width, height, p.depth], SITE.wood));
    for (const side of [-1, 1]) {
      for (const y of [bottom + 0.08, top - 0.08])
        parts.push(
          sitePart([x, y, z + side * (p.depth / 2 + 0.015)], [p.width, 0.1, 0.04], "#e0b37a"),
        );
      for (const xx of [x - p.width / 2 + 0.08, x + p.width / 2 - 0.08])
        parts.push(
          sitePart(
            [xx, bottom + height / 2, z + side * (p.depth / 2 + 0.025)],
            [0.1, height, 0.045],
            "#e0b37a",
          ),
        );
      parts.push(
        siteBeam(
          [x - p.width / 2 + 0.1, bottom + 0.12, z + side * (p.depth / 2 + 0.035)],
          [x + p.width / 2 - 0.1, top - 0.12, z + side * (p.depth / 2 + 0.035)],
          0.075,
          "#e0b37a",
        ),
      );
    }
  } else if (p.kind === "bridge") {
    parts.push(sitePart([x, top - 0.16, z], [p.width, 0.32, 0.12], SITE.steel));
    parts.push(
      sitePart([x, top - 0.04, z], [p.width, 0.08, p.depth], SITE.ink),
      sitePart([x, top - 0.28, z], [p.width, 0.08, p.depth], SITE.steel),
    );
  } else {
    parts.push(
      sitePart(
        [x, top - 0.16, z],
        [p.width, 0.32, p.depth],
        p.kind === "moving" ? SITE.wood : SITE.concrete,
      ),
    );
    for (let i = 0; i < Math.floor(p.width / 0.35); i++)
      parts.push(
        sitePart(
          [x - p.width / 2 + 0.17 + i * 0.35, top + 0.006, z],
          [0.025, 0.012, p.depth - 0.1],
          p.kind === "moving" ? "#79584d" : "#b5b8b0",
        ),
      );
  }
  // High-contrast edge tape and readable numbered route; this remains the landing footprint.
  for (const side of [-1, 1]) {
    parts.push(
      sitePart(
        [x, top + 0.014, z + side * (p.depth / 2 - 0.12)],
        [p.width - 0.12, 0.025, 0.15],
        SITE.gold,
      ),
    );
    for (let i = 0; i < Math.floor(p.width / 0.45); i++)
      parts.push(
        sitePart(
          [x - p.width / 2 + 0.23 + i * 0.45, top + 0.03, z + side * (p.depth / 2 - 0.12)],
          [0.2, 0.012, 0.15],
          SITE.ink,
        ),
      );
  }
  if (p.kind === "moving") {
    // Short sling lines travel with the load beneath a fixed gantry, outside the landing centre.
    for (const side of [-1, 1])
      parts.push(
        siteBeam(
          [side * (p.width / 2 - 0.08), top, -p.depth / 2 + 0.08],
          [side * (p.width / 2 - 0.08), top + 4.65, -p.depth / 2 + 0.08],
          0.025,
          SITE.ink,
        ),
      );
  }
  if (!local && p.top > 0.3 && p.top < 6 && !isCrate && !isCargo && p.kind !== "bridge") {
    for (const side of [-1, 1])
      for (const end of [-1, 1])
        parts.push(
          sitePart(
            [x + side * (p.width / 2 - 0.14), (top - 0.32) / 2, z + end * (p.depth / 2 - 0.14)],
            [0.14, top - 0.32, 0.14],
            SITE.steel,
          ),
        );
  }
  if (!local && p.top > 6) {
    const bottom = top - platformThickness(p);
    const inwardZ = p.z < -26 ? 2.6 : p.z > -20 ? -2.6 : 0;
    const inwardX = inwardZ ? 0 : p.x < 35 ? 2.6 : -2.6;
    // Edge brackets leave the centre camera sightline open when looking beneath the next circuit.
    for (const side of [-1, 1]) {
      const bx = x + (inwardZ ? side * (p.width / 2 - 0.2) : 0);
      const bz = z + (inwardX ? side * (p.depth / 2 - 0.2) : 0);
      parts.push(
        siteBeam(
          [bx, bottom - 0.12, bz],
          [bx + inwardX, bottom - 1.2, bz + inwardZ],
          0.18,
          SITE.steel,
        ),
      );
    }
    parts.push(sitePart([x, bottom - 0.1, z], [p.width, 0.2, p.depth], SITE.steel));
  }
  return parts;
}

/** Solid central building sections are safety catch surfaces, not ordered obby steps. */
export const SITE_SOLIDS: OutdoorPart[] = [
  ...[34.7, 40.5, 46.3].flatMap((x) =>
    [-25, -19.3].map((z) => sitePart([x, 2.4, z], [0.24, 4.8, 0.24], SITE.concrete)),
  ),
  sitePart([40.5, 1.85, -22.15], [11.8, 0.24, 5.9], SITE.concrete),
  // A partial second storey keeps the silhouette open, with exposed frame on the other half.
  sitePart([43.4, 4.65, -22.15], [5.8, 0.24, 5.9], SITE.concrete),
  sitePart([49.8, 3.3, -24.85], [2.6, 0.3, 6.5], SITE.steel),
  sitePart([41, 16.4, -22], [1.15, 32.8, 1.15], SITE.gold),
  sitePart([38, 6.4, -22.15], [5.2, 2.3, 2.65], SITE.red),
];
// Crane's open lattice is visible; its collision remains a simple tower volume.
export const SITE_PARTS: OutdoorPart[] = [
  ...SITE_SOLIDS.filter(
    (p) => !(p.p[0] === 41 && p.s[1] === 32.8) && !(p.p[0] === 38 && p.s[1] === 2.3),
  ),
  ...container(38, 5.25, -22.15, 5.2, 2.3, 2.65, SITE.red),
];
// Exposed girders at each storey, plus narrow scaffold rails on the central building.
for (const y of [2, 4.8]) {
  for (const z of [-25, -19.3])
    SITE_PARTS.push(sitePart([40.5, y, z], [12.1, 0.22, 0.22], SITE.concrete));
  for (const x of [34.7, 40.5, 46.3])
    SITE_PARTS.push(sitePart([x, y, -22.15], [0.22, 0.22, 5.9], SITE.concrete));
}
for (const x of [34.7, 46.3]) {
  SITE_PARTS.push(siteBeam([x, 0.2, -25], [x, 1.7, -19.3], 0.09, SITE.steel));
  SITE_PARTS.push(siteBeam([x, 1.7, -25], [x, 0.2, -19.3], 0.09, SITE.steel));
}
// Slim scaffold legs beneath the elevated crates on the east side.
for (const z of [-27.5, -24.5, -22])
  for (const x of [48.6, 51])
    SITE_PARTS.push(sitePart([x, 1.65, z], [0.12, 3.3, 0.12], SITE.steel));
// Open tower and triangular truss jib. Everything stays in the site's horizontal bounds.
for (const x of [40.45, 41.55])
  for (const z of [-22.55, -21.45])
    SITE_PARTS.push(sitePart([x, 16.4, z], [0.13, 32.8, 0.13], SITE.gold));
for (let y = 0; y < 31; y += 1.8) {
  for (const z of [-22.55, -21.45]) {
    SITE_PARTS.push(siteBeam([40.45, y, z], [41.55, y + 1.8, z], 0.1, SITE.gold));
    SITE_PARTS.push(sitePart([41, y, z], [1.2, 0.12, 0.12], SITE.gold));
  }
  for (const x of [40.45, 41.55])
    SITE_PARTS.push(siteBeam([x, y, -22.55], [x, y + 1.8, -21.45], 0.1, SITE.gold));
}
for (const y of [32.8, 33.8])
  for (const z of [-22.65, -21.35])
    SITE_PARTS.push(sitePart([40.8, y, z], [20, 0.14, 0.14], SITE.gold));
for (let x = 30.8; x < 50; x += 2)
  for (const z of [-22.65, -21.35]) {
    SITE_PARTS.push(siteBeam([x, 32.8, z], [x + 2, 33.8, z], 0.11, SITE.gold));
    SITE_PARTS.push(sitePart([x, 33.3, z], [0.1, 1.1, 0.1], SITE.gold));
  }
SITE_PARTS.push(sitePart([42.2, 32.25, -22], [1.25, 1.1, 1.5], SITE.gold));
SITE_PARTS.push(sitePart([42.2, 32.4, -21.23], [1.05, 0.55, 0.035], "#467584"));
SITE_PARTS.push(sitePart([49.8, 33.2, -22], [1.8, 1.25, 1.4], "#7d8b8b"));
SITE_PARTS.push(sitePart([38, 20.6, -22.15], [0.04, 24.4, 0.04], SITE.ink));
SITE_PARTS.push(sitePart([38, 8.25, -22.15], [0.35, 0.45, 0.3], SITE.gold));
for (const side of [-1, 1])
  SITE_PARTS.push(siteBeam([38, 8.15, -22.15], [38 + side * 2.2, 7.55, -22.15], 0.06, SITE.ink));
// Pallet gantry, distinct from the static crane. Suspended load moves along its short depth track.
for (const x of [37.9, 46.7])
  SITE_PARTS.push(sitePart([x, 3.9, -29.95], [0.18, 7.8, 0.18], SITE.steel));
SITE_PARTS.push(sitePart([42.3, 7.8, -28.9], [9.1, 0.25, 2.4], SITE.gold));
// Perimeter barrier bays leave Start and the south return lane open.
for (const x of [33.6, 37, 40.4, 43.8, 47.2, 50.6]) {
  SITE_SOLIDS.push(sitePart([x, 0.55, -16.9], [2.4, 0.38, 0.12], "#fff5d6"));
  SITE_PARTS.push(sitePart([x, 0.55, -16.9], [2.4, 0.38, 0.12], "#fff5d6"));
  for (const side of [-1, 1])
    SITE_PARTS.push(sitePart([x + side * 0.9, 0.25, -16.9], [0.1, 0.5, 0.12], SITE.steel));
  for (let i = 0; i < 4; i++)
    SITE_PARTS.push({
      ...sitePart([x - 0.85 + i * 0.55, 0.55, -16.82], [0.18, 0.4, 0.03], SITE.gold),
      rz: -0.3,
    });
}

// The upper building stays open: slim interior columns and cross-braced storeys support the climb.
for (const x of [33, 47]) {
  for (const z of [-25.2, -20.2]) {
    const column = sitePart([x, 14.4, z], [0.24, 28.8, 0.24], SITE.steel);
    SITE_PARTS.push(column);
    SITE_SOLIDS.push(column);
  }
}
for (const y of [8, 12.4, 16.8, 21.2, 25.6, 28.8]) {
  for (const z of [-25.2, -20.2]) {
    const girder = sitePart([40, y, z], [14.2, 0.24, 0.24], SITE.concrete);
    SITE_PARTS.push(girder);
    SITE_SOLIDS.push(girder);
  }
  for (const x of [33, 47]) {
    SITE_PARTS.push(sitePart([x, y, -22.7], [0.24, 0.24, 5.2], SITE.concrete));
    SITE_PARTS.push(siteBeam([x, y - 3.4, -25.2], [x, y, -20.2], 0.1, SITE.steel));
  }
}
