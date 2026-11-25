import { INTERSECTIONS } from "../world/outdoor-layout.ts";
import { relativeToVehicle, type VehiclePose } from "./traffic-math.ts";

/** Local host-only junction admission. Followers still consume the same traffic snapshots. */
export function createJunctionAdmission() {
  // The gate turnaround crosses the incoming lane, so it needs the same right of way as a junction.
  const junctions = [...INTERSECTIONS, { x: -30, z: -55 }].map((point) => ({
    point,
    owner: "",
    ownerEntered: false,
    waiting: new Map<string, number>(),
  }));
  let ticket = 0;
  return {
    clear() {
      for (const j of junctions) {
        j.owner = "";
        j.ownerEntered = false;
        j.waiting.clear();
      }
    },
    clearance(id: string, pose: VehiclePose, vehicles: ReadonlyMap<string, VehiclePose>) {
      let clearance = Infinity;
      for (const j of junctions) {
        const distance = Math.hypot(pose.x - j.point.x, pose.z - j.point.z);
        const boundary = 9 + (pose.halfLength ?? 2.05);
        for (const key of j.waiting.keys()) {
          const v = key === id ? pose : vehicles.get(key);
          const distance = v ? Math.hypot(v.x - j.point.x, v.z - j.point.z) : Infinity;
          if (v && key === j.owner && distance < 9 + (v.halfLength ?? 2.05)) j.ownerEntered = true;
          if (
            !v ||
            // Player vehicles can reverse or turn away; clearing the junction releases their turn.
            (distance > 10 + (v.halfLength ?? 2.05) &&
              ((key === j.owner && j.ownerEntered) || relativeToVehicle(j.point, v).along < -3))
          )
            j.waiting.delete(key);
        }
        if (j.owner && !j.waiting.has(j.owner)) {
          j.owner = "";
          j.ownerEntered = false;
        }
        if (distance > boundary + pose.speed ** 2 / 3.2 + 3) continue;
        if (relativeToVehicle(j.point, pose).along < -3 && j.owner !== id) continue;
        if (!j.waiting.has(id)) j.waiting.set(id, ticket++);
        if (!j.owner) {
          // On handoff, clear cars already inside before admitting another approach.
          const resident = [...vehicles].find(
            ([, v]) => Math.hypot(v.x - j.point.x, v.z - j.point.z) < 9 + (v.halfLength ?? 2.05),
          );
          j.owner = resident?.[0] ?? [...j.waiting].sort((a, b) => a[1] - b[1])[0]![0];
          j.ownerEntered = !!resident;
          if (!j.waiting.has(j.owner)) j.waiting.set(j.owner, ticket++);
        }
        // Stop the nose before the junction; a long bus needs its whole turning envelope clear.
        if (j.owner !== id && distance >= boundary - 0.5)
          clearance = Math.min(clearance, Math.max(0, distance - boundary));
      }
      return clearance;
    },
  };
}
export const junctionAdmission = createJunctionAdmission();
