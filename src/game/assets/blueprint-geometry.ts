import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape } from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { CAR_BLUEPRINTS, type BlueprintModel } from "../vehicles/blueprints.ts";

type Section =
  | "flank"
  | "door0"
  | "door1"
  | "glass0"
  | "glass1"
  | "quarter"
  | "hood"
  | "boot"
  | "roof"
  | "windshield"
  | "backlight";
export type BlueprintShape = `${BlueprintModel}-${Section}${"" | "-left"}`;
type Point = [number, number];

function clip(points: Point[], min: number, max: number) {
  for (const [edge, sign] of [
    [min, 1],
    [max, -1],
  ]) {
    const result: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!,
        b = points[(i + 1) % points.length]!;
      const insideA = (a[0] - edge!) * sign! >= 0,
        insideB = (b[0] - edge!) * sign! >= 0;
      if (insideA) result.push(a);
      if (insideA !== insideB) {
        const t = (edge! - a[0]) / (b[0] - a[0]);
        result.push([edge!, a[1] + (b[1] - a[1]) * t]);
      }
    }
    points = result;
  }
  return points;
}

function panel(points: Point[], thickness = 0.075) {
  const shape = new Shape();
  points.forEach(([z, y], i) => (i ? shape.lineTo(-z, y) : shape.moveTo(-z, y)));
  shape.closePath();
  const bevel = thickness > 0.02 ? 0.018 : 0;
  const g = new ExtrudeGeometry(shape, {
    depth: thickness - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 16,
  });
  g.translate(0, 0, -thickness / 2 + bevel);
  g.rotateY(Math.PI / 2);
  return g;
}

