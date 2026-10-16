import * as T from "three";
import { DANCES, type DanceId } from "./model.ts";

type V = [number, number, number];
const cache = new Map<boolean, T.AnimationClip[]>();
const SCALE = 1.74 / 2.45;
const TAU = Math.PI * 2;
/** Four-beat phrases. IDs stay stable for existing multiplayer dance messages. */
export const DANCE_BPM: Record<DanceId, number> = {
  bounce: 118,
  step: 116,
  disco: 120,
  wave: 108,
  shuffle: 128,
  sway: 132,
  robot: 112,
  salsa: 124,
};
const quat = (v: V) => new T.Quaternion().setFromEuler(new T.Euler(...v));
const positive = (v: number) => Math.max(0, v);
// Rounded accents retain a short hold without a discontinuous joint snap.
const accent = (v: number) => Math.tanh(2.4 * v) / Math.tanh(2.4);

/** Full-body choreography in anatomical coordinates: opposite arms counter the steps.
 * The rigid Explorer has reversed left/right X positions and no separate pelvis/spine.
 * Every pose is periodic; elbows/wrists trail shoulders instead of moving in lockstep. */
function poseAt(id: DanceId, phase: number, explorer: boolean) {
  const pose: Record<string, V> = {};
  const sway = Math.sin(phase);
  const beat = Math.sin(phase * 2);
  const pulse = (1 - Math.cos(phase * 4)) / 2;
  let turn = 0.18 * sway,
    lean = 0.06 * Math.sin(phase - 0.3),
    pitch = 0.04;
  let dip = 0.16 + 0.2 * pulse;
  if (id === "bounce") {
    dip = 0.22 + 0.5 * pulse;
    pitch = 0.1 + 0.15 * pulse;
    turn = 0.28 * sway;
  }
  if (id === "step") {
    turn = 0.24 * sway;
    lean = 0.09 * sway;
  }
  if (id === "disco") {
    turn = 0.32 * sway;
    lean = 0.13 * sway;
  }
  if (id === "wave") {
    pitch = 0.18 * Math.sin(phase * 2 - 0.65);
    dip = 0.24 + (0.32 * (1 + Math.sin(phase * 2 - 1))) / 2;
  }
  if (id === "shuffle") {
    dip = 0.2 + 0.18 * pulse;
    pitch = 0.1;
    turn = 0.14 * beat;
  }
  if (id === "sway") {
    // Continuous shoulder roll: weight leads the torso, then elbows and wrists follow.
    turn = 0.18 * Math.sin(phase * 2 - 0.5);
    lean = 0.23 * Math.sin(phase * 2 - 0.25);
    pitch = 0.04 + 0.085 * Math.cos(phase * 2 - 0.6);
    dip = 0.28 + 0.16 * (1 - Math.cos(phase * 4 - 0.55));
  }
  if (id === "robot") {
    turn = 0.32 * accent(sway);
    lean = 0.06 * accent(beat);
    dip = 0.22 + 0.18 * pulse;
  }
  if (id === "salsa") {
    turn = 0.34 * sway;
    lean = 0.09 * Math.sin(phase + 0.4);
    dip = 0.2 + 0.22 * pulse;
  }
  if (explorer) pose["Body"] = [pitch, turn, lean];
  else {
    pose["Hips"] = [0, turn * 0.55, lean * 0.35];
    pose["Spine"] = [pitch * 0.4, turn * 0.15, lean * 0.25];
    pose["Chest"] = [pitch * 0.6, turn * 0.3, lean * 0.4];
  }
  pose["Head"] = [-pitch * 0.5 + 0.045 * Math.sin(phase * 4 - 0.35), -turn * 0.4, -lean * 0.5];
  for (const [side, sideIndex] of [
    ["Left", 1],
    ["Right", -1],
  ] as const) {
    const sign = explorer ? -sideIndex : sideIndex;
    const p = phase + (sideIndex === 1 ? 0 : Math.PI);
    const swing = Math.sin(p),
      delayed = Math.sin(p - 0.55);
    let arm: V = [-0.55 + 0.45 * swing, 0.16 * swing, sign * 0.35];
    let elbow: V = [-0.9 + 0.35 * delayed, 0, 0];
    let wrist: V = [0.12 * Math.sin(p - 0.9), 0.12 * delayed, sign * 0.12 * delayed];
    let stride = 0.16 * swing,
      lift = 0.24 * positive(swing),
      spread = 0.07;
    switch (id) {
      case "bounce":
        arm = [
          -0.85 + 0.65 * Math.sin(phase * 2 - 0.3),
          sideIndex * 0.2 * sway,
          sign * (0.4 + 0.22 * pulse),
        ];
        elbow = [-0.95 - 0.5 * Math.sin(phase * 2 - 0.7), 0, 0];
        stride = 0.1 * swing;
        lift = 0.1 * positive(swing);
        spread = 0.15;
        break;
      case "step":
        arm = [-0.6 - 0.65 * swing, sideIndex * 0.18, sign * (0.35 + 0.25 * positive(-swing))];
        elbow = [-0.85 + 0.5 * delayed, 0, 0];
        stride = 0.32 * swing;
        lift = 0.42 * positive(swing);
        spread = 0.12 + 0.08 * swing;
        break;
      case "disco": {
        const reach = (1 + Math.sin(p)) / 2;
        arm = [-0.3 - 1.65 * reach, -sideIndex * 0.25, sign * (0.35 + 0.95 * reach)];
        elbow = [-0.85 + 0.7 * reach, 0, 0];
        wrist = [0, 0.15 * delayed, sign * 0.2];
        stride = 0.18 * swing;
        spread = 0.14;
        break;
      }
      case "wave":
        arm = [
          -0.65 - 0.55 * Math.sin(p - 0.15),
          0.3 * Math.sin(p),
          sign * (1.0 + 0.6 * Math.sin(p)),
        ];
        elbow = [-0.8 - 0.65 * Math.sin(p - 0.8), 0, sideIndex * 0.15 * delayed];
        wrist = [0.35 * Math.sin(p - 1.5), 0, sign * 0.45 * Math.sin(p - 1.2)];
        stride = 0.12 * swing;
        spread = 0.13;
        break;
      case "shuffle":
        arm = [-0.55 - 0.65 * swing, 0, sign * 0.32];
        elbow = [-0.85 + 0.4 * delayed, 0, 0];
        stride = 0.48 * swing;
        lift = 0.62 * positive(swing);
        spread = 0.04 + 0.1 * Math.sin(p * 2);
        break;
      case "sway": {
        // Bent-elbow circular groove rather than a locked shoulder/elbow punch.
        const groove = phase * 2 + (sideIndex === 1 ? 0 : Math.PI);
        const shoulder = Math.sin(groove);
        const follow = Math.sin(groove - 0.55);
        arm = [
          -0.48 - 0.3 * shoulder,
          sign * (0.12 + 0.24 * Math.cos(groove - 0.25)),
          sign * (0.28 + 0.2 * Math.cos(groove)),
        ];
        elbow = [-1.12 - 0.38 * follow, sign * 0.12 * Math.cos(groove - 0.55), 0];
        wrist = [
          0.24 * Math.sin(groove - 1.05),
          sign * 0.2 * Math.cos(groove - 0.85),
          sign * 0.16 * follow,
        ];
        const step = Math.sin(groove - 0.35);
        stride = 0.09 * step;
        // Squared half-wave enters/exits the lifted step with zero velocity.
        lift = 0.2 * positive(step) ** 2;
        spread = 0.035 + 0.025 * step;
        break;
      }
      case "robot":
        arm = [
          -0.8 + 0.55 * accent(swing),
          sideIndex * 0.25 * accent(beat),
          sign * (0.75 + 0.25 * accent(beat)),
        ];
        elbow = [-1.1 + 0.65 * accent(Math.sin(p - 0.45)), 0, 0];
        wrist = [0.45 * accent(Math.sin(p - 0.9)), 0, sign * 0.35 * accent(beat)];
        stride = 0.18 * accent(swing);
        lift = 0.28 * positive(swing);
        break;
      case "salsa":
        arm = [
          -0.65 - 0.6 * swing,
          sideIndex * 0.25 * delayed,
          sign * (0.5 + 0.25 * Math.sin(p - 0.3)),
        ];
        elbow = [-1.05 + 0.5 * Math.sin(p - 0.55), 0, 0];
        stride = 0.34 * swing;
        lift = 0.38 * positive(swing);
        spread = 0.08 + 0.12 * swing;
        break;
    }
    const knee = dip + lift;
    pose[side + (explorer ? "Arm" : "UpperArm")] = arm;
    pose[side + (explorer ? "Elbow" : "LowerArm")] = elbow;
    pose[side + (explorer ? "Wrist" : "Hand")] = wrist;
    // Opposing thigh/shin rotations lower the pelvis and absorb the beat.
    pose[side + (explorer ? "Leg" : "UpperLeg")] = [
      -knee * 0.55 + stride,
      0.1 * swing,
      sign * spread,
    ];
    pose[side + (explorer ? "Knee" : "LowerLeg")] = [knee, 0, 0];
    if (!explorer) pose[side + "Foot"] = [-knee * 0.45 - stride, 0, 0];
  }
  return pose;
}

