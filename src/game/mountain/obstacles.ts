import { MOUNTAIN_TRAIL, type MOUNTAIN_CHALLENGES } from "./model.ts";

type Challenge = (typeof MOUNTAIN_CHALLENGES)[number];
/** Shared visible/physical platforms; gaps fit a normal walk-speed jump. */
export function challengePlatforms(challenge: Challenge) {
  const a = MOUNTAIN_TRAIL[challenge.segment]!;
  const b = MOUNTAIN_TRAIL[challenge.segment + 1]!;
  const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
  const stairs = challenge.kind === "stairs";
  const count = stairs
    ? Math.ceil((b[1] - a[1]) / 0.16)
    : challenge.kind === "stones"
      ? Math.ceil(length / 3.5) + 1
      : 1;
  return Array.from({ length: count }, (_, i) => {
    const t = stairs ? (i + 0.5) / count : count === 1 ? 0.5 : i / (count - 1);
    return {
      x: a[0] + (b[0] - a[0]) * t,
      y: a[1] + (b[1] - a[1]) * (stairs ? (i + 1) / count : t),
      z: a[2] + (b[2] - a[2]) * t,
      yaw,
      width: stairs ? 4.8 : challenge.kind === "stones" ? 3.2 : 1.35,
      depth: stairs ? length / count + 0.025 : challenge.kind === "stones" ? 2.3 : length + 0.1,
    };
  });
}

/** Beveled risers let the walking capsule climb the exact visible stair surface. */
export function stairMesh(challenge: Challenge) {
  const platforms = challengePlatforms(challenge);
  const positions: number[] = [],
    indices: number[] = [];
  const rise =
    (MOUNTAIN_TRAIL[challenge.segment + 1]![1] - MOUNTAIN_TRAIL[challenge.segment]![1]) /
    platforms.length;
  for (const p of platforms) {
    const start = positions.length / 3;
    const profile = [
      [-p.depth / 2, -0.36],
      [-p.depth / 2, -rise],
      [-p.depth * 0.1, 0],
      [p.depth / 2, 0],
      [p.depth / 2, -0.36],
    ];
    for (const x of [-p.width / 2, p.width / 2])
      for (const [z, y] of profile)
        positions.push(
          p.x + x * Math.cos(p.yaw) + z! * Math.sin(p.yaw),
          p.y + y!,
          p.z - x * Math.sin(p.yaw) + z! * Math.cos(p.yaw),
        );
    for (let i = 1; i < 4; i++)
      indices.push(start, start + i + 1, start + i, start + 5, start + i + 5, start + i + 6);
    for (let i = 0; i < 5; i++) {
      const j = (i + 1) % 5;
      indices.push(start + i, start + j, start + i + 5, start + j, start + j + 5, start + i + 5);
    }
  }
  return { positions: new Float32Array(positions), triangles: new Uint32Array(indices) };
}
