import { OCEAN_PLAY_LIMIT, waterAt } from "../swimming/model";
import type { RidePose } from "./model";

/** Positive outside the driveable area; check the footprint, not only its centre. */
export function boundaryDepth(p: RidePose, half: readonly number[]) {
  let depth = -Infinity;
  const sin = Math.sin(p.yaw),
    cos = Math.cos(p.yaw);
  for (const x of [-half[0]!, 0, half[0]!]) {
    for (const z of [-half[2]!, 0, half[2]!]) {
      const px = p.x + x * cos + z * sin;
      const pz = p.z - x * sin + z * cos;
      depth = Math.max(
        depth,
        Math.abs(px) - (OCEAN_PLAY_LIMIT - 2),
        Math.abs(pz) - (OCEAN_PLAY_LIMIT - 2),
        (waterAt(px, pz)?.depth ?? 0) - 0.5,
      );
    }
  }
  return depth;
}

export function approachingBoundary(p: RidePose, half: readonly number[]) {
  const direction = p.speed < -0.1 ? -1 : 1;
  for (let distance = 0; distance <= 10; distance += 2) {
    if (
      boundaryDepth(
        {
          ...p,
          x: p.x + Math.sin(p.yaw) * distance * direction,
          z: p.z + Math.cos(p.yaw) * distance * direction,
        },
        half,
      ) > 0
    )
      return true;
  }
  return false;
}
