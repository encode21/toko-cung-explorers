import type { Bounds, Point } from "./outdoor-layout";
export type Edge = { a: Point; b: Point };
const key = (p: Point) => `${p.x.toFixed(4)},${p.z.toFixed(4)}`;
const inside = (b: Bounds, x: number, z: number) =>
  x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
/** Exact planar union on rectangle boundary coordinates. Shared edges are removed, not overdrawn. */
export function surfaceContours(
  rectangles: readonly Bounds[],
  cuts: readonly Bounds[] = [],
  chamfer = 1.1,
): Point[][] {
  const all = [...rectangles, ...cuts];
  const xs = [...new Set(all.flatMap((b) => [b.minX, b.maxX]).map((v) => +v.toFixed(4)))].sort(
    (a, b) => a - b,
  );
  const zs = [...new Set(all.flatMap((b) => [b.minZ, b.maxZ]).map((v) => +v.toFixed(4)))].sort(
    (a, b) => a - b,
  );
  const occupied = new Set<string>();
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < zs.length - 1; j++) {
      const x = (xs[i]! + xs[i + 1]!) / 2,
        z = (zs[j]! + zs[j + 1]!) / 2;
      if (rectangles.some((b) => inside(b, x, z)) && !cuts.some((b) => inside(b, x, z)))
        occupied.add(`${i},${j}`);
    }
  const edges: Edge[] = [];
  for (const cell of occupied) {
    const [i, j] = cell.split(",").map(Number) as [number, number];
    const a = { x: xs[i]!, z: zs[j]! },
      b = { x: xs[i + 1]!, z: zs[j]! },
      c = { x: xs[i + 1]!, z: zs[j + 1]! },
      d = { x: xs[i]!, z: zs[j + 1]! };
    if (!occupied.has(`${i},${j - 1}`)) edges.push({ a, b });
    if (!occupied.has(`${i + 1},${j}`)) edges.push({ a: b, b: c });
    if (!occupied.has(`${i},${j + 1}`)) edges.push({ a: c, b: d });
    if (!occupied.has(`${i - 1},${j}`)) edges.push({ a: d, b: a });
  }
  const outgoing = new Map(edges.map((e) => [key(e.a), e]));
  const loops: Point[][] = [];
  while (outgoing.size) {
    const first = outgoing.values().next().value!;
    const points: Point[] = [];
    let edge: Edge | undefined = first;
    while (edge) {
      points.push(edge.a);
      outgoing.delete(key(edge.a));
      edge = outgoing.get(key(edge.b));
      if (key(first.a) === key(points.at(-1)!) && points.length > 1) break;
    }
    const corners = points.filter((p, i) => {
      const a = points[(i + points.length - 1) % points.length]!,
        b = points[(i + 1) % points.length]!;
      return Math.abs((p.x - a.x) * (b.z - p.z) - (p.z - a.z) * (b.x - p.x)) > 0.0001;
    });
    loops.push(
      corners.flatMap((p, i) => {
        const a = corners[(i + corners.length - 1) % corners.length]!,
          b = corners[(i + 1) % corners.length]!;
        const la = Math.hypot(a.x - p.x, a.z - p.z),
          lb = Math.hypot(b.x - p.x, b.z - p.z),
          r = Math.min(chamfer, la * 0.25, lb * 0.25);
        return [
          { x: p.x + ((a.x - p.x) * r) / la, z: p.z + ((a.z - p.z) * r) / la },
          { x: p.x + ((b.x - p.x) * r) / lb, z: p.z + ((b.z - p.z) * r) / lb },
        ];
      }),
    );
  }
  return loops;
}
export function onSurface(p: Point, contours: readonly Point[][]) {
  let hit = false;
  for (const loop of contours)
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const a = loop[i]!,
        b = loop[j]!;
      if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x)
        hit = !hit;
    }
  return hit;
}
export function contourEdges(contours: readonly Point[][]): Edge[] {
  return contours.flatMap((loop) => loop.map((a, i) => ({ a, b: loop[(i + 1) % loop.length]! })));
}
