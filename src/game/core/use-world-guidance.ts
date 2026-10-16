import { BEACH_DESTINATION } from "@/game/swimming/model";
import { FISHING_DESTINATION } from "@/game/fishing/model";
import { VENUE_DESTINATIONS } from "@/game/club/venue-layout";
import { useDaily } from "@/game/daily/store";
import { dailyStep } from "@/game/daily/types";
import { useDungeon } from "@/game/dungeon/store";
import { shelfById } from "@/game/world/layout";
import { useGame } from "@/state/game-store";
import { useGameCore } from "./store";
import { questGuidanceTarget, type GuidanceTarget } from "./quest-guidance";
import type { Objective } from "./types";

/** Jelajah / SHOW_WAYPOINT destination → same ground-arrow target shape as quests. */
export function exploreWaypointTarget(waypoint: string | null | undefined): GuidanceTarget | null {
  if (!waypoint) return null;
  const zone =
    shelfById(waypoint) ??
    [...VENUE_DESTINATIONS, BEACH_DESTINATION, FISHING_DESTINATION].find(
      (venue) => venue.id === waypoint,
    );
  if (!zone) return null;
  const [x, y, z] = zone.position;
  if (![x, y, z].every(Number.isFinite)) return null;
  return { objective: null, position: [x, y, z], realm: "WORLD" };
}

/**
 * Ground guidance target.
 * Active dungeon instance keeps quest/dungeon steps; otherwise an explicit Jelajah
 * waypoint wins so explore arrows match the copy in the Jelajah panel.
 */
export function useWorldGuidanceTarget(): GuidanceTarget | null {
  const snapshot = useGameCore((s) => s.snapshot);
  const dungeon = useDungeon((s) => s.data);
  const trackDungeonEntrance = useDungeon((s) => s.tracked);
  const daily = useDaily((s) => s.data);
  const tracked = useDaily((s) => s.tracked);
  const waypoint = useGame((s) => s.waypoint);
  const quest = daily?.quests.find((q) => q.id === tracked && q.status === "ACTIVE");
  const objective = quest ? dailyStep(quest).objective : null;
  const dailyTarget =
    objective?.position && (objective.targetId || objective.navigationTargetId)
      ? {
          objective: {
            ...objective,
            targetId: objective.targetId ?? objective.navigationTargetId,
          } as Objective,
          position: objective.position,
          realm: "WORLD" as const,
        }
      : null;
  const questTarget = questGuidanceTarget(snapshot, dungeon, dailyTarget, trackDungeonEntrance);
  if (dungeon?.instance) return questTarget;
  return exploreWaypointTarget(waypoint) ?? questTarget;
}

/** Stable id so muting one step does not stick after the objective advances. */
export function guidanceIdentity(
  target: GuidanceTarget | null,
  waypoint: string | null,
): string | null {
  if (waypoint) return `wp:${waypoint}`;
  if (!target) return null;
  const [x, , z] = target.position;
  return `${target.realm}:${Math.round(x * 10)}:${Math.round(z * 10)}:${target.objective?.target ?? ""}`;
}

/** True when ground arrows or a Jelajah waypoint destination is active. */
export function useGuidanceActive() {
  const waypoint = useGame((s) => s.waypoint);
  const muted = useGame((s) => s.guidanceMuted);
  const target = useWorldGuidanceTarget();
  const identity = guidanceIdentity(target, waypoint);
  return { active: !!identity && !muted, identity, target, waypoint, muted };
}
