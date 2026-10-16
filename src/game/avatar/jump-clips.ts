import * as T from "three";

/** Runtime phases share the existing Jump network pose and animation mixer. */
export const JUMP_ANIMATIONS = [
  "JumpAnticipation",
  "Jump",
  "JumpFall",
  "JumpLand",
  "Parachute",
] as const;
export type JumpAnimation = (typeof JUMP_ANIMATIONS)[number];
export const JUMP_ANTICIPATION_SECONDS = 0.06;
export const JUMP_LANDING_SECONDS = 0.14;
export const PARACHUTE_HOLD_SECONDS = 0.2;
const EXPLORER_SCALE = 1.74 / 2.45;
const cache = new Map<boolean, T.AnimationClip[]>();
type V = [number, number, number];

export function isJumpAnimation(name: string | undefined): name is JumpAnimation {
  return JUMP_ANIMATIONS.some((jump) => jump === name);
}

/** Short fades keep anticipation and takeoff readable inside their brief phases. */
export function jumpBlendSeconds(target: string, previous?: string) {
  if (target === "JumpAnticipation") return 0.035;
  if (target === "Jump") return 0.045;
  if (target === "JumpFall") return 0.1;
  if (target === "JumpLand") return 0.045;
  if (target === "Parachute") return 0.12;
  return isJumpAnimation(previous) ? 0.16 : 0.28;
}

const smooth = (t: number) => {
  const u = T.MathUtils.clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
};
const curve = (t: number, keys: readonly (readonly [number, number])[]) => {
  for (let i = 1; i < keys.length; i++) {
    const left = keys[i - 1]!,
      right = keys[i]!;
    if (t <= right[0])
      return T.MathUtils.lerp(left[1], right[1], smooth((t - left[0]) / (right[0] - left[0])));
  }
  return keys[keys.length - 1]![1];
};

function poseAt(name: JumpAnimation, t: number, explorer: boolean) {
  let arm = -1.9,
    elbow = -0.45,
    spread = 0.23,
    knee = 0.32,
    thigh = -0.22;
  let pitch = -0.035,
    dip = 0,
    wrist = 0;
  if (name === "JumpAnticipation") {
    const crouch = smooth(t / JUMP_ANTICIPATION_SECONDS);
    arm = 0.32 * crouch;
    elbow = -0.58 * crouch;
    spread = 0.12;
    knee = 0.65 * crouch;
    thigh = -0.4 * crouch;
    pitch = 0.11 * crouch;
    dip = -0.038 * crouch;
  } else if (name === "Jump") {
    // Two distinct short dips after the upward swing; the final pose holds, never jitters.
    arm = curve(t, [
      [0, 0.32],
      [0.055, -2.3],
      [0.112, -1.48],
      [0.172, -2.19],
      [0.228, -1.53],
      [0.29, -2.08],
      [0.32, -1.95],
    ]);
    elbow = curve(t, [
      [0, -0.58],
      [0.065, -0.32],
      [0.124, -0.72],
      [0.184, -0.35],
      [0.24, -0.7],
      [0.31, -0.42],
    ]);
    knee = curve(t, [
      [0, 0.65],
      [0.09, 0.27],
      [0.23, 0.5],
      [0.32, 0.34],
    ]);
    thigh = curve(t, [
      [0, -0.4],
      [0.08, -0.12],
      [0.22, -0.31],
      [0.32, -0.22],
    ]);
    pitch = curve(t, [
      [0, 0.11],
      [0.09, -0.07],
      [0.32, -0.035],
    ]);
    dip = curve(t, [
      [0, -0.038],
      [0.08, 0.022],
      [0.19, 0.008],
      [0.32, 0],
    ]);
    wrist =
      0.1 *
      Math.sin(Math.min(t / 0.32, 1) * Math.PI * 4) *
      Math.sin(Math.min(t / 0.32, 1) * Math.PI);
  } else if (name === "JumpFall") {
    const balance = smooth(t / 0.14);
    arm = T.MathUtils.lerp(-1.95, -0.72, balance);
    elbow = T.MathUtils.lerp(-0.42, -0.3, balance);
    spread = T.MathUtils.lerp(0.23, 0.73, balance);
    knee = T.MathUtils.lerp(0.34, 0.17, balance);
    thigh = T.MathUtils.lerp(-0.22, -0.1, balance);
    pitch = 0.035 * balance;
  } else if (name === "Parachute") {
    // Open elbows beside the face; neutral wrists grip each riser without folding back.
    arm = -1.9;
    elbow = -0.75;
    spread = 0.55;
    knee = 0.55;
    thigh = -0.38;
    pitch = -0.06;
    wrist = 0;
  } else {
    const compression = curve(t, [
      [0, 0],
      [0.038, 1],
      [0.095, -0.18],
      [JUMP_LANDING_SECONDS, 0],
    ]);
    const settle = 1 - smooth(t / JUMP_LANDING_SECONDS);
    arm = -0.72 * settle + 0.12 * compression;
    elbow = -0.3 * settle - 0.25 * compression;
    spread = 0.73 * settle + 0.04 * (1 - settle);
    knee = 0.17 * settle + 0.53 * compression;
    thigh = -0.1 * settle - 0.33 * compression;
    pitch = 0.035 * settle + 0.07 * compression;
    dip = -0.036 * compression;
  }
  const pose: Record<string, V> = {};
  if (explorer) pose["Body"] = [pitch, 0, 0];
  else {
    pose["Hips"] = [0, 0, 0];
    pose["Spine"] = [pitch * 0.35, 0, 0];
    pose["Chest"] = [pitch * 0.65, 0, 0];
  }
  pose["Head"] = [-pitch * 0.5, 0, 0];
  for (const [side, baseSign] of [
    ["Left", 1],
    ["Right", -1],
  ] as const) {
    const sign = explorer ? -baseSign : baseSign;
    pose[side + (explorer ? "Arm" : "UpperArm")] = [arm, sign * 0.045, sign * spread];
    pose[side + (explorer ? "Elbow" : "LowerArm")] = [elbow, 0, 0];
    pose[side + (explorer ? "Wrist" : "Hand")] = [wrist, 0, sign * wrist * 0.6];
    pose[side + (explorer ? "Leg" : "UpperLeg")] = [thigh, 0, sign * 0.035];
    pose[side + (explorer ? "Knee" : "LowerLeg")] = [knee, 0, 0];
    if (!explorer) pose[side + "Foot"] = [-thigh - knee, 0, 0];
  }
  return { pose, dip };
}

