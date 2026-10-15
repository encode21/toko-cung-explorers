import { isDungeonRoom, useDungeon } from "@/game/dungeon/store";
import { useSecretQuest } from "@/game/secret/store";
import { useGame } from "@/state/game-store";
import { command, useGameCore } from "./store";
import type { GameSnapshot } from "./types";

/** Prevents busy→idle effect loops from re-firing a failed complete. */
let inFlightRunId: string | null = null;

/** Active run has every objective at/above required count. */
export function questRunReadyToComplete(snapshot: GameSnapshot | null = useGameCore.getState().snapshot) {
  const run = snapshot?.active;
  if (!run || !["ACTIVE", "ACCEPTED"].includes(run.status)) return false;
  const quest = snapshot.quests.find((q) => q.id === run.quest_id);
  if (!quest?.objectives.length) return false;
  return quest.objectives.every((objective, index) => (run.progress[index] ?? 0) >= objective.required);
}

/**
 * Claim completion without the ✓ turn-in prompt.
 * Waits while dialogue/secret UI is open so reward does not fight those overlays.
 */
export function tryAutoCompleteQuest() {
  const run = useGameCore.getState().snapshot?.active;
  if (!run || !questRunReadyToComplete()) {
    inFlightRunId = null;
    return;
  }
  const core = useGameCore.getState();
  if (core.busy || core.pending || inFlightRunId === run.id) return;
  if (isDungeonRoom() || useDungeon.getState().data?.instance) return;
  if (useGame.getState().overlay !== "none") return;
  if (useSecretQuest.getState().open) return;
  inFlightRunId = run.id;
  void command("complete").then((result) => {
    if (!result.ok && inFlightRunId === run.id) inFlightRunId = null;
  });
}
