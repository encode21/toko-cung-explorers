import { waterAt } from "./model";
export interface SplashEvent {
  x: number;
  y: number;
  z: number;
  strength: number;
}
const pending: SplashEvent[] = [];
/** One bounded queue for local/remote feet, fishing and actual shallow-water tyre contacts. */
export function emitSplash(x: number, z: number, strength: number) {
  const water = waterAt(x, z);
  if (!water || water.depth < 0.035 || pending.length >= 16) return false;
  pending.push({
    x,
    y: water.surface + 0.025,
    z,
    strength: Math.max(0.2, Math.min(1.5, strength)),
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
    water.depth > 0.035 &&
    water.depth <= 0.5 &&
    y <= water.surface + 0.035 &&
    y >= water.floor - 0.08
  );
}
