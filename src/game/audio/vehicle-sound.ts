import type { VehicleKind } from "../traffic/traffic-math";

/** Quiet continuous curves in metres/second; no full-volume jump when creeping. */
export function vehicleSound(speed: number, kind: VehicleKind = "car") {
  const pace = Math.min(1, Math.max(0, Number.isFinite(speed) ? speed : 0) / 6.5);
  const idlePitch = kind === "motorcycle" ? 125 : kind === "truck" ? 65 : 90;
  return {
    pitch: idlePitch + pace * (kind === "motorcycle" ? 100 : 65),
    cutoff: 450 + pace * (kind === "motorcycle" ? 750 : 450),
    motor: 0.004 + 0.03 * pace,
    tires: 0.009 * pace * pace,
  };
}
