/** Stick push (0-1) where walking turns into running; the joystick draws its "Lari" ring here. */
export const RUN_AT = 0.85;
/** Physical stick radius, before sensitivity. Separate thresholds prevent edge chatter. */
export function analogRunning(strength: number, wasRunning: boolean) {
  return Number.isFinite(strength) && strength >= (wasRunning ? RUN_AT - 0.1 : RUN_AT);
}
