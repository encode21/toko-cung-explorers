import * as T from "three";

const cache = new Map<boolean, T.AnimationClip>();
/** One mixer owns the stride, lean and bounce. No physical root motion. */
export function createRunClip(explorer = false) {
  const cached = cache.get(explorer);
  if (cached) return cached;
  const duration = 0.56;
  const times = Array.from({ length: 49 }, (_, i) => (i * duration) / 48);
  const pose = (t: number) => {
    const phase = (t / duration) * Math.PI * 2;
    const stride = Math.sin(phase);
    const joints: Record<string, [number, number, number]> = {};
    if (explorer) joints["Body"] = [0.15, 0.045 * stride, 0.035 * stride];
    else {
      joints["Hips"] = [0, 0.04 * stride, 0.025 * stride];
      joints["Spine"] = [0.05, 0, 0];
      joints["Chest"] = [0.1, -0.07 * stride, 0];
    }
    joints["Head"] = [-0.08, 0, -0.018 * stride];
    for (const [side, sign] of [
      ["Left", 1],
      ["Right", -1],
    ] as const) {
      const swing = stride * sign;
      const spread = sign * (explorer ? -1 : 1);
      joints[side + (explorer ? "Arm" : "UpperArm")] = [0.85 * swing - 0.12, 0, spread * 0.12];
      joints[side + (explorer ? "Elbow" : "LowerArm")] = [-0.85 - 0.25 * swing, 0, 0];
      joints[side + (explorer ? "Wrist" : "Hand")] = [0, 0, spread * 0.06];
      joints[side + (explorer ? "Leg" : "UpperLeg")] = [-0.88 * swing - 0.08, 0, 0];
      joints[side + (explorer ? "Knee" : "LowerLeg")] = [0.18 + 1.05 * Math.max(0, swing), 0, 0];
      if (!explorer) joints[side + "Foot"] = [-0.12 - 0.18 * Math.max(0, swing), 0, 0];
    }
    return joints;
  };
  const samples = times.map(pose);
  const tracks: T.KeyframeTrack[] = Object.keys(samples[0]!).map(
    (joint) =>
      new T.QuaternionKeyframeTrack(
        joint + ".quaternion",
        times,
        samples.flatMap((p) =>
          new T.Quaternion().setFromEuler(new T.Euler(...p[joint]!)).toArray(),
        ),
      ),
  );
  tracks.push(
    new T.VectorKeyframeTrack(
      explorer ? "Body.position" : "Hips.position",
      times,
      times.flatMap((t) => [
        0,
        (explorer ? 0 : 0.72) +
          (0.025 + 0.025 * Math.cos((t / duration) * Math.PI * 4)) / (explorer ? 1.74 / 2.45 : 1),
        0,
      ]),
    ),
  );
  const clip = new T.AnimationClip("Run", duration, tracks);
  cache.set(explorer, clip);
  return clip;
}
