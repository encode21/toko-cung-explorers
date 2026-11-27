import { create } from "zustand";
import type { ChatChannel } from "@/net/chat-channels";
import type { StaffKind } from "@/game/staff/types";

export type HudSheet =
  | "mountain-outfits"
  | "camera"
  | "quests"
  | "fishing-settings"
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
  | "delivery"
  | "beginner-guide"
  | "kulakan-book"
  | "shop"
  | "appearance"
  | "daily-login"
  | "pahlawan-event"
  | "inventory"
  | "phone"
  | "warung"
  | "grosir"
  | "warung-community"
  | "warung-decor"
  | "ojek"
  | "garasi"
  | "showroom"
  | "usaha"
  | "cungchat"
  | "notes"
  | "calendar"
  | "weather"
  | "cngbank"
  | "sosmed"
  | "tokocung"
  | null;
export type FeedTone = "npc" | "ops" | "social" | "shop" | "system" | "chat";
export type FeedTab = "inbox" | "activity";
type InboxDestination = { app: "cngbank" } | { app: "cungchat"; threadId: string };

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
  prologOpen: boolean;
  setPrologOpen: (open: boolean) => void;
  feedTab: FeedTab;
  openFeed: (tab: FeedTab) => void;
  inboxDestination: InboxDestination | null;
  openFromInbox: (destination: InboxDestination) => void;
  /** CngBank "Bayar Belanja" sub-view; cleared whenever the sheet changes away from cngbank. */
  cngbankPay: boolean;
  cngbankSalary: StaffKind | null;
  openStaffPayment: (kind: StaffKind) => void;
  openCngBankPay: () => void;
  setCngBankPay: (on: boolean) => void;
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
  prologOpen: false,
  setPrologOpen: (prologOpen) => set({ prologOpen }),
  feedTab: "inbox",
  openFeed: (feedTab) =>
    set((s) => ({
      sheet: "feed",
      feedTab,
      inboxDestination: null,
      cngbankPay: false,
      cngbankSalary: null,
      unseen: feedTab === "activity" ? 0 : s.unseen,
    })),
  inboxDestination: null,
  openFromInbox: (destination) =>
    set({
      sheet: destination.app,
      inboxDestination: destination,
      cngbankPay: false,
      cngbankSalary: null,
    }),
  cngbankPay: false,
  cngbankSalary: null,
  openStaffPayment: (kind) =>
    set({ sheet: "cngbank", cngbankSalary: kind, cngbankPay: false, inboxDestination: null }),
  openCngBankPay: () =>
    set({ sheet: "cngbank", cngbankPay: true, cngbankSalary: null, inboxDestination: null }),
  setCngBankPay: (cngbankPay) => set({ cngbankPay }),
  chatDraft: "",
  setChatDraft: (chatDraft) => set({ chatDraft }),
  chatChannel: "world",
  setChatChannel: (chatChannel) => set({ chatChannel }),
  events: [],
  unseen: 0,
  setSheet: (sheet) =>
    set((s) => ({
      sheet,
      feedTab: "inbox",
      inboxDestination: null,
      cngbankPay: sheet === "cngbank" && s.cngbankPay,
      cngbankSalary: null,
    })),
  toggleSheet: (target) =>
    set((s) => {
      const sheet = s.sheet === target ? null : target;
      return {
        sheet,
        feedTab: "inbox",
        inboxDestination: null,
        cngbankPay: sheet === "cngbank" && s.cngbankPay,
        cngbankSalary: null,
      };
    }),
  pushEvent: (text, tone, title) =>
    set((s) => {
      if (s.events[0]?.text === text && s.events[0]?.title === title) return s;
      return {
        events: [
          { id: ++seq, text, tone, ...(title === undefined ? {} : { title }), at: Date.now() },
          ...s.events,
        ].slice(0, 30),
        unseen:
          s.unseen + (tone === "npc" && !(s.sheet === "feed" && s.feedTab === "activity") ? 1 : 0),
      };
    }),
}));
