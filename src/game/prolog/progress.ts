import type { PrologData, PrologStep } from "./types";

// The configured world-prolog steps, excluding the terminal "done" state.
const PROLOG_STEPS: Partial<Record<number, readonly PrologStep[]>> = {
  1: ["meet", "book", "reveal", "map", "path", "goal", "finish"],
  2: [
    "wake",
    "window",
    "box",
    "phone",
    "gang",
    "reveal",
    "map",
    "koko",
    "path",
    "goal",
    "return",
    "sleep",
  ],
};

/** Read the current step number and completed count from the server snapshot. */
export function prologProgress(
  data: PrologData | null,
): { current: number; completed: number; total: number } | null {
  if (!data?.enabled) return null;
  const steps = PROLOG_STEPS[data.version];
  if (!steps) return null;
  const total = steps.length;
  if (data.step === "done") return { current: total, completed: total, total };
  const index = steps.indexOf(data.step);
  if (index === -1) return null;
  const completed = data.completedAt ? total : index;
  return { current: Math.min(completed + 1, total), completed, total };
}
