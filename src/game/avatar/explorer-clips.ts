import * as T from "three";
import { EXPLORER_SCALE } from "./explorer-rig.ts";

/** Explicit rigid-pivot adaptation of existing gameplay poses; original Idle/Walk stay untouched. */
export function explorerClips(original: T.AnimationClip[], poses: T.AnimationClip[]) {
  const mapping: Record<string, string> = {
    Chest: "Body",
    Head: "Head",
    LeftUpperArm: "LeftArm",
    RightUpperArm: "RightArm",
    LeftLowerArm: "LeftElbow",
    RightLowerArm: "RightElbow",
    LeftUpperLeg: "LeftLeg",
    RightUpperLeg: "RightLeg",
    LeftLowerLeg: "LeftKnee",
    RightLowerLeg: "RightKnee",
  };
  const adapted = poses
    .filter((c) => !["Idle", "Walk", "Run"].includes(c.name))
    .map((clip) => {
      const tracks: T.KeyframeTrack[] = [];
      for (const track of clip.tracks) {
        const [node, property] = track.name.split(".");
        if (property === "quaternion" && mapping[node!]) {
          const copy = track.clone();
          copy.name = `${mapping[node!]}.quaternion`;
          tracks.push(copy);
        } else if (track.name === "Hips.position") {
          const copy = track.clone();
          copy.name = "Body.position";
          for (let i = 0; i < copy.values.length; i += 3) {
            copy.values[i] = 0;
            copy.values[i + 1] = (copy.values[i + 1]! - 0.72) / EXPLORER_SCALE;
            copy.values[i + 2] = 0;
          }
          tracks.push(copy);
        }
      }
      return new T.AnimationClip(clip.name, clip.duration, tracks);
    });
  const carry = adapted.find((c) => c.name === "CarryBox");
  if (carry)
    for (const name of ["Idle", "Walk"]) {
      const clip = original.find((c) => c.name === name)!;
      const arms = carry.tracks.filter((t) => /Arm|Elbow/.test(t.name));
      adapted.push(
        new T.AnimationClip(`Carry${name}`, clip.duration, [
          ...clip.tracks.filter((t) => !/Arm|Elbow/.test(t.name)),
          ...arms,
        ]),
      );
    }
  return [...original, ...adapted];
}
