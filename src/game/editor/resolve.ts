import { interactableById } from "@/game/interactions/interactables";
import type { Objective } from "@/game/core/types";
/** Moving NPCs are addressed by entity identity; their spawn is never a proximity target. */
export function resolveObjective(o: Objective): Objective {
  if (o.targetType !== "NPC") return o;
  const actor = interactableById(o.target);
  return actor ? { ...o, position: [...actor.position] } : o;
}
