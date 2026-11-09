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
  if (state.completed || !Number.isInteger(reached) || reached < 1 || reached > 5) return state;
  if (reached === 5) return state.checkpoint === 4 ? { ...state, completed: true } : state;
  return reached === state.checkpoint + 1 ? { ...state, checkpoint: reached } : state;
}