/** Lowest shoe corner in rig coordinates. Ground the support foot in the clip itself,
 * including on mobile and the rigid Explorer (which has no ankle joint).
 * This moves the visual pelvis only, never the physics/network player root. */
function supportHeight(pose: Record<string, V>, explorer: boolean, flowing = false) {
  const bodyQ = quat(pose[explorer ? "Body" : "Hips"]!);
  let lowest = Infinity;
  const heights: number[] = [];
  for (const [side, baseSign] of [
    ["Left", 1],
    ["Right", -1],
  ] as const) {
    const sign = explorer ? -baseSign : baseSign;
    const thighQ = quat(pose[side + (explorer ? "Leg" : "UpperLeg")]!);
    const shinQ = quat(pose[side + (explorer ? "Knee" : "LowerLeg")]!);
    const footQ = explorer ? new T.Quaternion() : quat(pose[side + "Foot"]!);
    for (const x of [-1, 1])
      for (const z of [-1, 1]) {
        const point = explorer
          ? new T.Vector3(x * 0.14, -0.48, 0.07 + z * 0.22)
          : new T.Vector3(x * 0.092, -0.105, 0.038 + z * 0.145);
        point.applyQuaternion(footQ);
        if (!explorer) point.y -= 0.3;
        point.applyQuaternion(shinQ);
        point.y -= explorer ? 0.43 : 0.325;
        point.applyQuaternion(thighQ);
        point.add(new T.Vector3(sign * (explorer ? 0.175 : 0.105), explorer ? 0.94 : 0.01, 0));
        point.applyQuaternion(bodyQ);
        lowest = Math.min(lowest, point.y);
        heights.push(point.y);
      }
  }
  // Smooth the support handoff instead of changing pelvis velocity at the min cusp.
  // Soft minimum stays conservatively above the floor (under 1.3cm added clearance).
  if (flowing)
    return (
      -lowest +
      0.006 * Math.log(heights.reduce((sum, y) => sum + Math.exp((lowest - y) / 0.006), 0))
    );
  return -lowest;
}

