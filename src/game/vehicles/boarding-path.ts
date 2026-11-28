import type { RidePose } from "./model";

export type ApproachPoint = [number, number, number];
export type ClearVehiclePath = (from: ApproachPoint, to: ApproachPoint) => boolean;

const CLEARANCE = 0.65;
export const approachDistance = (a: ApproachPoint, b: ApproachPoint) =>
  Math.hypot(b[0] - a[0], b[2] - a[2]);

/** Find the shortest clear approach, including both ends of the car when coming from its far side. */
export function vehicleDoorPath(
  from: ApproachPoint,
  door: ApproachPoint,
  pose: RidePose,
  half: readonly [number, number, number],
  clear: ClearVehiclePath,
): ApproachPoint[] | null {
  if (clear(from, door)) return [door];

  const cos = Math.cos(pose.yaw);
  const sin = Math.sin(pose.yaw);
  const corners = [-1, 1].flatMap((side) =>
    [-1, 1].map((end): ApproachPoint => {
      const x = side * (half[0] + CLEARANCE);
      const z = end * (half[2] + CLEARANCE);
      return [pose.x + x * cos + z * sin, from[1], pose.z - x * sin + z * cos];
    }),
  );
  const entries = corners.filter((corner) => clear(from, corner));
  const exits = corners.filter((corner) => clear(corner, door));
  const candidates = entries.flatMap((entry) =>
    exits.map((exit) => (entry === exit ? [entry, door] : [entry, exit, door])),
  );
  return (
    candidates
      .map((points) => ({
        points,
        length: points.reduce(
          (length, point, index) => length + approachDistance(points[index - 1] ?? from, point),
          0,
        ),
      }))
      .sort((a, b) => a.length - b.length)
      .find(({ points }) => points.length === 2 || clear(points[0]!, points[1]!))?.points ?? null
  );
}
