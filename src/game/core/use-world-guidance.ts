import { truckRouteTarget } from "@/game/missions/truck-model";
import { useMissionFocus } from "@/state/mission-focus";
import { useMissions } from "@/game/missions/store";
import { missionInteraction } from "@/game/missions/runtime";
import { mapDestination } from "@/game/navigation/map-destinations";
import { useClub } from "@/game/club/store";
import { useDailyTarget } from "@/game/daily/use-daily-target";
import { useDungeon } from "@/game/dungeon/store";
import { useGame } from "@/state/game-store";
import { useGameCore } from "./store";
import { questGuidanceTarget, type GuidanceTarget } from "./quest-guidance";
import type { Objective } from "./types";

/** Jelajah / SHOW_WAYPOINT destination → same ground-arrow target shape as quests. */
export function exploreWaypointTarget(waypoint: string | null | undefined): GuidanceTarget | null {
  if (!waypoint) return null;
  const zone = mapDestination(waypoint);
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
export function useWorldGuidanceTarget(questOnly = false): GuidanceTarget | null {
  const underground = useClub((s) => s.inside && !s.outdoor);
  const snapshot = useGameCore((s) => s.snapshot);
  const dungeon = useDungeon((s) => s.data);
  const trackDungeonEntrance = useDungeon((s) => s.tracked);
  const daily = useDailyTarget();
  const focus = useMissionFocus((s) => s.source);
  useMissions((s) => s.session.active);
  const mission = missionInteraction();
  const waypoint = useGame((s) => s.waypoint);
  const objective = daily?.objective;
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
  const optionalTarget = mission
    ? {
        objective: null,
        position: useMissions.getState().session.active?.truck?.driver
          ? truckRouteTarget(useMissions.getState().session.active!.truck!)
          : mission.position,
        realm: "WORLD" as const,
      }
    : null;
  const questTarget = dungeon?.instance
    ? questGuidanceTarget(snapshot, dungeon)
    : focus === "mission" && optionalTarget
      ? optionalTarget
      : questGuidanceTarget(
          snapshot,
          dungeon,
          focus === "quest" ? null : dailyTarget,
          trackDungeonEntrance,
        );
  if (underground) return null;
  if (dungeon?.instance || questOnly) return questTarget;
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
