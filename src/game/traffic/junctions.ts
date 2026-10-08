import { INTERSECTIONS } from "../world/outdoor-layout";
import { relativeToVehicle, type VehiclePose } from "./traffic-math";

/** Local host-only junction admission. Followers still consume the same traffic snapshots. */
export function createJunctionAdmission() {
  const junctions = INTERSECTIONS.map((point) => ({
    point,
    owner: "",
    waiting: new Map<string, number>(),
  }));
  let ticket = 0;
  return {
    clear() {
      for (const j of junctions) {
        j.owner = "";
        j.waiting.clear();
      }
    },
    hold(id: string, pose: VehiclePose, vehicles: ReadonlyMap<string, VehiclePose>) {
      let hold = false;
      for (const j of junctions) {
        const distance = Math.hypot(pose.x - j.point.x, pose.z - j.point.z);
        for (const key of j.waiting.keys()) {
          const v = key === id ? pose : vehicles.get(key);
          if (!v || Math.hypot(v.x - j.point.x, v.z - j.point.z) > 15) j.waiting.delete(key);
        }
        if (j.owner && !j.waiting.has(j.owner)) j.owner = "";
        if (distance > 14) continue;
        if (relativeToVehicle(j.point, pose).along < -3 && j.owner !== id) continue;
        if (!j.waiting.has(id)) j.waiting.set(id, ticket++);
        if (!j.owner) {
          // On handoff, clear cars already inside before admitting another approach.
          const resident = [...vehicles].find(
            ([, v]) => Math.hypot(v.x - j.point.x, v.z - j.point.z) < 8,
          );
          j.owner = resident?.[0] ?? [...j.waiting].sort((a, b) => a[1] - b[1])[0]![0];
          if (!j.waiting.has(j.owner)) j.waiting.set(j.owner, ticket++);
        }
        if (j.owner !== id && distance >= 8) hold = true;
      }
      return hold;
    },
  };
}
