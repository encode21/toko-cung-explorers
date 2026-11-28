/** Half-angle of the stick's bottom cone that means "reverse" instead of "turn". */
const REVERSE_CONE = Math.PI / 4;

/**
 * One-finger driving: the stick points where the vehicle should go, relative to its nose.
 * Push magnitude is the gas; left/right steers while still driving forward, so a stick
 * held hard left drives a full-lock left circle. Only the bottom cone means reverse
 * (callers brake first while still rolling forward).
 */
export function stickDrive(moveX: number, moveY: number) {
  const mag = Math.min(1, Math.hypot(moveX, moveY));
  if (mag === 0) return { throttle: 0, steer: 0 };
  // 0 = stick up, +PI/2 = right, ±PI = straight down. Screen-up is negative moveY.
  const angle = Math.atan2(moveX, -moveY);
  if (Math.abs(angle) > Math.PI - REVERSE_CONE)
    return {
      throttle: -mag,
      steer: Math.max(-1, Math.min(1, moveX / Math.hypot(moveX, moveY) / Math.sin(REVERSE_CONE))),
    };
  return { throttle: mag, steer: Math.max(-1, Math.min(1, angle / (Math.PI / 2))) };
}
