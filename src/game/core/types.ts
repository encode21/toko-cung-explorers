import type { SecretClue, SecretFeedback, SecretMetrics } from "@/game/secret/types";
export type ObjectiveType =
  "TALK" | "VISIT" | "INTERACT" | "FIND" | "COLLECT" | "DELIVER" | "SCAN" | "EXPLORE";
export type QuestCategory =
  "WORLD" | "DAILY" | "SUPPLIER" | "PRINCIPAL" | "DUNGEON" | "EASTER_EGG" | "REACTIVE";
export type QuestStatus =
  "AVAILABLE" | "ACCEPTED" | "ACTIVE" | "COMPLETED" | "FAILED" | "EXPIRED" | "CANCELLED";
export interface Objective {
  targetId?: string;
  targetType?: string;
  realm?: "DUNGEON" | "WORLD";
  hint?: string;
  hidden?: boolean;
  dependsOn?: number[];
  type: ObjectiveType;
  target: string;
  label: string;
  required: number;
  position: [number, number, number];
  radius: number;
  secret?: SecretClue;
}
export interface QuestDefinition {
  id: string;
  mission_kind?: string;
  chapter?: number;
  progressive?: boolean;
  dungeon_id?: string;
  expires_minutes?: number;
  title: string;
  description: string;
  category: QuestCategory;
  location: string;
  repeat_policy: "ONCE" | "DAILY" | "REPEATABLE" | "CAMPAIGN_LIMITED";
  objectives: Objective[];
  rewards: { xp: number; point: number };
  prerequisites: { level?: number; quest?: string; area?: string };
  event_type: string | null;
  principal_id: string | null;
  campaign_id: string;
  building_id: string | null;
  instance_id: string | null;
  theme: string | null;
  quest_chain: string[];
  ordered: boolean;
  cancellable: boolean;
  available: boolean;
  reason: string | null;
}
export interface QuestProgress {
  id: string;
  quest_id: string;
  status: QuestStatus;
  progress: number[];
  revision: number;
  accepted_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  xp_awarded: number;
  point_awarded: number;
  reward_metadata?: {
    archives?: string[];
    secretsFound?: number;
    perfectAnswers?: number;
    clueXp?: number;
    secretAttempts?: Record<string, number>;
  };
}
export interface GameSnapshot {
  profile: {
    player_id: string;
    xp: number;
    level: number;
    title: string;
    missions_completed: number;
    principal_achievements?: { period: string; category: string; badge: string; rank: number }[];
    lifetime_points_earned: number;
    secretMetrics?: SecretMetrics;
  };
  secretFeedback?: SecretFeedback;
  wallet: {
    current_balance: number;
    earned_today: number;
    lifetime_earned: number;
    last_updated: string;
    day: string;
  };
  levels: { level: number; xp: number; title: string }[];
  quests: QuestDefinition[];
  active: QuestProgress | null;
  history: QuestProgress[];
  ledger: {
    id: string;
    amount: number;
    balance_after: number;
    source_id: string;
    created_at: string;
  }[];
}
export const DAILY_POINT_CAP = 10_000;
export function nextLevel(snapshot: GameSnapshot) {
  return snapshot.levels.find((l) => l.xp > snapshot.profile.xp);
}
