import { create } from "zustand";

export type HudSheet = "map" | "explore" | "chat" | "profile" | "feed" | "help" | null;
export type FeedTone = "ops" | "social" | "shop" | "system" | "chat";

export interface FeedEvent {
  id: number;
  text: string;
  tone: FeedTone;
  /** Nama pengirim untuk bubble chat. */
  title?: string;
  at: number;
}

interface HudState {
  sheet: HudSheet;
  events: FeedEvent[];
  unseen: number;
  setSheet: (s: HudSheet) => void;
  toggleSheet: (s: Exclude<HudSheet, null>) => void;
  pushEvent: (text: string, tone: FeedTone, title?: string) => void;
}

let seq = 0;

/** State HUD dunia: sheet yang terbuka + feed kejadian ringan. */
export const useHud = create<HudState>((set) => ({
  sheet: null,
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
        unseen: s.sheet === "feed" ? 0 : s.unseen + 1,
      };
    }),
}));
