import { interactableById } from "@/game/interactions/interactables";
import type { Objective } from "@/game/core/types";
import { useWorldEditor, type WorldTarget } from "./store";

function publishedTargets(): WorldTarget[] {
  const s = useWorldEditor.getState();
  // Editor draft follows the gizmo immediately; players use last saved registry.
  if (s.mode === "EDITOR" && s.targets.length) return s.targets;
  try {
    return JSON.parse(s.saved || "[]") as WorldTarget[];
  } catch {
    return s.targets;
  }
}

/** Prefer live world-target registry, then moving NPC interactables. */
export function resolveObjective(o: Objective): Objective {
  if (o.targetId) {
    const t = publishedTargets().find((x) => x.id === o.targetId && x.active);
    if (t) {
      return {
        ...o,
        position: [t.position.x, t.position.y, t.position.z],
        radius: t.radius || o.radius || 2,
        target: t.entityId || t.id,
        targetType: t.type,
      };
    }
  }
  if (o.targetType === "NPC") {
    const actor = interactableById(o.target);
    return actor ? { ...o, position: [...actor.position] } : o;
  }
  return o;
}
