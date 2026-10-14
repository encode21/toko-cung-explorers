import type { Objective } from "@/game/core/types";
export type DailyStatus =
  "LOCKED" | "AVAILABLE" | "ACTIVE" | "COMPLETED" | "CLAIMABLE" | "CLAIMED" | "EXPIRED";
export interface DailyObjective extends Omit<Objective, "type" | "position" | "radius" | "target"> {
  type: Objective["type"] | "DISTANCE" | "DUNGEON_ENTERED" | "DUNGEON_OBJECTIVE";
  navigationTargetId?: string;
  position?: [number, number, number];
  radius?: number;
  target?: string;
}
export interface DailyQuestDefinition {
  id: string;
  title: string;
  description: string;
  category: "EXPLORATION" | "INTERACTION" | "STORE" | "WORLD" | "DUNGEON";
  objectives: DailyObjective[];
  ordered?: boolean;
  minLevel: number;
  weight: number;
  reward: { cungPoint: number; xp: number };
}
export interface DailyQuest {
  id: string;
  questId: string;
  definition: DailyQuestDefinition;
  status: DailyStatus;
  progress: number[];
  receipt: { cungPoint: number; requestedPoint: number; xp: number; bonusXp: number } | null;
}
export interface DailySnapshot {
  enabled: true;
  serverTime: string;
  dateKey: string;
  nextReset: string;
  setId: string;
  revision: number;
  introduced: boolean;
  streak: number;
  completedCount: number;
  claimedCount: number;
  quests: DailyQuest[];
  wallet: {
    current_balance: number;
    earned_today: number;
    lifetime_earned: number;
    day: string;
    last_updated: string;
  };
  profile: {
    xp: number;
    level: number;
    title: string;
    missions_completed: number;
    lifetime_points_earned: number;
  };
}
export function dailyStep(quest: DailyQuest) {
  const index = quest.definition.objectives.findIndex(
    (o, i) => (quest.progress[i] ?? 0) < o.required,
  );
  return { index, objective: quest.definition.objectives[index] };
}
export function dailyMarker(data: DailySnapshot | null) {
  if (!data) return "";
  if (data.quests.some((q) => q.status === "CLAIMABLE")) return "?";
  if (data.quests.some((q) => q.status === "AVAILABLE")) return "!";
  return data.claimedCount === 5 ? "✓" : "";
}
