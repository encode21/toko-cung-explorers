import { useQuestCompletion } from "@/game/core/completion-store";
import { useDungeonDialogue } from "@/game/dungeon/dialogue-store";
import type { DungeonResponse } from "./types";

/** Instance ids already shown so resume/poll of a cleared run does not re-fire. */
const announced = new Set<string>();

/**
 * GTA-style Mission Passed for Principal Dungeon — same overlay as ordinary quests.
 * Call when instance transitions ACTIVE → COMPLETED.
 */
export function announceDungeonComplete(
  prevStatus: string | undefined,
  data: Pick<DungeonResponse, "config" | "instance" | "game">,
): boolean {
  const instance = data.instance;
  const config = data.config;
  if (!instance || !config || instance.status !== "COMPLETED") return false;
  if (announced.has(instance.id)) return false;
  // Only celebrate a live clear — not resume/read of an already-finished run.
  if (prevStatus !== "ACTIVE") {
    announced.add(instance.id);
    return false;
  }
  announced.add(instance.id);
  const reward = data.game?.history.find((r) => r.quest_id === config.questId);
  useDungeonDialogue.getState().close();
  useQuestCompletion.getState().show({
    title: config.questTitle ?? config.title ?? "Principal Dungeon",
    durationSeconds: reward?.duration_seconds ?? 0,
    xpAwarded: reward?.xp_awarded ?? config.reward.xp,
    clueXp: 0,
    pointAwarded: reward?.point_awarded ?? config.reward.point,
    theme: "principal-dungeon",
  });
  return true;
}
