import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  LatheGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { VEHICLE_DEFINITIONS, type VehicleDefinition } from "../vehicles/definitions.ts";
import type { Vec3 } from "../world/layout";

export type ShowroomCar = "cung-velocity" | "cung-imperial";
type Section = [z: number, half: number, sill: number, shoulder: number, crest: number];
type SectionAt = Record<"half" | "sill" | "shoulder" | "crest", number>;
type Panel =
  | "body"
  | "door-right"
  | "door-left"
  | "windshield"
  | "frame"
  | "intakes"
  | "tail"
  | "daylight"
  | "lower-trim";
export type ShowroomCarShape = `${ShowroomCar}-${Panel}`;

const PROFILES = {
  "cung-velocity": [
    [-2.275, 0.79, 0.36, 0.71, 0.78],
    [-2.18, 0.95, 0.31, 0.78, 0.87],
    [-1.83, 1.045, 0.265, 0.91, 0.99],
    [-1.38, 1.072, 0.255, 0.964, 1.023],
    [-0.92, 1.04, 0.26, 0.922, 0.98],
    [-0.4, 1.02, 0.245, 0.871, 0.95],
    [0.22, 1.009, 0.248, 0.875, 0.97],
    [0.82, 1.043, 0.262, 0.93, 1.03],
    [1.38, 1.067, 0.269, 0.938, 1.018],
    [1.77, 1.008, 0.282, 0.835, 0.942],
    [2.075, 0.882, 0.299, 0.722, 0.822],
    [2.275, 0.651, 0.365, 0.652, 0.731],
  ],
  "cung-imperial": [
    [-2.42, 0.8, 0.369, 0.745, 0.845],
    [-2.26, 0.99, 0.313, 0.899, 0.994],
    [-1.94, 1.054, 0.285, 1.001, 1.096],
    [-1.49, 1.097, 0.286, 1.047, 1.119],
    [-0.87, 1.093, 0.288, 1.044, 1.104],
    [-0.21, 1.056, 0.274, 1.011, 1.074],
    [0.63, 1.044, 0.282, 1.027, 1.122],
    [1.15, 1.06, 0.288, 1.05, 1.158],
    [1.52, 1.086, 0.285, 1.041, 1.148],
    [1.89, 1.062, 0.3, 0.982, 1.114],
    [2.23, 0.992, 0.31, 0.914, 1.051],
    [2.42, 0.795, 0.36, 0.855, 0.978],
  ],
} satisfies Record<ShowroomCar, Section[]>;

export const SHOWROOM_DASH_Z = { "cung-velocity": 0.8, "cung-imperial": 0.89 } as const;

function station(profile: Section[], z: number): SectionAt {
  const upper = profile.findIndex((row) => row[0] >= z);
  const index = upper < 0 ? profile.length - 1 : Math.max(1, upper);
  const left = profile[index - 1]!;
  const right = profile[index]!;
  const previous = profile[index - 2] ?? left;
  const next = profile[index + 1] ?? right;
  const distance = right[0] - left[0];
  const t = Math.max(0, Math.min(1, (z - left[0]) / distance));
  const cubic = (component: 1 | 2 | 3 | 4) => {
    const rise = right[component] - left[component];
    if (rise === 0) return left[component];
    const slope = rise / distance;
    const before = (right[component] - previous[component]) / (right[0] - previous[0]);
    const after = (next[component] - left[component]) / (next[0] - left[0]);
    const tangent = (d: number) => Math.max(0, Math.min(2, d / slope)) * rise;
    return (
      left[component] +
      rise * t * t * (3 - 2 * t) +
      t * (1 - t) * (tangent(before) * (1 - t) - tangent(after) * t)
    );
  };
  return { half: cubic(1), sill: cubic(2), shoulder: cubic(3), crest: cubic(4) };
}

