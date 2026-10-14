import * as T from "three";
import { CHAT_EMOTES } from "../social/chat-emotes.ts";

type Pose = [number, number, number];
const cache = new Map<boolean, T.AnimationClip[]>();
const EXPLORER_SCALE = 1.74 / 2.45;
const smooth = (value: number) => {
  const t = T.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Procedural poses for the same joints as avatar-source, plus the rigid explorer rig.
 * Only visual joints move; the player's physics/network root remains untouched. */
export function createEmoteClips(explorer = false): T.AnimationClip[] {
  const existing = cache.get(explorer);
  if (existing) return existing;
  const joints = explorer
    ? [
        "Body",
        "Head",
        ...["Left", "Right"].flatMap((s) => [
          `${s}Arm`,
          `${s}Elbow`,
          `${s}Wrist`,
          `${s}Leg`,
          `${s}Knee`,
        ]),
      ]
    : [
        "Root",
        "Hips",
        "Spine",
        "Chest",
        "Neck",
        "Head",
        ...["Left", "Right"].flatMap((s) => [
          `${s}Shoulder`,
          `${s}UpperArm`,
          `${s}LowerArm`,
          `${s}Hand`,
          `${s}UpperLeg`,
          `${s}LowerLeg`,
          `${s}Foot`,
        ]),
      ];
  const clips = CHAT_EMOTES.map((emote) => {
    const persistent = !Number.isFinite(emote.seconds);
    const duration = persistent ? 3 : emote.seconds;
    const times = Array.from({ length: 65 }, (_, index) => (duration * index) / 64);
    const poseAt = (t: number) => {
      const pose: Record<string, Pose> = {};
      const envelope = persistent ? 1 : smooth(t / 0.35) * smooth((duration - t) / 0.4);
      const torso = explorer ? "Body" : "Chest";
      const root = explorer ? "Body" : "Hips";
      const breath = Math.sin((t / duration) * Math.PI * 2);
      const laugh = Math.sin(t * Math.PI * 7);
      const shake = Math.sin(t * Math.PI * 8);
      if (emote.id === "lie") {
        pose[root] = [-Math.PI / 2, 0, 0];
        pose["Head"] = [0.025 * breath, 0, 0];
      } else if (emote.id === "sit") {
        if (!explorer) pose["Chest"] = [0.04, 0, 0];
        pose["Head"] = [0.02, breath * 0.025, 0];
      } else if (emote.id === "angry") {
        pose[torso] = [0.08 * envelope, 0.025 * shake * envelope, 0];
        pose["Head"] = [0.12 * envelope, 0.07 * shake * envelope, 0];
      } else {
        pose[torso] = [(0.08 + 0.055 * laugh) * envelope, 0, 0];
        pose["Head"] = [(-0.14 + 0.045 * laugh) * envelope, 0, 0];
      }
      for (const [side, baseSign] of [
        ["Left", 1],
        ["Right", -1],
      ] as const) {
        // Explorer's named left/right arms occupy the opposite X side to the base rig.
        const sign = explorer ? -baseSign : baseSign;
        const arm = `${side}${explorer ? "Arm" : "UpperArm"}`;
        const elbow = `${side}${explorer ? "Elbow" : "LowerArm"}`;
        const leg = `${side}${explorer ? "Leg" : "UpperLeg"}`;
        const knee = `${side}${explorer ? "Knee" : "LowerLeg"}`;
        if (emote.id === "sit") {
          pose[leg] = [-1.55, 0, sign * 0.06];
          pose[knee] = [0.16, 0, 0];
          pose[arm] = [0.28, 0, sign * 0.12];
          pose[elbow] = [-0.35, 0, 0];
        } else if (emote.id === "lie") {
          pose[arm] = [0, 0, sign * 0.17];
          pose[elbow] = [-0.08, 0, 0];
        } else if (emote.id === "angry") {
          pose[arm] = [(-0.42 + 0.035 * shake) * envelope, 0, sign * 0.26 * envelope];
          pose[elbow] = [(-1.25 + 0.07 * shake) * envelope, 0, 0];
        } else {
          pose[arm] = [-0.52 * envelope, 0, -sign * 0.22 * envelope];
          pose[elbow] = [(-1.18 + 0.045 * laugh) * envelope, 0, 0];
        }
      }
      return pose;
    };
    const samples = times.map(poseAt);
    const tracks: T.KeyframeTrack[] = joints.map(
      (joint) =>
        new T.QuaternionKeyframeTrack(
          `${joint}.quaternion`,
          times,
          samples.flatMap((pose) =>
            new T.Quaternion().setFromEuler(new T.Euler(...(pose[joint] ?? [0, 0, 0]))).toArray(),
          ),
        ),
    );
    // Explorer Body pivots at the soles; base Hips pivots 0.72m above them.
    // Lying rotates the whole body around the pelvis instead of dropping a standing torso.
    const position: Pose =
      emote.id === "lie"
        ? explorer
          ? [0, 0.4 / EXPLORER_SCALE, 0.94]
          : [0, 0.18, 0]
        : emote.id === "sit"
          ? explorer
            ? [0, 0.18 / EXPLORER_SCALE - 0.94, 0]
            : [0, 0.18, 0]
          : explorer
            ? [0, 0, 0]
            : [0, 0.72, 0];
    tracks.push(
      new T.VectorKeyframeTrack(
        explorer ? "Body.position" : "Hips.position",
        [0, duration],
        [...position, ...position],
      ),
    );
    if (!explorer)
      tracks.push(
        new T.VectorKeyframeTrack("Chest.position", [0, duration], [0, 0.21, 0, 0, 0.21, 0]),
      );
    return new T.AnimationClip(emote.animation, duration, tracks);
  });
  cache.set(explorer, clips);
  return clips;
}
