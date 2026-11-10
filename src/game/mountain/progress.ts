import { MOUNTAIN_CHECKPOINT_COUNT, MOUNTAIN_SUMMIT_ID } from "./model.ts";

/** Session-only hiking progress, independent of currency and server quest rewards. */
export interface MountainProgress {
  checkpoint: number;
  completed: boolean;
}
export const emptyMountainProgress = (): MountainProgress => ({ checkpoint: 0, completed: false });
export function advanceMountainProgress(
  state: MountainProgress,
  reached: number,
): MountainProgress {
  if (state.completed || !Number.isInteger(reached) || reached < 1 || reached > MOUNTAIN_SUMMIT_ID)
    return state;
  if (reached === MOUNTAIN_SUMMIT_ID)
    return state.checkpoint === MOUNTAIN_CHECKPOINT_COUNT ? { ...state, completed: true } : state;
  return reached === state.checkpoint + 1 ? { ...state, checkpoint: reached } : state;
}
