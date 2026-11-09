import { Quaternion, Vector3, type Object3D } from "three";
import type { VehicleSeatDefinition } from "../vehicles/definitions";
/** Small arm IK layer over the mixer. Restoring first prevents accumulated joint drift. */
export function createRidePose(scene: Object3D, scale = 1) {
  const explorer = !!scene.getObjectByName("RightElbow");
  const arms = ["Left", "Right"].map((side) => ({
    upper: scene.getObjectByName(side + (explorer ? "Arm" : "UpperArm"))!,
    lower: scene.getObjectByName(side + (explorer ? "Elbow" : "LowerArm"))!,
    hand: scene.getObjectByName(side + (explorer ? "Wrist" : "Hand"))!,
    saved: [new Quaternion(), new Quaternion()],
  }));
  const target = new Vector3(),
    origin = new Vector3(),
    end = new Vector3(),
    toward = new Vector3(),
    q = new Quaternion(),
    parent = new Quaternion();
  let applied = false;
  return {
    restore() {
      if (!applied) return;
      for (const a of arms) {
        a.upper.quaternion.copy(a.saved[0]!);
        a.lower.quaternion.copy(a.saved[1]!);
      }
      applied = false;
    },
    apply(seat: VehicleSeatDefinition) {
      if (applied || arms.some((a) => !a.upper || !a.lower || !a.hand)) return;
      scene.updateWorldMatrix(true, true);
      for (const a of arms) {
        a.saved[0]!.copy(a.upper.quaternion);
        a.saved[1]!.copy(a.lower.quaternion);
        a.upper.getWorldPosition(origin);
        scene.worldToLocal(origin);
        const grip = seat.grips[origin.x < 0 ? 0 : 1];
        target.set(
          (grip[0] - seat.cushion[0]) / scale,
          (grip[1] - seat.cushion[1] + 0.36) / scale,
          (grip[2] - seat.cushion[2]) / scale,
        );
        scene.localToWorld(target);
        for (let i = 0; i < 6; i++)
          for (const joint of [a.lower, a.upper]) {
            joint.getWorldPosition(origin);
            a.hand.getWorldPosition(end);
            end.sub(origin).normalize();
            toward.copy(target).sub(origin).normalize();
            q.setFromUnitVectors(end, toward);
            joint.getWorldQuaternion(parent);
            q.multiply(parent);
            joint.parent!.getWorldQuaternion(parent).invert();
            joint.quaternion.copy(parent.multiply(q));
            joint.updateWorldMatrix(false, true);
          }
      }
      applied = true;
    },
  };
}
