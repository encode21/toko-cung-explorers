import { waterAt } from "./model";
export const MIN_SPLASH_DEPTH = 0.035;
export interface SplashEvent {
  x: number;
  y: number;
  z: number;
  strength: number;
  kind: "ripple" | "step" | "entry" | "plunge";
}
const pending: SplashEvent[] = [];
/** One bounded queue for local/remote feet, fishing and actual shallow-water tyre contacts. */
export function emitSplash(
  x: number,
  z: number,
  strength: number,
  kind: SplashEvent["kind"] = "ripple",
) {
  const water = waterAt(x, z);
  if (!water || water.depth < MIN_SPLASH_DEPTH) return false;
  return emitSurfaceSplash(x, water.surface, z, strength, kind);
}

/** Queue a contact on a known surface, including seasonal floodwater outside the swimming registry. */
export function emitSurfaceSplash(
  x: number,
  surface: number,
  z: number,
  strength: number,
  kind: SplashEvent["kind"],
) {
  if (pending.length >= 16) return false;
  pending.push({
    x,
    y: surface + 0.025,
    z,
    strength: Math.max(0.2, Math.min(1.5, strength)),
    kind,
  });
  return true;
}
export function takeSplashes() {
  return pending.splice(0, 16);
}
export function clearSplashes() {
  pending.length = 0;
}
export function tireWaterContact(x: number, y: number, z: number) {
  const water = waterAt(x, z);
  return (
    !!water &&
    water.depth > MIN_SPLASH_DEPTH &&
    water.depth <= 0.5 &&
    y <= water.surface + 0.035 &&
    y >= water.floor - 0.08
  );
}
