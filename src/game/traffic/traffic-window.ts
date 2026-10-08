import { pathLength, samplePath, type TrafficLane } from "../world/outdoor-layout";

/** Keep approved routes; skip only their long remote tails beyond the neighborhood fog.
 * Actual recycling also checks every player's distance so an observer never sees a pop. */
export function trafficWindow(lane: TrafficLane) {
  const total = pathLength(lane.points);
  let start = 0;
  let end = total;
  for (let d = 0; d <= total; d += 2) {
    const p = samplePath(lane.points, d);
    if (Math.max(Math.abs(p.x), Math.abs(p.z)) <= 180) {
      start = d;
      break;
    }
  }
  for (let d = total; d >= start; d -= 2) {
    const p = samplePath(lane.points, d);
    if (Math.max(Math.abs(p.x), Math.abs(p.z)) <= 180) {
      end = d;
      break;
    }
  }
  return { start, end };
}
