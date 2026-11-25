export interface Energy {
  value: number;
  max: number;
  tired: boolean;
}
export const TIRED_SPEED = 0.8;
export const CRITICAL_ENERGY = 10;
export const tiredSpeedFactor = (tired: boolean) => (tired ? TIRED_SPEED : 1);
/** Orange once tired, red below 10, otherwise green. */
export const energyBand = (e: Energy) =>
  e.value < CRITICAL_ENERGY ? "critical" : e.tired ? "tired" : "ok";
/** Reads the optional top-level `energy` field of any server response; null when absent or malformed. */
export function parseEnergy(response: unknown): Energy | null {
  const e = (response as { energy?: Partial<Energy> } | null | undefined)?.energy;
  if (!e || typeof e.value !== "number" || typeof e.max !== "number" || e.max <= 0) return null;
  return { value: e.value, max: e.max, tired: !!e.tired };
}
export interface Nap {
  startedAt: string;
  fullSeconds: number;
}
/** Live estimate of a nap (the server recomputes the real amount on nap_end): empty→full in fullSeconds. */
export function napEnergy(e: Energy, nap: Nap, now = Date.now()) {
  const ms = Math.max(0, now - Date.parse(nap.startedAt));
  return Math.min(e.max, e.value + Math.floor((ms * e.max) / (Math.max(1, nap.fullSeconds) * 1000)));
}