export function createDanceClips(explorer = false): T.AnimationClip[] {
  const existing = cache.get(explorer);
  if (existing) return existing;
  const clips = DANCES.map((id) => {
    const duration = 240 / DANCE_BPM[id];
    const count = 128;
    const times = Array.from({ length: count + 1 }, (_, i) => (i * duration) / count);
    const samples = times.map((_, i) => poseAt(id, ((i % count) / count) * TAU, explorer));
    // Reset all base joints also animated by emotes so changing actions cannot leave a stale pose.
    const joints = explorer
      ? Object.keys(samples[0]!)
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
          samples.flatMap((pose) => quat(pose[joint] ?? [0, 0, 0]).toArray()),
        ),
    );
    tracks.push(
      new T.VectorKeyframeTrack(
        explorer ? "Body.position" : "Hips.position",
        times,
        samples.flatMap((pose, i) => {
          const phase = ((i % count) / count) * TAU;
          return [
            (id === "sway" ? 0.085 * Math.sin(phase * 2 + 0.15) : 0.035 * Math.sin(phase)) /
              (explorer ? SCALE : 1),
            supportHeight(pose, explorer, id === "sway"),
            id === "sway" ? (0.018 * Math.cos(phase * 2 - 0.2)) / (explorer ? SCALE : 1) : 0,
          ];
        }),
      ),
    );
    return new T.AnimationClip("Dance_" + id, duration, tracks);
  });
  cache.set(explorer, clips);
  return clips;
}
