import { AMBIENT_PROFILES, type AmbientProfile } from "./ambient-profiles";
/** Deterministic, allocation-free ambient behavior; no events or navigation service. */
export type NpcState = "IDLE" | "WALK" | "WORK" | "INTERACT" | "TALK" | "RETURN";
export interface AmbientState {
  state: NpcState;
  target: number;
  direction: number;
  left: number;
  seed: number;
  talking: boolean;
}
export function createBehavior(seed: number): AmbientState {
  return {
    state: "IDLE",
    target: 0,
    direction: 1,
    left: 2 + (seed % 61) / 10,
    seed,
    talking: false,
  };
}
export function pauseDuration(s: AmbientState, profile?: AmbientProfile) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  const [min, max] = profile ? AMBIENT_PROFILES[profile].pause : [2, 8];
  return min + ((s.seed % 600) / 600) * (max - min);
}
/** Returns true while conversation or its return delay owns movement. */
export function conversationStep(s: AmbientState, talking: boolean, dt: number) {
  if (talking) {
    s.talking = true;
    s.state = "TALK";
    return true;
  }
  if (s.talking) {
    s.talking = false;
    s.state = "RETURN";
    s.left = 1.5;
  }
  if (s.state === "RETURN") {
    s.left -= dt;
    if (s.left <= 0) s.state = "WALK";
    return true;
  }
  return false;
}
export function turnToward(current: number, target: number, dt: number) {
  return (
    current +
    Math.atan2(Math.sin(target - current), Math.cos(target - current)) * (1 - Math.exp(-5 * dt))
  );
}
