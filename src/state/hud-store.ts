import { create } from "zustand";
import type { ChatChannel } from "@/net/chat-channels";

export type HudSheet =
  | "settings"
  | "club"
  | "dance"
  | "map"
  | "explore"
  | "chat"
  | "profile"
  | "feed"
  | "help"
  | "archive"
  | "daily-missions"
  | "shop"
  | "appearance"
  | "daily-login"
  | "phone"
  | null;
export type FeedTone = "npc" | "ops" | "social" | "shop" | "system" | "chat";

export interface FeedEvent {
  id: number;
  text: string;
  tone: FeedTone;
  /** Nama pengirim untuk bubble chat. */
  title?: string;
  at: number;
}

interface HudState {
  selectedPlayer: string | null;
  tracker: "quest" | "mission" | "daily" | null;
  toggleTracker: (tracker: "quest" | "mission" | "daily") => void;
  principalPanel: "missions" | "leaderboard" | null;
  sheet: HudSheet;
  chatDraft: string;
  setChatDraft: (text: string) => void;
  chatChannel: ChatChannel;
  setChatChannel: (channel: ChatChannel) => void;
  events: FeedEvent[];
  unseen: number;
  setSheet: (s: HudSheet) => void;
  toggleSheet: (s: Exclude<HudSheet, null>) => void;
  pushEvent: (text: string, tone: FeedTone, title?: string) => void;
}

let seq = 0;

/** State HUD dunia: sheet yang terbuka + feed kejadian ringan. */
export const useHud = create<HudState>((set) => ({
  selectedPlayer: null,
  tracker: null,
  toggleTracker: (tracker) => set((s) => ({ tracker: s.tracker === tracker ? null : tracker })),
  principalPanel: null,
  sheet: null,
  chatDraft: "",
  setChatDraft: (chatDraft) => set({ chatDraft }),
  chatChannel: "world",
  setChatChannel: (chatChannel) => set({ chatChannel }),
  events: [],
  unseen: 0,
  setSheet: (sheet) => set((s) => ({ sheet, unseen: sheet === "feed" ? 0 : s.unseen })),
  toggleSheet: (target) =>
    set((s) => {
      const sheet = s.sheet === target ? null : target;
      return { sheet, unseen: sheet === "feed" ? 0 : s.unseen };
    }),
  pushEvent: (text, tone, title) =>
    set((s) => {
      if (s.events[0]?.text === text && s.events[0]?.title === title) return s;
      return {
        events: [
          { id: ++seq, text, tone, ...(title === undefined ? {} : { title }), at: Date.now() },
          ...s.events,
        ].slice(0, 30),
        unseen: s.sheet === "feed" ? 0 : s.unseen + (tone === "npc" ? 1 : 0),
      };
    }),
}));
