import { INTERSECTIONS, type Point } from "../world/outdoor-layout";
import { onSurface, surfaceContours } from "../world/road-geometry";
import { ROADS, DRIVEWAYS, PARKING } from "../world/outdoor-layout";
import { relativeToVehicle, type VehiclePose } from "./traffic-math";
const drivable = surfaceContours([...ROADS, ...DRIVEWAYS, ...PARKING]);
/** Test the whole car/van footprint, not just its center. */
export function validRoadPose(p: VehiclePose, spawn = false) {
  if (spawn && INTERSECTIONS.some((n) => Math.hypot(n.x - p.x, n.z - p.z) < 8)) return false;
  for (const along of [-2.2, 2.2])
    for (const side of [-1, 1])
      if (
        !onSurface(
          { x: p.x + p.dx * along - p.dz * side, z: p.z + p.dz * along + p.dx * side },
          drivable,
        )
      )
        return false;
  return true;
}
export function clearanceAt(
  p: VehiclePose,
  vehicles: Iterable<VehiclePose>,
  actors: Iterable<Point>,
) {
  for (const other of vehicles) if (Math.hypot(other.x - p.x, other.z - p.z) < 6) return false;
  for (const actor of actors) {
    const local = relativeToVehicle(actor, p);
    if (Math.abs(local.along) < 3.5 && Math.abs(local.side) < 2) return false;
  }
  return true;
}
export interface ProgressWatch {
  x: number;
  z: number;
  seconds: number;
}
/** Queuing for pedestrians and intentional loading are not mechanical stalls. */
export function stalled(watch: ProgressWatch, actual: Point, shouldMove: boolean, dt: number) {
  if (!shouldMove || Math.hypot(actual.x - watch.x, actual.z - watch.z) > 0.15) {
    watch.x = actual.x;
    watch.z = actual.z;
    watch.seconds = 0;
  } else watch.seconds += Math.min(dt, 0.25);
  return watch.seconds >= 4;
}
