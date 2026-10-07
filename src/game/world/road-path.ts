import type { Point } from "./outdoor-layout";
/** Quadratic fillets: tangent-continuous corners, sampled once, never in the frame loop. */
export function smoothRoadPath(points: Point[], radius = 3): Point[] {
  if (points.length < 3) return points;
  const result: Point[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!,
      p = points[i]!,
      b = points[i + 1]!;
    const la = Math.hypot(p.x - a.x, p.z - a.z),
      lb = Math.hypot(b.x - p.x, b.z - p.z);
    const r = Math.min(radius, la * 0.4, lb * 0.4);
    const start = { x: p.x + ((a.x - p.x) * r) / la, z: p.z + ((a.z - p.z) * r) / la };
    const end = { x: p.x + ((b.x - p.x) * r) / lb, z: p.z + ((b.z - p.z) * r) / lb };
    result.push(start);
    for (let n = 1; n <= 24; n++) {
      const t = n / 24,
        u = 1 - t;
      result.push({
        x: u * u * start.x + 2 * u * t * p.x + t * t * end.x,
        z: u * u * start.z + 2 * u * t * p.z + t * t * end.z,
      });
    }
  }
  result.push(points.at(-1)!);
  return result;
}
