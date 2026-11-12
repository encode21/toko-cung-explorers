import { Euler, Quaternion, Vector3 } from "three";
import type { OutdoorPart } from "./OutdoorBatch";
export interface TreeSpot {
  x: number;
  z: number;
  y?: number;
  scale?: number;
  seed?: number;
  palm?: boolean;
}
export interface PlantPart extends OutdoorPart {
  shape: "bark" | "twig" | "crown" | "frond";
  detail?: boolean;
}

export const NATURAL_TREE_TRUNK_HEIGHT = 5.7;
export const NATURAL_TREE_TRUNK_RADIUS = 0.19;

/** Tree bases retain the old 38 cm trunk footprint; branching starts above pedestrian height. */
export function naturalTreeParts(t: TreeSpot) {
  const { x, z, y = 0, scale = 1, seed = 0 } = t;
  const pine = seed % 5 === 4;
  const trunks: OutdoorPart[] = [
    {
      p: [x, y + (NATURAL_TREE_TRUNK_HEIGHT * scale) / 2, z],
      s: [
        NATURAL_TREE_TRUNK_RADIUS * 2 * scale,
        NATURAL_TREE_TRUNK_HEIGHT * scale,
        NATURAL_TREE_TRUNK_RADIUS * 2 * scale,
      ],
      color: seed % 2 ? "#766248" : "#68543d",
    },
  ];
  const branches: OutdoorPart[] = [];
  for (let branch = 0; branch < (pine ? 7 : 10); branch++) {
    const angle = branch * 2.399 + seed * 0.61;
    const h = pine ? 2.5 + branch * 0.43 : 3.2 + (branch % 4) * 0.55;
    const radius = pine ? 1.6 - branch * 0.11 : 1.5 + (branch % 3) * 0.12;
    const from = new Vector3(0, h, 0);
    const to = new Vector3(Math.sin(angle) * radius, h + 0.65, Math.cos(angle) * radius);
    const direction = to.clone().sub(from);
    const rotation = new Euler().setFromQuaternion(
      new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize()),
    );
    const center = from.add(to).multiplyScalar(0.5 * scale);
    branches.push({
      p: [x + center.x, y + center.y, z + center.z],
      s: [0.12 * scale, direction.length() * scale, 0.12 * scale],
      rx: rotation.x,
      ry: rotation.y,
      rz: rotation.z,
      color: "#6d5740",
    });
  }
  const canopy: OutdoorPart = {
    p: [x, y, z],
    s: [scale, scale, scale],
    ry: seed * 0.61,
    color: pine
      ? ["#396545", "#456e43", "#567b48"][Math.abs(seed) % 3]!
      : ["#547048", "#647c4a", "#45633e"][Math.abs(seed) % 3]!,
  };
  return { trunks, branches, canopy, pine };
}
/** Stable positions and colliders; only leaf/branch tips sway in the renderer. */
export function treeParts(t: TreeSpot): PlantPart[] {
  const { x, z, y = 0, scale: s = 1, seed = 0, palm = false } = t;
  const a: PlantPart[] = [];
  const add = (
    p: number[],
    size: number[],
    color: string,
    shape: PlantPart["shape"],
    extra: Partial<PlantPart> = {},
  ) =>
    a.push({
      p: [x + p[0]! * s, y + p[1]! * s, z + p[2]! * s],
      s: [size[0]! * s, size[1]! * s, size[2]! * s],
      color,
      shape,
      ...extra,
    });
  const limb = (
    from: [number, number, number],
    to: [number, number, number],
    width: number,
    color: string,
  ) => {
    const v = new Vector3(...to).sub(new Vector3(...from)),
      r = new Euler().setFromQuaternion(
        new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), v.clone().normalize()),
      );
    add(
      from.map((n, i) => (n + to[i]!) / 2),
      [width, v.length(), width],
      color,
      from[1] > 1 ? "twig" : "bark",
      { rx: r.x, ry: r.y, rz: r.z },
    );
  };
  if (palm) {
    add([0, 1.55, 0], [0.3, 3.1, 0.3], "#b38a5c", "bark");
    for (let i = 0; i < 7; i++)
      add(
        [0, 0.35 + i * 0.39, 0],
        [0.305 - i * 0.012, 0.045, 0.305 - i * 0.012],
        "#946d48",
        "bark",
        { detail: true },
      );
    for (let i = 0; i < 8; i++)
      add([0, 3.12, 0], [2.45, 1.5, 2.45], i % 2 ? "#83ad58" : "#5e924e", "frond", {
        ry: (i * Math.PI) / 4 + seed * 0.13,
        detail: i % 2 === 1,
      });
    for (let i = 0; i < 3; i++)
      add(
        [Math.sin(i * 2.1) * 0.17, 2.97, Math.cos(i * 2.1) * 0.17],
        [0.25, 0.32, 0.25],
        "#80643d",
        "crown",
        { detail: true },
      );
    return a;
  }
  add([0, 1.075, 0], [0.38, 2.15, 0.38], "#886346", "bark");
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + seed * 0.3,
      dx = Math.sin(angle),
      dz = Math.cos(angle);
    limb([dx * 0.04, 0.45, dz * 0.04], [dx * 0.46, 0.04, dz * 0.46], 0.2, "#886346");
    limb([0, 1.55, 0], [dx * 0.85, 2.65 + (i % 2) * 0.25, dz * 0.85], 0.16, "#936b48");
  }
  const colors = ["#7fa75d", "#659456", "#91b568"];
  add([0, 3.1, 0], [2.9, 1.65, 2.65], colors[seed % 3]!, "crown");
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + seed * 0.7;
    add(
      [Math.sin(angle) * 0.88, 2.68 + (i % 2) * 0.5, Math.cos(angle) * 0.8],
      [1.6, 1.05, 1.55],
      colors[(i + seed) % 3]!,
      "crown",
      { detail: true },
    );
  }
  add([-0.12, 3.85, 0.06], [1.65, 0.95, 1.55], colors[(seed + 1) % 3]!, "crown", { detail: true });
  return a;
}
