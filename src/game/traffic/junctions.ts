import { INTERSECTIONS } from "../world/outdoor-layout.ts";
import { relativeToVehicle, type VehiclePose } from "./traffic-math.ts";

/** Local host-only junction admission. Followers still consume the same traffic snapshots. */
export function createJunctionAdmission() {
  const junctions = INTERSECTIONS.map((point) => {
    // One turn covers the northern junction and gate turnaround; separate zones can deadlock.
    const gate = point.x === -30 && point.z === -32;
    return {
      point: gate ? { x: -30, z: -43.5 } : point,
      radius: gate ? 20.5 : 9,
      owner: "",
      ownerEntered: false,
      waiting: new Map<string, number>(),
    };
  });
  let ticket = 0;
  return {
    clear() {
      for (const j of junctions) {
        j.owner = "";
        j.ownerEntered = false;
        j.waiting.clear();
      }
    },
    clearance(
      id: string,
      pose: VehiclePose,
      vehicles: ReadonlyMap<string, VehiclePose>,
      signalGap = Infinity,
    ) {
      let clearance = Infinity;
      for (const j of junctions) {
        const distance = Math.hypot(pose.x - j.point.x, pose.z - j.point.z);
        const boundary = j.radius + (pose.halfLength ?? 2.05);
        for (const key of j.waiting.keys()) {
          const v = key === id ? pose : vehicles.get(key);
          const distance = v ? Math.hypot(v.x - j.point.x, v.z - j.point.z) : Infinity;
          if (v && key === j.owner && distance < j.radius + (v.halfLength ?? 2.05))
            j.ownerEntered = true;
          if (
            !v ||
            // Player vehicles can reverse or turn away; clearing the junction releases their turn.
            (distance > j.radius + 1 + (v.halfLength ?? 2.05) &&
              ((key === j.owner && j.ownerEntered) || relativeToVehicle(j.point, v).along < -3))
          )
            j.waiting.delete(key);
        }
        if (j.owner && !j.waiting.has(j.owner)) {
          j.owner = "";
          j.ownerEntered = false;
        }
        // Do not reserve or enter a junction whose exit is held by a red light.
        const heldBySignal = distance >= boundary && signalGap < distance + boundary;
        if (heldBySignal) {
          j.waiting.delete(id);
          if (j.owner === id) {
            j.owner = "";
            j.ownerEntered = false;
          }
        }
        if (distance > boundary + pose.speed ** 2 / 3.2 + 3) continue;
        if (relativeToVehicle(j.point, pose).along < -3 && j.owner !== id) continue;
        if (heldBySignal) {
          clearance = Math.min(clearance, Math.max(0, distance - boundary));
          continue;
        }
        if (!j.waiting.has(id)) j.waiting.set(id, ticket++);
        const owner = vehicles.get(j.owner);
        if (owner && !j.ownerEntered && j.owner !== id) {
          const ahead = relativeToVehicle(pose, owner);
          // A bus merging ahead must clear first; reserving for the car behind traps both.
          if (
            ahead.along > 0 &&
            Math.abs(ahead.side) < 2 &&
            pose.dx * owner.dx + pose.dz * owner.dz > 0.7
          )
            j.owner = id;
        }
        if (!j.owner) {
          // On handoff, clear cars already inside before admitting another approach.
          const resident = [...vehicles].find(
            ([, v]) =>
              Math.hypot(v.x - j.point.x, v.z - j.point.z) < j.radius + (v.halfLength ?? 2.05),
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
