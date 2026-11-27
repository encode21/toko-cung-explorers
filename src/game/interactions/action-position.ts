import { useGame, type NearbyTarget } from "@/state/game-store";
import { interactableById } from "./interactables";
import { remoteStates } from "@/net/useWorldChannel";
import { missionInteraction } from "@/game/missions/runtime";
import { BENCH_SEATS } from "@/game/world/street-props";
import { isStoreInterior } from "@/game/world/layout";
import type { ActionPosition } from "./action-projection";

/** Resolve each frame so a prompt follows its actor, not the player's previous location. */
export function nearbyActionPosition(target: NearbyTarget): ActionPosition | null {
  if (target.kind === "player") {
    const actor = remoteStates.get(target.id);
    return actor ? [actor.x, actor.y + 1.5, actor.z] : null;
  }
  if (target.kind === "mission") {
    const mission = missionInteraction();
    return mission?.id === target.id
      ? [mission.position[0], mission.position[1] + 1.6, mission.position[2]]
      : null;
  }
  const actor = interactableById(target.id) ?? BENCH_SEATS.find((b) => b.id === target.id);
  if (!actor) return null;
  const height = target.kind === "bench" ? 1.2 : target.kind === "npc" ? 2.25 : 1.9;
  return [actor.position[0], actor.position[1] + height, actor.position[2]];
}

/** Recheck physical proximity when a rendered generic action is pressed. */
export function nearbyActionAvailable(target: NearbyTarget): boolean {
  const { playerPos: p, inside } = useGame.getState();
  if (target.kind === "player") {
    const actor = remoteStates.get(target.id);
    return (
      !!actor &&
      (inside || !isStoreInterior(actor.x, actor.y, actor.z)) &&
      Math.hypot(p[0] - actor.x, p[2] - actor.z) < 2.4 &&
      Math.abs(p[1] - actor.y) <= 2
    );
  }
  const actor = interactableById(target.id) ?? BENCH_SEATS.find((b) => b.id === target.id);
  return (
    !!actor &&
    (inside || !isStoreInterior(...actor.position)) &&
    Math.hypot(p[0] - actor.position[0], p[2] - actor.position[2]) < actor.radius &&
    Math.abs(p[1] - 0.83 - actor.position[1]) <= 1.8
  );
}
