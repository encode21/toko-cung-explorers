import * as T from "three";
import { DANCES } from "./model.ts";
const cache = new Map<boolean, T.AnimationClip[]>();
/** Small planted steps, continuous curves and counter-rotation; no root translation. */
export function createDanceClips(explorer = false): T.AnimationClip[] {
  if (cache.has(explorer)) return cache.get(explorer)!;
  const clips = DANCES.map((id, index) => {
    const duration = id === "sway" ? 4 : 3.2;
    const times = Array.from({ length: 65 }, (_, i) => i * duration / 64);
    const joints = explorer
      ? ["Body", "Head", "RightArm", "LeftArm", "RightElbow", "LeftElbow", "RightWrist", "LeftWrist", "RightLeg", "LeftLeg", "RightKnee", "LeftKnee"]
      : ["Chest", "Head", "LeftUpperArm", "RightUpperArm", "LeftLowerArm", "RightLowerArm", "LeftHand", "RightHand", "LeftUpperLeg", "RightUpperLeg", "LeftLowerLeg", "RightLowerLeg"];
    const tracks: T.KeyframeTrack[] = joints.map((joint, j) => new T.QuaternionKeyframeTrack(
      joint + ".quaternion", times, times.flatMap(t => {
        const phase = t / duration * Math.PI * 2;
        const beat = Math.sin(phase), counter = Math.sin(phase + 0.4);
        const side = j % 2 === 0 ? 1 : -1;
        let x = 0, y = 0, z = 0;
        if (j === 0) { y = beat * 0.045; z = counter * 0.025; x = Math.sin(phase * 2) * 0.018; }
        if (j === 1) { x = Math.sin(phase * 2 - 0.25) * 0.055; y = -beat * 0.05; }
        if (j === 2 || j === 3) {
          const poses: Record<string, number[]> = {
            bounce: [-0.35 + counter * 0.2, side * (0.3 + 0.08 * beat)],
            step: [-0.3 + side * beat * 0.3, side * 0.28],
            disco: [-0.25 + side * beat * 0.2, side * (0.9 + 0.65 * Math.sin(phase + side))],
            wave: [-0.2, side * (1.65 + 0.28 * Math.sin(phase + side * 0.7))],
            shuffle: [-0.3 + side * beat * 0.35, side * 0.35],
            sway: [-0.25, side * (0.6 + beat * 0.22)],
            robot: [-0.5 + Math.tanh(2 * beat) * 0.22, side * 0.85],
            salsa: [-0.55 + side * counter * 0.23, side * (0.6 + beat * 0.14)],
          };
          [x, z] = poses[id] as [number, number];
        }
        if (j === 4 || j === 5) x = -0.65 + Math.sin(phase + side * 0.65 + index * 0.3) * 0.25;
        if (j === 6 || j === 7) { z = side * Math.sin(phase + side) * 0.16; y = beat * 0.12; }
        // Knees absorb a restrained bounce; no sweeping planted feet through the floor.
        if (j === 8 || j === 9) x = -0.04 + side * beat * (id === "shuffle" ? 0.12 : 0.045);
        if (j === 10 || j === 11) x = 0.07 + (1 + Math.sin(phase + side)) * 0.025;
        return new T.Quaternion().setFromEuler(new T.Euler(x, y, z)).toArray();
      }),
    ));
    tracks.push(new T.VectorKeyframeTrack(explorer ? "Body.position" : "Hips.position", times,
      times.flatMap(t => {
        const bob = -0.015 * (1 - Math.cos(t / duration * Math.PI * 4));
        return [0, explorer ? bob / (1.74 / 2.45) : 0.72 + bob, 0];
      })));
    return new T.AnimationClip("Dance_" + id, duration, tracks);
  });
  cache.set(explorer, clips);
  return clips;
}
