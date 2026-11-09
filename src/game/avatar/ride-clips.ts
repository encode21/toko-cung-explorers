import * as T from "three";
export const isRideAnimation = (name?: string) => name?.startsWith("Ride") ?? false;
/** Keep canonical rig scale and seated hip contact; change only the riding joints. */
export function createRideClips(sit: T.AnimationClip, explorer = false) {
  return ["RideDrive", "RidePassenger", "RideBike", "RideBoard", "RideMount"].map((name) => {
    const clip = sit.clone();
    clip.name = name;
    const joints: Record<string, [number, number, number]> = {};
    for (const [side, sign] of [
      ["Left", 1],
      ["Right", -1],
    ] as const) {
      const spread = sign * (explorer ? -1 : 1);
      joints[side + (explorer ? "Arm" : "UpperArm")] = [
        name === "RidePassenger" ? -0.25 : -0.95,
        0,
        spread * 0.16,
      ];
      joints[side + (explorer ? "Elbow" : "LowerArm")] = [
        name === "RidePassenger" ? -0.55 : -0.42,
        0,
        0,
      ];
      joints[side + (explorer ? "Leg" : "UpperLeg")] = [
        -1.55,
        0,
        name === "RideMount" ? spread * 0.65 : name === "RideBike" ? spread * 0.34 : spread * 0.06,
      ];
      joints[side + (explorer ? "Knee" : "LowerLeg")] = [1.55, 0, 0];
    }
    if (name === "RideBoard") joints[explorer ? "Body" : "Spine"] = [0.34, 0, 0];
    clip.tracks = clip.tracks.filter(
      (t) => !Object.keys(joints).some((j) => t.name === j + ".quaternion"),
    );
    for (const [joint, angles] of Object.entries(joints)) {
      const q = new T.Quaternion().setFromEuler(new T.Euler(...angles)).toArray();
      clip.tracks.push(
        new T.QuaternionKeyframeTrack(joint + ".quaternion", [0, clip.duration], [...q, ...q]),
      );
    }
    return clip;
  });
}