function patch(long: number, wide: number, point: (u: number, v: number) => Vec3, flip = false) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let l = 0; l <= long; l++) {
    for (let w = 0; w <= wide; w++) {
      positions.push(...point(l / long, w / wide));
      if (l === long || w === wide) continue;
      const a = l * (wide + 1) + w;
      const b = a + 1;
      const c = a + wide + 1;
      const d = c + 1;
      if (flip) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function combine(parts: BufferGeometry[]) {
  const result = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();
  return result;
}

function panelProfile(kind: ShowroomCar, definition: VehicleDefinition) {
  const profile = PROFILES[kind];
  const sport = kind === "cung-velocity";
  const end = definition.size[2] / 2;
  const frontDeck = SHOWROOM_DASH_Z[kind];
  const backDeck = sport ? -0.862 : -0.928;
  const axlePositions = definition.wheels.filter(([x]) => x > 0).map(([, y, z]) => ({ y, z }));
  const section = (z: number) => station(profile, z);
  const shoulderX = (row: SectionAt) => row.half * 0.944;
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;

  function sillAt(row: SectionAt, z: number) {
    let floor = row.sill;
    const radius = definition.wheelRadius + 0.067;
    for (const axle of axlePositions) {
      const distance = Math.abs(axle.z - z);
      if (distance < radius)
        floor = Math.max(floor, axle.y + Math.sqrt(radius * radius - distance * distance));
      else if (distance < radius + 0.065)
        floor = Math.max(floor, mix(axle.y, row.sill, (distance - radius) / 0.065));
    }
    return Math.min(floor, row.shoulder - 0.029);
  }

  function sidePoint(z: number, v: number, sign: number): Vec3 {
    const row = section(z);
    const bottom = sillAt(row, z);
    const bulge = 0.89 + 0.054 * v + 0.087 * Math.sin(v * Math.PI);
    return [sign * row.half * bulge, mix(bottom, row.shoulder, v), z];
  }

  const sideSkin = (start: number, finish: number, sign: number) =>
    patch(
      Math.ceil((finish - start) * 45),
      6,
      (u, v) => sidePoint(mix(start, finish, u), v, sign),
      sign < 0,
    );
  const shoulderReturn = (start: number, finish: number, sign: number) =>
    patch(
      Math.ceil((finish - start) * 22),
      2,
      (u, v) => {
        const [x, y, z] = sidePoint(mix(start, finish, u), 1, sign);
        return [x - sign * v * 0.067, y + Math.sin(Math.PI * v) * 0.011 - v * 0.025, z];
      },
      sign < 0,
    );

  function deckPoint(z: number, across: number, raise = 0): Vec3 {
    const row = section(z);
    const side = Math.abs(across);
    const crown = (row.crest - row.shoulder) * (1 - side ** (sport ? 2.6 : 4.7));
    const sculpt = (sport ? -0.024 : 0.017) * Math.sin(side * Math.PI * 2) ** 2;
    return [across * shoulderX(row), row.shoulder + crown + sculpt + raise, z];
  }
  const deck = (start: number, finish: number) =>
    patch(
      Math.ceil((finish - start) * 28),
      18,
      (u, v) => deckPoint(mix(start, finish, u), v * 2 - 1),
      true,
    );

  function face(z: number, across: number, v: number, raise = 0): Vec3 {
    const row = section(z);
    const [x, top] = deckPoint(z, across);
    const floor = row.sill + Math.abs(across) * 0.023;
    return [x * (0.945 + 0.055 * v), mix(floor, top, v), z + Math.sign(z) * raise];
  }
  const cap = (sign: number) => patch(9, 16, (u, v) => face(end * sign, v * 2 - 1, u), sign < 0);

  const chassis: BufferGeometry[] = [deck(-end, backDeck), deck(frontDeck, end), cap(-1), cap(1)];
  for (const seat of definition.seats) {
    const sign = Math.sign(seat.cushion[0]);
    const hinge = seat.hinge![2];
    const rearEdge = hinge - seat.doorWidth;
    // A narrow seam separates each moving door from the surrounding fixed panels.
    chassis.push(sideSkin(-end, rearEdge, sign), sideSkin(hinge, end, sign));
    if (backDeck < rearEdge) chassis.push(shoulderReturn(backDeck, rearEdge, sign));
    chassis.push(shoulderReturn(hinge, frontDeck, sign));
  }

  const screenTop = definition.size[1] - (sport ? 0.197 : 0.14);
  const baseY = section(frontDeck).shoulder + 0.038;
  const topZ = frontDeck - (sport ? 0.535 : 0.435);
  const screenPoint = (height: number, cross: number): Vec3 => {
    const p = Math.abs(cross);
    const width = mix(sport ? 0.857 : 0.884, sport ? 0.704 : 0.725, height);
    return [
      cross * width,
      mix(baseY, screenTop, height) + (1 - p * p) * (sport ? 0.057 : 0.05),
      mix(frontDeck, topZ, height) + (1 - p * p) * (sport ? 0.136 : 0.113),
    ];
  };
  const windshield = patch(9, 16, (u, v) => screenPoint(u, v * 2 - 1));
  const rail = (sample: (progress: number) => Vec3, samples: number, radius: number) =>
    new TubeGeometry(
      new CatmullRomCurve3(
        Array.from(
          { length: samples },
          (_, index) => new Vector3(...sample(index / (samples - 1))),
        ),
      ),
      20,
      radius,
      7,
      false,
    );
  const frame = combine([
    rail((t) => screenPoint(0, t * 2 - 1), 11, 0.038),
    rail((t) => screenPoint(1, t * 2 - 1), 11, 0.033),
    ...[-1, 1].map((sign) => rail((t) => screenPoint(t, sign), 8, sport ? 0.043 : 0.038)),
  ]);

  function lamp(sign: number, lens: boolean) {
    return patch(
      18,
      5,
      (u, v) => {
        const t = lens ? mix(0.075, 0.955, u) : u;
        const x = sport ? mix(0.459, 0.904, t) : mix(0.48, 0.91, t);
        const shift = sport ? 0.37 * t ** 1.35 : 0.205 * t ** 2;
        const front = (sport ? 2.239 : 2.395) - shift;
        const flare = Math.max(0.024, Math.sin(Math.PI * t) ** 0.55 * (sport ? 0.252 : 0.155));
        const z = front - (lens ? mix(0.19, 0.65, v) : v) * flare;
        const row = section(z);
        return deckPoint(z, (sign * x) / shoulderX(row), lens ? 0.015 : 0.009);
      },
      sign > 0,
    );
  }
  const frontTrims = [-1, 1].flatMap((sign) => [
    lamp(sign, false),
    patch(
      7,
      14,
      (u, v) => {
        const cross = sign * mix(sport ? 0.21 : 0.49, 0.94, v);
        const taper = Math.sin(Math.PI * v) ** 0.44;
        return face(end, cross, 0.21 + u * (0.24 * taper + 0.016), 0.006);
      },
      sign < 0,
    ),
  ]);
  const tail = patch(
    7,
    23,
    (u, v) => {
      const x = (v * 2 - 1) * (sport ? 0.94 : 0.85);
      const taper = (1 - x * x) ** 0.3;
      return face(-end, x, mix(0.25, sport ? 0.78 : 0.46, u * taper), 0.008);
    },
    true,
  );

  const lowerTrim = combine(
    [-1, 1].map((sign) =>
      patch(
        5,
        22,
        (u, v) => {
          const across = v * 2 - 1;
          const shoulder = Math.abs(across);
          const curve = Math.sin((u * 0.8 + 0.15) * Math.PI);
          const row = section(end * sign);
          return [
            across * shoulderX(row) * (0.89 + curve * 0.046),
            row.sill - 0.057 + 0.095 * u + shoulder ** 3 * 0.026,
            sign * (end + 0.003 + 0.034 * curve - shoulder ** 3 * 0.021),
          ];
        },
        sign < 0,
      ),
    ),
  );

  const entry = definition.seats[0]!;
  const hinge = entry.hinge![2];
  const rearEdge = hinge - entry.doorWidth;
  const door = (sign: number) =>
    combine([
      sideSkin(rearEdge + 0.011, hinge - 0.011, sign),
      shoulderReturn(rearEdge + 0.011, hinge - 0.011, sign),
    ]);

  return {
    body: combine(chassis),
    "door-right": door(1),
    "door-left": door(-1),
    windshield,
    frame,
    intakes: combine(frontTrims),
    tail,
    daylight: combine([-1, 1].map((sign) => lamp(sign, true))),
    "lower-trim": lowerTrim,
  } satisfies Record<Panel, BufferGeometry>;
}

export const showroomCarGeometries = {} as Record<ShowroomCarShape, BufferGeometry>;
for (const kind of Object.keys(PROFILES) as ShowroomCar[]) {
  const panels = panelProfile(kind, VEHICLE_DEFINITIONS[kind]);
  for (const [panel, geometry] of Object.entries(panels)) {
    showroomCarGeometries[`${kind}-${panel}` as ShowroomCarShape] = geometry;
  }
}

// Cross section rolled around the axle. Its rounded shoulders catch light without a flat tire wall.
export const showroomTireGeometry = new LatheGeometry(
  [
    [0.307, -0.37],
    [0.351, -0.45],
    [0.421, -0.46],
    [0.469, -0.385],
    [0.491, -0.25],
    [0.5, -0.11],
    [0.5, 0.11],
    [0.491, 0.25],
    [0.469, 0.385],
    [0.421, 0.46],
    [0.351, 0.45],
    [0.307, 0.37],
    [0.307, -0.37],
  ].map(([radius, offset]) => new Vector2(radius, offset)),
  28,
);
