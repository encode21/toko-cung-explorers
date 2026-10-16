import * as T from "three";

export const FLIGHT_ANIMATIONS = ["FlightHover", "FlightForward"] as const;
export type FlightAnimation = (typeof FLIGHT_ANIMATIONS)[number];
export const isFlightAnimation = (name: string | undefined): name is FlightAnimation =>
  name === "FlightHover" || name === "FlightForward";
/** Vertical input wins over horizontal movement: ascent/descent stays upright. */
export function flightAnimation(horizontal: number, vertical: number): FlightAnimation {
  return Math.abs(vertical) > 0.01 || horizontal < 0.15 ? "FlightHover" : "FlightForward";
}
const cache = new Map<boolean, T.AnimationClip[]>();
export function createFlightClips(explorer = false) {
  const cached = cache.get(explorer);
  if (cached) return cached;
  const clips = FLIGHT_ANIMATIONS.map((name) => {
    const forward = name === "FlightForward",
      pitch = forward ? 1.48 : 0;
    const joints: Record<string, [number, number, number]> = explorer
      ? { Body: [pitch, 0, 0], Head: [forward ? -1.05 : 0, 0, 0] }
      : {
          Root: [0, 0, 0],
          Hips: [pitch, 0, 0],
          Spine: [0, 0, 0],
          Chest: [0, 0, 0],
          Neck: [0, 0, 0],
          Head: [forward ? -1.05 : 0, 0, 0],
        };
    for (const [side, sign] of [
      ["Left", 1],
      ["Right", -1],
    ] as const) {
      const spread = sign * (explorer ? -1 : 1);
      if (!explorer) joints[side + "Shoulder"] = [0, 0, 0];
      joints[side + (explorer ? "Arm" : "UpperArm")] = [
        forward ? -2.95 : 0,
        0,
        spread * (forward ? 0.08 : 0.14),
      ];
      joints[side + (explorer ? "Elbow" : "LowerArm")] = [-0.08, 0, 0];
      joints[side + (explorer ? "Wrist" : "Hand")] = [0, 0, 0];
      joints[side + (explorer ? "Leg" : "UpperLeg")] = [0, 0, spread * 0.055];
      joints[side + (explorer ? "Knee" : "LowerLeg")] = [forward ? 0.08 : 0, 0, 0];
      if (!explorer) joints[side + "Foot"] = [0, 0, 0];
    }
    const tracks: T.KeyframeTrack[] = Object.entries(joints).map(([joint, angles]) => {
      const q = new T.Quaternion().setFromEuler(new T.Euler(...angles)).toArray();
      return new T.QuaternionKeyframeTrack(joint + ".quaternion", [0, 1], [...q, ...q]);
    });
    // Explorer's Body pivots at the soles. Rotate around the hips within the visual rig;
    // the physics/camera/network root remains at the same position and scale.
    const position = explorer
      ? [0, 0.94 * (1 - Math.cos(pitch)), -0.94 * Math.sin(pitch)]
      : [0, 0.72, 0];
    tracks.push(
      new T.VectorKeyframeTrack(
        explorer ? "Body.position" : "Hips.position",
        [0, 1],
        [...position, ...position],
      ),
    );
    if (!explorer)
      tracks.push(new T.VectorKeyframeTrack("Chest.position", [0, 1], [0, 0.21, 0, 0, 0.21, 0]));
    return new T.AnimationClip(name, 1, tracks);
  });
  cache.set(explorer, clips);
  return clips;
}
