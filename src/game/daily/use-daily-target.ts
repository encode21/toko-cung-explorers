import { useWorldEditor } from "@/game/editor/store";
import { dailyGiver, resolveDailyObjective, useDaily } from "./store";
import { dailyStep, type DailyObjective } from "./types";

/** One tracked step drives HUD, ground arrows, pulse and interaction. */
export function useDailyTarget() {
  const data = useDaily((s) => s.data);
  const tracked = useDaily((s) => s.tracked);
  const npcId = useDaily((s) => s.npcId);
  useWorldEditor((s) => s.saved);
  const quest = data?.quests.find(
    (q) => q.id === tracked && ["ACTIVE", "CLAIMABLE"].includes(q.status),
  );
  if (!quest) return null;
  const claim = quest.status === "CLAIMABLE";
  const giver = dailyGiver(npcId);
  const step = dailyStep(quest);
  const raw: DailyObjective | undefined = claim
    ? giver
      ? {
          type: "TALK",
          required: 1,
          label: "Ambil hadiah",
          targetId: giver.id,
          position: [giver.position.x, giver.position.y, giver.position.z],
          radius: giver.radius,
        }
      : undefined
    : step.objective;
  const objective = raw ? resolveDailyObjective(raw) : undefined;
  return { quest, index: step.index, objective, claim };
}
