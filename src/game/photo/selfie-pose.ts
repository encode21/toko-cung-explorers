import { Euler, Quaternion, type Object3D } from "three";

/** Temporary local arm layer. Restore BEFORE the mixer ticks, including on camera exit. */
export function createSelfiePose(scene: Object3D) {
  const explorer = !!scene.getObjectByName("RightElbow");
  const joints = [
    { name: explorer ? "RightArm" : "RightUpperArm", angle: [-1.05, 0, explorer ? 0.22 : -0.22] },
    { name: explorer ? "RightElbow" : "RightLowerArm", angle: [-0.38, 0, 0] },
    { name: explorer ? "RightWrist" : "RightHand", angle: [0, 0, 0] },
  ].map(({ name, angle }) => ({
    joint: scene.getObjectByName(name),
    saved: new Quaternion(),
    pose: new Quaternion().setFromEuler(new Euler(angle[0], angle[1], angle[2])),
  }));
  let applied = false;
  return {
    restore() {
      if (!applied) return;
      for (const { joint, saved } of joints) joint?.quaternion.copy(saved);
      applied = false;
    },
    apply() {
      if (applied || joints.some(({ joint }) => !joint)) return;
      for (const { joint, saved, pose } of joints) {
        saved.copy(joint!.quaternion);
        joint!.quaternion.copy(pose);
      }
      applied = true;
    },
  };
}
