import { useWorldEditor } from "@/game/editor/store";
import { resolveDailyObjective, useDaily } from "./store";
import { dailyStep } from "./types";

/** One tracked step drives HUD, ground arrows, pulse and interaction. */
export function useDailyTarget() {
  const data = useDaily((s) => s.data);
  const tracked = useDaily((s) => s.tracked);
  useWorldEditor((s) => s.saved);
  const quest = data?.quests.find((q) => q.id === tracked && q.status === "ACTIVE");
  if (!quest) return null;
  const step = dailyStep(quest);
  const objective = step.objective ? resolveDailyObjective(step.objective) : undefined;
  return { quest, index: step.index, objective, claim: false };
}
