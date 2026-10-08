import { create } from "zustand";
import { roomCodeFromUrl } from "@/net/room";
import type { AvatarConfig } from "@/identity/avatar";

export interface RemoteState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  /** Animasi pose (Sit / Hit / Fall / Wave / …) supaya remote terlihat sama. */
  anim?: string | undefined;
  role?: string | undefined;
  avatar?: AvatarConfig | undefined;
  character?: string | null | undefined;
}

export interface ChatMessage {
  id: string;
  from: string;
  name: string;
  text: string;
  at: number;
}

export interface RosterEntry {
  available?: boolean;
  joinedAt?: number;
  userId?: string;
  profileRevision?: string;
  id: string;
  name: string;
  role?: string | undefined;
  avatar?: AvatarConfig | undefined;
  character?: string | null | undefined;
}

const NAME_KEY = "tokocung-world-name";

function storedName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

interface NetState {
  room: string;
  name: string;
  connected: boolean;
  roster: RosterEntry[];
  chat: ChatMessage[];
  chatOpen: boolean;
  unread: number;

  setRoom: (room: string) => void;
  setName: (name: string) => void;
  setConnected: (v: boolean) => void;
  setRoster: (roster: RosterEntry[]) => void;
  pushChat: (msg: ChatMessage) => void;
  setChatOpen: (v: boolean) => void;
}

export const useNet = create<NetState>((set) => ({
  room: roomCodeFromUrl(),
  name: storedName(),
  connected: false,
  roster: [],
  chat: [],
  chatOpen: false,
  unread: 0,

  setRoom: (room) => set({ room }),
  setName: (name) => {
    if (typeof window !== "undefined") window.localStorage.setItem(NAME_KEY, name);
    set({ name });
  },
  setConnected: (connected) => set({ connected }),
  setRoster: (roster) => set({ roster }),
  pushChat: (msg) =>
    set((s) => ({
      chat: [...s.chat, msg].slice(-40),
      unread: s.chatOpen ? 0 : s.unread + 1,
    })),
  setChatOpen: (chatOpen) => set({ chatOpen, unread: chatOpen ? 0 : 0 }),
}));
