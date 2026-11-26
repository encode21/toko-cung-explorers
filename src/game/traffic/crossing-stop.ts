import { CROSSWALKS } from "../world/outdoor-layout.ts";
import { projectedExtent, type VehiclePose } from "./traffic-math.ts";

/** Distance along the vehicle's heading until its bumper is 0.8 m before a zebra. */
export function crossingStopGap(pose: VehiclePose) {
  let nearest = Infinity;
  for (const cross of CROSSWALKS) {
    const alongX = cross.maxX - cross.minX < cross.maxZ - cross.minZ;
    const forward = alongX ? pose.dx : pose.dz;
    if (Math.abs(forward) < Math.SQRT1_2) continue;

    const near = alongX ? cross.minX : cross.minZ;
    const far = alongX ? cross.maxX : cross.maxZ;
    const edge = forward > 0 ? near : far;
    const center = alongX ? pose.x : pose.z;
    const extent = projectedExtent(pose, alongX ? 1 : 0, alongX ? 0 : 1);
    const gap = ((edge - center) * Math.sign(forward) - extent - 0.8) / Math.abs(forward);
    // A vehicle already beyond the stop line clears the crossing. Allow rounding at rest.
    if (gap < -0.001 || gap >= nearest) continue;
    const lateral = alongX ? pose.z + pose.dz * gap : pose.x + pose.dx * gap;
    if (
      lateral < (alongX ? cross.minZ : cross.minX) ||
      lateral > (alongX ? cross.maxZ : cross.maxX)
    )
      continue;
    nearest = Math.max(0, gap);
  }
  return nearest;
}
