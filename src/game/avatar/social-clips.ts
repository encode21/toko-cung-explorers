import * as T from "three";

export const WAVE_SECONDS = 2.4;
export const DRINK_SECONDS = 3.2;
const cache = new Map<boolean, T.AnimationClip[]>();
const smooth = (v: number) => {
  const t = T.MathUtils.clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Both existing rigs use independent arm/elbow pivots. Explorer wrists are attached at the palm. */
export function createSocialClips(explorer = false): T.AnimationClip[] {
  if (cache.has(explorer)) return cache.get(explorer)!;
  const names = explorer
    ? ["Body", "Head", "RightArm", "RightElbow", "RightWrist"]
    : ["Chest", "Head", "LeftUpperArm", "LeftLowerArm", "LeftHand"];
  const clips = ["Wave", "Drink"].map((name) => {
    const duration = name === "Wave" ? WAVE_SECONDS : DRINK_SECONDS;
    const times = Array.from({ length: 65 }, (_, i) => (duration * i) / 64);
    const tracks = names.map(
      (joint, j) =>
        new T.QuaternionKeyframeTrack(
          joint + ".quaternion",
          times,
          times.flatMap((t) => {
            const envelope = smooth(t / 0.5) * smooth((duration - t) / 0.55);
            const flutter = Math.sin((t - 0.5) * Math.PI * 5) * envelope;
            const wave = name === "Wave";
            const pose = [
              [0, -0.035 * envelope, -0.025 * envelope],
              [wave ? -0.025 * envelope : -0.12 * envelope, 0.055 * envelope, 0.025 * envelope],
              [wave ? -0.25 * envelope : -1.05 * envelope, 0, (wave ? 2.05 : -0.12) * envelope],
              [
                (wave ? -0.5 : -1.45) * envelope,
                wave ? 0.1 * flutter : 0,
                wave ? 0.07 * flutter : -0.3 * envelope,
              ],
              [
                wave ? 0.1 * envelope : -0.15 * envelope,
                wave ? 0.18 * flutter : 0,
                wave ? 0.3 * flutter : -0.05 * envelope,
              ],
            ][j]!;
            return new T.Quaternion()
              .setFromEuler(new T.Euler(pose[0], pose[1], pose[2]))
              .toArray();
          }),
        ),
    );
    return new T.AnimationClip(name, duration, tracks);
  });
  cache.set(explorer, clips);
  return clips;
}
