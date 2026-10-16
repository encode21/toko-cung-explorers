import * as T from "three";

/** Seated legs wrap around the carrier; hands reach toward their shoulders. The mixer owns all joints. */
export function createPiggybackClip(sit: T.AnimationClip, explorer = false) {
  const clip = sit.clone();
  clip.name = "Piggyback";
  const joints: Record<string, [number, number, number]> = {};
  for (const [side, sign] of [
    ["Left", 1],
    ["Right", -1],
  ] as const) {
    const spread = sign * (explorer ? -1 : 1);
    joints[side + (explorer ? "Arm" : "UpperArm")] = [-1.25, 0, spread * 0.2];
    joints[side + (explorer ? "Elbow" : "LowerArm")] = [-0.4, 0, 0];
    joints[side + (explorer ? "Leg" : "UpperLeg")] = [-1.1, 0, spread * 0.32];
    joints[side + (explorer ? "Knee" : "LowerLeg")] = [1.25, 0, 0];
  }
  clip.tracks = clip.tracks.filter(
    (t) => !Object.keys(joints).some((j) => t.name === `${j}.quaternion`),
  );
  for (const [name, angles] of Object.entries(joints)) {
    const value = new T.Quaternion().setFromEuler(new T.Euler(...angles)).toArray();
    clip.tracks.push(
      new T.QuaternionKeyframeTrack(`${name}.quaternion`, [0, clip.duration], [...value, ...value]),
    );
  }
  return clip;
}
