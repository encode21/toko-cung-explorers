import type { Objective, GameSnapshot, QuestDefinition } from "@/game/core/types";
import type { ChannelLease } from "@/services/world/contracts";
export type DungeonTemplate =
  "HUNT" | "DELIVERY" | "PUZZLE" | "COLLECTION" | "EXPLORATION" | "SEQUENCE" | "TIME_TRIAL";
export interface PrincipalDungeon {
  version?: number;
  questTitle?: string;
  worldExit?: [number, number, number];
  chapters?: { id: number; title: string; minLevel: number; maxLevel: number | null }[];
  principalId: string;
  campaignId: string;
  buildingId: string;
  dungeonId: string;
  questId: string;
  title: string;
  theme: string;
  requiredLevel: number;
  maxPartySize: number;
  timeoutSeconds: number;
  graceSeconds: number;
  repeatPolicy: "ONCE" | "DAILY" | "REPEATABLE" | "CAMPAIGN_LIMITED";
  templates: DungeonTemplate[];
  objectiveMode: "SHARED" | "INDIVIDUAL";
  rewardMode: "INDIVIDUAL";
  entrance: [number, number, number];
  spawn: [number, number, number];
  objectives: (Objective & { positions?: [number, number, number][] })[];
  reward: { xp: number; point: number };
  easterEggs: { id: string; position: [number, number, number]; xp: number }[];
  assets: {
    primaryColor: string;
    secondaryColor: string;
    logo: string | null;
    signage: string | null;
    productProps: string[];
    buildingFacade: string | null;
    interiorBanners: string[];
    npcOutfit: string | null;
    rewardBadge: string | null;
  };
}
export interface DungeonInstance {
  id: string;
  sharedInstanceId: string;
  partyId: string | null;
  room: string;
  currentRoom?: string;
  realm?: "DUNGEON" | "WORLD";
  status: "CREATING" | "WAITING" | "ACTIVE" | "COMPLETED" | "FAILED" | "CLOSING";
  createdAt: string;
  expiresAt: string;
  progress: number[];
  found: string[];
  easterEgg: boolean;
  carrying: boolean;
  carrierId: string | null;
}
export interface DungeonResponse {
  quests?: QuestDefinition[];
  config: PrincipalDungeon;
  instance: DungeonInstance | null;
  status: string;
  message?: string | null;
  lease?: ChannelLease;
  position?: [number, number, number];
  game?: GameSnapshot;
}

export type LeaderboardCategory =
  "WEEKLY_XP" | "QUESTS_COMPLETED" | "DUNGEON_CLEARS" | "EASTER_EGGS" | "FASTEST_CLEAR";
export interface LeaderboardRow {
  playerId: string;
  name?: string;
  rank: number;
  score: number;
}
export interface PrincipalLeaderboard {
  category: LeaderboardCategory;
  period: "weekly" | "all-time";
  questId: string;
  weekStart: string;
  resetsAt: string;
  top: LeaderboardRow[];
  own: LeaderboardRow | null;
  participants: number;
  reward: string;
  achievements: { period: string; category: string; badge: string; rank: number }[];
}
