import type { GameSnapshot, Objective } from "./types";
import type { DungeonResponse } from "@/game/dungeon/types";

export type GuidanceTarget = {
  objective: Objective | null;
  position: [number, number, number];
  realm: "WORLD" | "DUNGEON";
};

/** Only the current step is revealed; dungeon progress takes precedence. */
export function questGuidanceTarget(
  snapshot: GameSnapshot | null,
  dungeon: DungeonResponse | null,
): GuidanceTarget | null {
  const instance = dungeon?.instance;
  if (instance && dungeon) {
    if (instance.status !== "ACTIVE") return null;
    const realm = instance.realm ?? "DUNGEON";
    const objective = dungeon.config.objectives.find(
      (o, n) => (instance.progress[n] ?? 0) < o.required,
    );
    if (!objective) return null;
    if ((objective.realm ?? "DUNGEON") !== realm) {
      return {
        objective: null,
        position:
          realm === "WORLD"
            ? dungeon.config.entrance
            : (dungeon.config.worldExit ?? dungeon.config.spawn),
        realm,
      };
    }
    const position = objective.positions
      ? objective.positions.find((_, n) => !instance.found.includes(`clue-${n}`))
      : objective.position;
    return position
      ? {
          objective: objective.positions ? null : objective,
          position,
          realm,
        }
      : null;
  }
  const run = snapshot?.active;
  if (!run || (run.status !== "ACTIVE" && run.status !== "ACCEPTED")) return null;
  const quest = snapshot?.quests.find((q) => q.id === run.quest_id);
  const objective = quest?.objectives.find((o, n) => (run.progress[n] ?? 0) < o.required);
  if (!objective || (quest?.dungeon_id && objective.realm !== "WORLD")) return null;
  if (objective.realm === "DUNGEON") return null;
  return { objective, position: objective.position, realm: "WORLD" };
}
