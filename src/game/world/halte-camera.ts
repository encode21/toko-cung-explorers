import { HALTE, JPO, MARKET_HALTE } from "./halte-jpo.ts";

type Point = { x: number; y: number; z: number };
/** Roof height for the close trailing camera; checking height keeps traffic under the JPO outdoors. */
export function halteCameraCeiling(p: Point, gangOrigin?: readonly number[]): number | null {
  const foot = p.y - 0.83;
  if (gangOrigin) {
    return Math.abs(p.x - (gangOrigin[0]! - 5.5)) < 1.9 &&
      Math.abs(p.z - (gangOrigin[2]! - 7)) < 2.8 &&
      foot > -0.4 &&
      foot < 1.1
      ? 2.6
      : null;
  }
  if (foot > -0.4 && foot < 1.1) {
    if (
      Math.abs(p.x - HALTE.x) < HALTE.width / 2 + 0.6 &&
      Math.abs(p.z - HALTE.z) < HALTE.depth / 2 + 1.2
    )
      return 3.05;
    if (Math.abs(p.x - MARKET_HALTE.x) < 2.8 && Math.abs(p.z - MARKET_HALTE.z) < 1.9) return 2.6;
    if (Math.abs(p.x + 36.5) < 1.9 && Math.abs(p.z + 47) < 2.8) return 2.6;
  }
  if (
    Math.abs(p.x - JPO.x) < JPO.width / 2 + 0.5 &&
    p.z > JPO.southZ - 1.2 &&
    p.z < JPO.northZ + 1.2 &&
    foot > JPO.height - 0.6 &&
    foot < JPO.height + 1.2
  )
    return JPO.height + 2.55;
  for (const [side, z] of [
    [1, JPO.southZ],
    [-1, JPO.northZ],
  ] as const) {
    const along = side * (p.x - JPO.x) - JPO.width / 2;
    const floor = JPO.height * (1 - along / JPO.run);
    if (
      along >= -0.4 &&
      along <= JPO.run + 0.5 &&
      Math.abs(p.z - z) < JPO.width / 2 + 0.4 &&
      Math.abs(foot - floor) < 0.7
    )
      return foot + 2.55;
  }
  return null;
}
