import * as T from "three";
import { DANCES } from "./model.ts";
let sharedClips: T.AnimationClip[] | undefined;
/** Original reusable clips for the existing BaseAvatarV2 skeleton; never animate Root. */
export function createDanceClips(): T.AnimationClip[] {
  return (sharedClips ??= DANCES.map((id, index) => {
    const duration = id === "sway" ? 4 : 2;
    const times = Array.from({ length: 33 }, (_, i) => (i * duration) / 32);
    const tracks: T.KeyframeTrack[] = [];
    const joints = [
      "Hips",
      "Spine",
      "Chest",
      "Head",
      "LeftUpperArm",
      "RightUpperArm",
      "LeftLowerArm",
      "RightLowerArm",
      "LeftUpperLeg",
      "RightUpperLeg",
      "LeftLowerLeg",
      "RightLowerLeg",
    ];
    for (const joint of joints) {
      const sign = joint.startsWith("Left") ? 1 : -1;
      const values = times.flatMap((t) => {
        const phase = (t / duration) * Math.PI * 2;
        const beat = Math.sin(phase),
          alternate = Math.cos(phase);
        let x = 0,
          y = 0,
          z = 0;
        if (joint === "Hips") {
          y = beat * (id === "salsa" ? 0.35 : 0.1);
          z = beat * 0.07;
        }
        if (joint === "Chest") {
          y = -beat * 0.15;
          z = alternate * 0.06;
        }
        if (joint === "Head") x = beat * 0.07;
        if (joint.endsWith("UpperLeg")) {
          x = sign * beat * (id === "shuffle" ? 0.5 : 0.16);
          z = sign * 0.04;
        }
        if (joint.endsWith("LowerLeg")) x = Math.max(0, -sign * beat) * 0.3;
        if (joint.endsWith("UpperArm")) {
          if (id === "bounce") {
            x = -0.4 + beat * 0.25;
            z = sign * 0.3;
          }
          if (id === "step") {
            x = -sign * beat * 0.6;
            z = sign * 0.15;
          }
          if (id === "disco") {
            x = sign * beat * 0.3;
            z = sign * (1.1 + alternate * 0.9);
          }
          if (id === "wave") {
            x = alternate * 0.2;
            z = sign * (1.8 + Math.sin(phase + sign) * 0.5);
          }
          if (id === "shuffle") {
            x = sign * beat * 0.5;
            z = sign * 0.4;
          }
          if (id === "sway") {
            x = -0.15;
            z = sign * (0.65 + beat * 0.35);
          }
          if (id === "robot") {
            x = Math.round(beat * 2) * 0.35;
            z = sign * 0.9;
          }
          if (id === "salsa") {
            x = -0.6 + sign * beat * 0.3;
            z = sign * 0.7;
          }
        }
        if (joint.endsWith("LowerArm")) x = -0.5 - Math.sin(phase + index * 0.5 + sign) * 0.35;
        return new T.Quaternion().setFromEuler(new T.Euler(x, y, z)).toArray();
      });
      tracks.push(new T.QuaternionKeyframeTrack(`${joint}.quaternion`, times, values));
    }
    tracks.push(
      new T.VectorKeyframeTrack(
        "Hips.position",
        times,
        times.flatMap((t) => [
          0,
          0.72 + Math.sin((t / duration) * Math.PI * 4) * (id === "bounce" ? 0.055 : 0.018),
          0,
        ]),
      ),
    );
    return new T.AnimationClip(`Dance_${id}`, duration, tracks);
  }));
}
