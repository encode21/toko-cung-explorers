import type { RidePose } from "./model";
/** Both the model and every occupant use this transform; physics stays level. */
export function rideVisual(p: RidePose, time: number, bike: boolean, steer = 0, reduced = false) {
  const moving = Math.min(1, Math.abs(p.speed) / 4);
  return {
    lift: reduced ? 0 : Math.sin(time * 8) * 0.014 * moving,
    roll: reduced
      ? 0
      : bike
        ? steer * Math.min(0.16, Math.abs(p.speed) * 0.025)
        : steer * moving * 0.018,
  };
}
export function reducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