/** The rigid rig has no ankle pivot: keep its wide shoes above the floor while crouching. */
function explorerSupportY(pose: Record<string, V>) {
  const body = new T.Quaternion().setFromEuler(new T.Euler(...pose["Body"]!));
  let lowest = Infinity;
  for (const [side, sign] of [
    ["Left", -1],
    ["Right", 1],
  ] as const) {
    const thigh = new T.Quaternion().setFromEuler(new T.Euler(...pose[side + "Leg"]!));
    const knee = new T.Quaternion().setFromEuler(new T.Euler(...pose[side + "Knee"]!));
    for (const x of [-1, 1])
      for (const z of [-1, 1]) {
        const corner = new T.Vector3(x * 0.14, -0.48, 0.07 + z * 0.22);
        corner.applyQuaternion(knee);
        corner.y -= 0.43;
        corner.applyQuaternion(thigh);
        corner.add(new T.Vector3(sign * 0.175, 0.94, 0));
        corner.applyQuaternion(body);
        lowest = Math.min(lowest, corner.y);
      }
  }
  return -lowest + 0.012 / EXPLORER_SCALE;
}

/** Key existing joints only. AnimationMixer is the sole writer, including the small pelvis bounce. */
export function createJumpClips(explorer = false): T.AnimationClip[] {
  const existing = cache.get(explorer);
  if (existing) return existing;
  const clips = JUMP_ANIMATIONS.map((name) => {
    const duration =
      name === "JumpAnticipation"
        ? JUMP_ANTICIPATION_SECONDS
        : name === "Jump"
          ? 0.32
          : name === "Parachute"
            ? PARACHUTE_HOLD_SECONDS
            : 0.14;
    const count = Math.ceil(duration * 120);
    const times = Array.from({ length: count + 1 }, (_, i) => (i * duration) / count);
    const samples = times.map((t) => poseAt(name, t, explorer));
    const joints = explorer
      ? Object.keys(samples[0]!.pose)
      : [
          "Root",
          "Hips",
          "Spine",
          "Chest",
          "Neck",
          "Head",
          ...["Left", "Right"].flatMap((s) => [
            s + "Shoulder",
            s + "UpperArm",
            s + "LowerArm",
            s + "Hand",
            s + "UpperLeg",
            s + "LowerLeg",
            s + "Foot",
          ]),
        ];
    const tracks: T.KeyframeTrack[] = joints.map(
      (joint) =>
        new T.QuaternionKeyframeTrack(
          joint + ".quaternion",
          times,
          samples.flatMap(({ pose }) =>
            new T.Quaternion().setFromEuler(new T.Euler(...(pose[joint] ?? [0, 0, 0]))).toArray(),
          ),
        ),
    );
    tracks.push(
      new T.VectorKeyframeTrack(
        explorer ? "Body.position" : "Hips.position",
        times,
        samples.flatMap(({ dip, pose }) => [
          0,
          explorer
            ? name === "JumpAnticipation" || name === "JumpLand"
              ? explorerSupportY(pose)
              : dip / EXPLORER_SCALE
            : 0.72 + dip,
          0,
        ]),
      ),
    );
    if (!explorer)
      tracks.push(
        new T.VectorKeyframeTrack("Chest.position", [0, duration], [0, 0.21, 0, 0, 0.21, 0]),
      );
    return new T.AnimationClip(name, duration, tracks);
  });
  cache.set(explorer, clips);
  return clips;
}