/** Rounded cross sections, in actual vehicle coordinates so silhouettes and wheel cutouts agree. */
function shell(sections: { z: number; width: number; y: number; height: number }[]) {
  const positions: number[] = [],
    indices: number[] = [];
  const count = 16;
  for (const s of sections) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.sign(Math.cos(angle)) * Math.abs(Math.cos(angle)) ** 0.45;
      const y = Math.sign(Math.sin(angle)) * Math.abs(Math.sin(angle)) ** 0.7;
      positions.push((x * s.width) / 2, s.y + (y * s.height) / 2, s.z);
    }
  }
  for (let j = 0; j < sections.length - 1; j++)
    for (let i = 0; i < count; i++) {
      const a = j * count + i,
        b = j * count + ((i + 1) % count),
        c = b + count,
        d = a + count;
      indices.push(a, b, d, b, c, d);
    }
  for (let i = 1; i < count - 1; i++) {
    indices.push(0, i + 1, i);
    const end = (sections.length - 1) * count;
    indices.push(end, end + i, end + i + 1);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function screen(width: number, bottom: Point, top: Point) {
  const g = new BufferGeometry();
  g.setAttribute(
    "position",
    new Float32BufferAttribute(
      [
        -width / 2,
        bottom[1],
        bottom[0],
        width / 2,
        bottom[1],
        bottom[0],
        -width / 2 + 0.12,
        top[1],
        top[0],
        width / 2 - 0.12,
        top[1],
        top[0],
      ],
      3,
    ),
  );
  g.setIndex([0, 1, 2, 1, 3, 2]);
  g.computeVertexNormals();
  return g;
}

export const blueprintGeometries = {} as Record<BlueprintShape, BufferGeometry>;
for (const model of Object.keys(CAR_BLUEPRINTS) as BlueprintModel[]) {
  const b = CAR_BLUEPRINTS[model],
    half = b.length / 2;
  const [rear, front] = b.cabin,
    [roofRear, roofFront] = b.roofEnds;
  const pickup = model === "pickup" || model === "double-cabin";
  const endTop = b.belt - (model === "sport" ? 0.3 : 0.16);
  const outline: Point[] = [
    [-half, 0.34],
    [-half, pickup ? b.belt - 0.2 : endTop],
    [rear, pickup ? b.belt - 0.2 : b.belt],
    ...(pickup ? [[rear, b.belt] as Point] : []),
    [front, b.belt],
    [half - 0.12, endTop],
    [half, endTop - 0.1],
    [half, 0.34],
  ];
  for (const axle of [...b.axles].reverse()) {
    const radius = b.radius + 0.065;
    outline.push([axle + radius, 0.34]);
    for (let i = 0; i <= 20; i++) {
      const angle = (i * Math.PI) / 20;
      outline.push([axle + Math.cos(angle) * radius, b.radius + Math.sin(angle) * radius]);
    }
    outline.push([axle - radius, 0.34]);
  }
  const windows: Point[] = [
    [rear + 0.07, b.belt + 0.035],
    [front - 0.05, b.belt + 0.035],
    [roofFront, b.roof - 0.09],
    [roofRear, b.roof - 0.09],
  ];
  const fixedPanels: BufferGeometry[] = [],
    fixedWindows: BufferGeometry[] = [];
  let cursor = -half;
  for (const [index, [start, end]] of [...b.doors.entries()].sort((a, c) => a[1][0] - c[1][0])) {
    if (start > cursor) fixedPanels.push(panel(clip(outline, cursor, start)));
    const quarter = clip(windows, cursor, start - 0.035);
    if (quarter.length > 2) fixedWindows.push(panel(quarter, 0.015));
    blueprintGeometries[`${model}-door${index}` as BlueprintShape] = panel(
      clip(outline, start + 0.012, end - 0.012),
    );
    blueprintGeometries[`${model}-glass${index}` as BlueprintShape] = panel(
      clip(windows, start + 0.05, end - 0.05),
      0.015,
    );
    cursor = end;
  }
  fixedPanels.push(panel(clip(outline, cursor, half)));
  const quarter = clip(windows, cursor + 0.035, half);
  if (quarter.length > 2) fixedWindows.push(panel(quarter, 0.015));
  blueprintGeometries[`${model}-flank`] = mergeGeometries(fixedPanels)!;
  blueprintGeometries[`${model}-quarter`] = fixedWindows.length
    ? mergeGeometries(fixedWindows)!
    : new BufferGeometry();
  for (const g of [...fixedPanels, ...fixedWindows]) g.dispose();
  blueprintGeometries[`${model}-hood`] = shell([
    { z: front - 0.05, width: b.width - 0.1, y: b.belt - 0.12, height: 0.24 },
    { z: front + (half - front) * 0.3, width: b.width - 0.06, y: b.belt - 0.14, height: 0.23 },
    { z: half - 0.12, width: b.width - 0.14, y: endTop - 0.08, height: 0.2 },
    { z: half - 0.025, width: b.width - 0.28, y: endTop - 0.12, height: 0.13 },
  ]);
  blueprintGeometries[`${model}-boot`] = shell([
    { z: -half + 0.025, width: b.width - 0.24, y: endTop - 0.12, height: 0.18 },
    { z: -half + 0.18, width: b.width - 0.06, y: b.belt - 0.11, height: 0.24 },
    { z: rear + 0.03, width: b.width - 0.1, y: b.belt - 0.1, height: 0.2 },
  ]);
  blueprintGeometries[`${model}-roof`] = shell([
    { z: roofRear - 0.08, width: b.width - 0.4, y: b.roof - 0.025, height: 0.065 },
    { z: roofRear + 0.13, width: b.width - 0.33, y: b.roof + 0.015, height: 0.11 },
    { z: roofFront - 0.12, width: b.width - 0.34, y: b.roof + 0.01, height: 0.1 },
    { z: roofFront + 0.06, width: b.width - 0.44, y: b.roof - 0.03, height: 0.065 },
  ]);
  blueprintGeometries[`${model}-windshield`] = screen(
    b.width - 0.23,
    [front, b.belt],
    [roofFront + 0.015, b.roof - 0.045],
  );
  blueprintGeometries[`${model}-backlight`] = screen(
    b.width - 0.24,
    [rear, b.belt],
    [roofRear - 0.015, b.roof - 0.045],
  );
  for (const section of ["flank", "door0", "door1", "glass0", "glass1", "quarter"] as const) {
    let g = blueprintGeometries[`${model}-${section}`];
    if (!g?.attributes["position"]) continue;
    const a = g.attributes["position"]!;
    const window = section.startsWith("glass") || section === "quarter";
    for (let i = 0; i < a.count; i++) {
      const inset = window
        ? 0.035 + Math.max(0, (a.getY(i) - b.belt) / (b.roof - b.belt)) * 0.12
        : 0.11 * (Math.abs(a.getZ(i)) / half) ** 8 +
          0.045 * Math.max(0, (a.getY(i) - b.belt + 0.2) / 0.2);
      a.setX(i, a.getX(i) - inset);
    }
    g.deleteAttribute("normal");
    g.deleteAttribute("uv");
    const smooth = mergeVertices(g);
    g.dispose();
    g = smooth;
    g.computeVertexNormals();
    blueprintGeometries[`${model}-${section}`] = g;
    const left = g.clone().scale(-1, 1, 1);
    // Mirroring the geometry (not a negative instance scale) keeps front faces and normals valid.
    const index = left.index!;
    for (let i = 0; i < index.count; i += 3) {
      const value = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, value);
    }
    left.computeVertexNormals();
    blueprintGeometries[`${model}-${section}-left`] = left;
  }
}
