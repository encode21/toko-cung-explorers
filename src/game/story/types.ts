/** Section IDs come from the story catalog; new sections can appear between client releases. */
export type StorySectionId = string;
export interface StoryGoal {
  type: string;
  label: string | null;
  progress: number;
  target: number;
  done: boolean;
  locked?: boolean;
  claimInWarung?: boolean;
}
export interface StorySection {
  id: StorySectionId;
  label: string;
  page: number;
  pageCount: number;
  current: {
    title: string;
    advice: string;
    npc: string;
    goal: string;
    needsWarung?: boolean;
    progress: StoryGoal;
  } | null;
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
        | "open"
        | "unfinished"
        | "needs_warung"
        | "open_warung"
        | "claim_in_warung"
        | "guest_book",
        string
      >;
      path: "jalanan" | "dagang" | null;
      activeSection: StorySectionId;
      locked: boolean;
      showPathChoice?: boolean;
      guest?: boolean;
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
