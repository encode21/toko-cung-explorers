export type StorySectionId = "jalanan" | "dagang" | "dapur" | "kos";
export interface StoryGoal {
  type: string;
  label: string | null;
  progress: number;
  target: number;
  done: boolean;
}
export interface StorySection {
  id: StorySectionId;
  label: string;
  page: number;
  pageCount: number;
  current: { title: string; advice: string; npc: string; goal: string; progress: StoryGoal } | null;
  pinnacle: StoryGoal[];
  pinnacleReached: boolean;
  completedAt: string | null;
  cosmetic: { id: string; label: string };
}
export type StorySnapshot =
  | { enabled: false }
  | {
      enabled: true;
      text: Record<
        | "title"
        | "choose_path"
        | "warung_path"
        | "ojek_path"
        | "locked"
        | "claim"
        | "refresh"
        | "completed"
        | "waiting_pinnacle"
        | "pinnacle"
        | "reward"
        | "open",
        string
      >;
      path: "jalanan" | "dagang" | null;
      activeSection: StorySectionId;
      locked: boolean;
      nextPageAt: string | null;
      sections: StorySection[];
      pageXp: number;
      finalReadyAt: string | null;
      profile: { xp: number; level: number; title: string };
    };
export interface StoryCommand {
  action: "state" | "choose-path" | "set-active" | "claim-page";
  requestId: string;
  section?: StorySectionId;
  path?: "jalanan" | "dagang";
  page?: number;
}
