import * as T from "three";
export const SWIM_ANIMATIONS = ["Swim", "SwimIdle"] as const;
export type SwimAnimation = (typeof SWIM_ANIMATIONS)[number];
export const isSwimAnimation = (name: string | undefined): name is SwimAnimation =>
  name === "Swim" || name === "SwimIdle";
const cache = new Map<boolean, T.AnimationClip[]>();
/** Existing mixer alone owns the joints. Gentle breaststroke/sculling plus alternating kicks. */
export function createSwimClips(explorer = false) {
  const cached = cache.get(explorer);
  if (cached) return cached;
  const clips = SWIM_ANIMATIONS.map((name) => {
    const idle = name === "SwimIdle",
      duration = idle ? 1.5 : 0.95;
    const times = Array.from({ length: 49 }, (_, i) => (i * duration) / 48);
    const poses = times.map((t) => {
      const phase = (t / duration) * Math.PI * 2,
        wave = Math.sin(phase),
        pitch = idle ? 0.12 : 0.45;
      const p: Record<string, [number, number, number]> = {};
      if (explorer) p["Body"] = [pitch, 0, 0.025 * wave];
      else {
        p["Hips"] = [0.12, 0, 0];
        p["Spine"] = [pitch * 0.35, 0, 0];
        p["Chest"] = [pitch * 0.65, 0, 0];
      }
      p["Head"] = [-pitch * 0.7, 0, 0];
      for (const [side, sign] of [
        ["Left", 1],
        ["Right", -1],
      ] as const) {
        const spread = sign * (explorer ? -1 : 1),
          kick = Math.sin(phase * 2) * sign;
        p[side + (explorer ? "Arm" : "UpperArm")] = [
          -0.8 + (idle ? 0.2 : 0.65) * wave,
          0,
          spread * (0.65 + 0.3 * Math.cos(phase)),
        ];
        p[side + (explorer ? "Elbow" : "LowerArm")] = [-0.55 - 0.35 * wave, 0, 0];
        p[side + (explorer ? "Wrist" : "Hand")] = [0.15, 0, spread * 0.12];
        p[side + (explorer ? "Leg" : "UpperLeg")] = [
          -0.2 + (idle ? 0.12 : 0.32) * kick,
          0,
          spread * 0.08,
        ];
        p[side + (explorer ? "Knee" : "LowerLeg")] = [0.4 + 0.2 * kick, 0, 0];
        if (!explorer) p[side + "Foot"] = [0.2, 0, 0];
      }
      return p;
    });
    const tracks: T.KeyframeTrack[] = Object.keys(poses[0]!).map(
      (joint) =>
        new T.QuaternionKeyframeTrack(
          joint + ".quaternion",
          times,
          poses.flatMap((p) =>
            new T.Quaternion().setFromEuler(new T.Euler(...p[joint]!)).toArray(),
          ),
        ),
    );
    tracks.push(
      new T.VectorKeyframeTrack(
        explorer ? "Body.position" : "Hips.position",
        [0, duration],
        [0, explorer ? 0 : 0.72, 0, 0, explorer ? 0 : 0.72, 0],
      ),
    );
    return new T.AnimationClip(name, duration, tracks);
  });
  cache.set(explorer, clips);
  return clips;
}
