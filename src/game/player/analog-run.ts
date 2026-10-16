/** Physical stick radius, before sensitivity. Separate thresholds prevent edge chatter. */
export function analogRunning(strength: number, wasRunning: boolean) {
  return Number.isFinite(strength) && strength >= (wasRunning ? 0.8 : 0.92);
}
