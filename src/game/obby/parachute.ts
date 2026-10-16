import type { ObbyRun } from "./model";

/** Metres above ground before a post-Finish fall may open the parachute. */
export const PARACHUTE_MIN_HEIGHT = 4;
/** Terminal descent while the canopy is open (m/s, negative = down). */
export const PARACHUTE_DESCENT_SPEED = -2.6;
/** Must be descending; skips the jump apex on the Finish pad. */
export const PARACHUTE_DEPLOY_VY = -0.8;

/** After Finish, any long fall opens the canopy until the next ground contact. */
export function shouldDeployObbyParachute(
  status: ObbyRun["status"],
  feetY: number,
  vy: number,
  airborne: boolean,
) {
  return (
    status === "complete" &&
    airborne &&
    feetY >= PARACHUTE_MIN_HEIGHT &&
    vy <= PARACHUTE_DEPLOY_VY
  );
}

/** Soften horizontal drift a little so steering stays readable while descending. */
export function parachuteVelocity(vx: number, vy: number, vz: number) {
  return {
    x: vx * 0.92,
    y: Math.max(vy, PARACHUTE_DESCENT_SPEED),
    z: vz * 0.92,
  };
}
