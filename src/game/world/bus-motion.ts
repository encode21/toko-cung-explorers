import type { RidePoint } from "./bus-routes";
export const angleDelta = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));
/** Bicycle steering: the visible front wheels follow curvature even at low speed. */
export function busSteering(from: number, to: number, step: number) {
  return step < 0.00001
    ? 0
    : Math.max(-0.7, Math.min(0.7, Math.atan((6 * angleDelta(from, to)) / step)));
}
export function pathLength(path: readonly RidePoint[]) {
  let length = 0;
  for (let i = 1; i < path.length; i++)
    length += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.z - path[i - 1]!.z);
  return length;
}
/** Interpolate vertex tangents as well as position, so sampled curves never snap the bus heading. */
export function sampleRide(path: readonly RidePoint[], travelled: number) {
  let left = Math.max(0, travelled);
  const heading = (i: number) => {
    const a = path[Math.max(0, i - 1)]!,
      b = path[Math.min(path.length - 1, i + 1)]!;
    return Math.atan2(b.x - a.x, b.z - a.z);
  };
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!,
      b = path[i]!,
      length = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= length || i === path.length - 1) {
      const t = length < 0.0001 ? 1 : Math.min(1, left / length);
      const yaw = heading(i - 1);
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        yaw: yaw + angleDelta(yaw, heading(i)) * t,
      };
    }
    left -= length;
  }
  return { ...path[0]!, yaw: 0 };
}
export function busTargetSpeed(path: readonly RidePoint[], distance: number, length: number) {
  const here = sampleRide(path, distance),
    ahead = sampleRide(path, Math.min(length, distance + 6));
  const bend = Math.abs(angleDelta(here.yaw, ahead.yaw));
  return Math.min(7, Math.sqrt(Math.max(0, 2 * 1.8 * (length - distance))), 7 / (1 + bend * 3));
}

export type BusObstacle = (pose: { x: number; z: number; yaw: number }) => boolean;
/** Shared motion for the scheduled service and a passenger's trip. */
export function advanceBus(
  path: readonly RidePoint[],
  distance: number,
  length: number,
  speed: number,
  dt: number,
  blocked?: BusObstacle,
) {
  let clearance = Infinity;
  if (blocked) {
    const lookAhead = Math.min(length - distance, speed ** 2 / 3.6 + 2);
    for (let ahead = 0; ahead <= lookAhead + 0.25; ahead += 0.25) {
      if (blocked(sampleRide(path, distance + Math.min(ahead, lookAhead)))) {
        clearance = Math.max(0, ahead - 0.5);
        break;
      }
    }
  }
  const target = Math.min(
    busTargetSpeed(path, distance, length),
    Math.sqrt(3.2 * Math.max(0, clearance - 0.5)),
  );
  const nextSpeed =
    clearance === 0 ? 0 : speed + Math.max(-1.8 * dt, Math.min(1.8 * dt, target - speed));
  const step = Math.min(clearance, length - distance, (speed + nextSpeed) * 0.5 * dt);
  return {
    distance: distance + step,
    speed: nextSpeed,
    step,
    pose: sampleRide(path, distance + step),
  };
}
