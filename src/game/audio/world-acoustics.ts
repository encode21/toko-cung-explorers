import { ZONES } from "../world/zones";
import { STORE } from "../world/layout";
import { SIDEWALKS, PEDESTRIAN, contains } from "../world/outdoor-layout";
export type AudioZone = "outdoor" | "retail" | "cashier" | "warehouse" | "loading";
export type FootSurface = "asphalt" | "concrete" | "tile" | "warehouse";
export function audioZoneAt(x: number, z: number): AudioZone {
  for (const id of ["cashier", "warehouse", "loading"] as const) {
    const zone = ZONES.find((v) => v.id === id)!;
    if (Math.abs(x - zone.c[0]) <= zone.s[0] / 2 && Math.abs(z - zone.c[1]) <= zone.s[1] / 2)
      return id;
  }
  if (x >= 11 && x <= 16 && z >= 8 && z <= 12) return "loading";
  if (x > STORE.minX && x < STORE.maxX && z > -22 && z < STORE.maxZ) return "retail";
  return "outdoor";
}
export function footSurfaceAt(x: number, z: number): FootSurface {
  const zone = audioZoneAt(x, z);
  if (zone === "warehouse") return "warehouse";
  if (zone === "retail" || zone === "cashier") return "tile";
  if ([...SIDEWALKS, ...PEDESTRIAN].some((v) => contains(v, { x, z }))) return "concrete";
  return "asphalt";
}
export const distanceGain = (distance: number, range = 18) =>
  Math.max(0, 1 - distance / range) ** 2;
/** Ignore teleports and frame stalls; only real grounded travel contributes. */
export function footTravel(distance: number, delta: number, grounded: boolean) {
  return grounded && delta > 0 && delta < 0.15 && distance > 0.002 && distance < 1.5 ? distance : 0;
}
