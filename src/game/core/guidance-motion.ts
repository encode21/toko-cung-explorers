/** Frame-rate independent damping; shortest arc avoids a full turn at ±PI. */
export function guidanceAngle(current: number, target: number, delta: number) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * (1 - Math.exp(-18 * Math.max(0, delta)));
}

/** Hysteresis prevents near-target movement from repeatedly flipping the arrow. */
export function guidanceDirectionVisible(distance: number, wasVisible: boolean) {
  return distance > (wasVisible ? 0.8 : 1.15);
}
