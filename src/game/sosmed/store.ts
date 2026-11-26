import { create } from "zustand";
import { useProfile } from "@/identity/profile-store";
import { worldRequest } from "@/services/world/client";
import { createId } from "@/lib/id";
import { MAX_FRAMES, MAX_TEXT, mergeRows, type Post } from "./sosmed";

type Draft = { text: string; frames: string[] };
const emptyDraft = (): Draft => ({ text: "", frames: [] });
const key = (account: string) => "cung.sosmed.draft.v2." + account;
let generation = 0;
let pending: { signature: string; id: string } | null = null;
export function sosmedRequest<T>(action: string, data: Record<string, unknown> = {}) {
  return worldRequest<T>("sosmed", { action, ...data });
}
interface State {
  account: string | null;
  posts: Post[];
  draft: string[];
  text: string;
  busy: boolean;
  loading: boolean;
  error: string;
  hasMore: boolean;
  clipsOnly: boolean;
  media: Record<number, string[]>;
  bind: (account: string | null) => void;
  setDraft: (frames: string[]) => void;
  setText: (text: string) => void;
  read: (mode?: "initial" | "new" | "older", clipsOnly?: boolean) => Promise<void>;
  publish: (withClip: boolean) => Promise<boolean>;
}
function saveDraft() {
  const s = useSosmed.getState();
  if (!s.account) return;
  try {
    localStorage.setItem(key(s.account), JSON.stringify({ text: s.text, frames: s.draft }));
  } catch {
    /* Keep the draft in memory when storage is unavailable. */
  }
}
export const useSosmed = create<State>((set, get) => ({
  account: null,
  posts: [],
  draft: [],
  text: "",
  busy: false,
  loading: false,
  error: "",
  hasMore: false,
  clipsOnly: false,
  media: {},
  bind: (account) => {
    if (get().account === account) return;
    generation++;
    pending = null;
    let draft = emptyDraft();
    try {
      const saved = account ? JSON.parse(localStorage.getItem(key(account)) ?? "null") : null;
      if (saved && typeof saved.text === "string" && Array.isArray(saved.frames))
        draft = {
          text: saved.text.slice(0, MAX_TEXT),
          frames: saved.frames.filter((f: unknown) => typeof f === "string").slice(0, MAX_FRAMES),
        };
    } catch {
      /* A corrupt draft must not prevent opening the feed. */
    }
    set({
      account,
      posts: [],
      draft: draft.frames,
      text: draft.text,
      busy: false,
      loading: false,
      error: "",
      hasMore: false,
      media: {},
    });
  },
  setDraft: (draft) => {
    get().bind(useProfile.getState().profile?.id ?? null);
    set({ draft: draft.slice(0, MAX_FRAMES) });
    saveDraft();
  },
  setText: (text) => {
    set({ text });
    saveDraft();
  },
  read: async (mode = "new", clipsOnly = get().clipsOnly) => {
    if (!get().account || get().loading) return;
    const ticket = generation;
    const posts = get().posts;
    const initial = mode === "initial" || !posts.length || clipsOnly !== get().clipsOnly;
    set({ loading: true, error: "" });
    try {
      const data = await sosmedRequest<{
        posts: Post[];
        hasMore: boolean;
        counts: { id: number; count: number }[];
      }>("read", {
        clipsOnly,
        knownIds: posts.slice(0, 100).map((p) => p.id),
        ...(!initial && mode === "older" ? { beforeId: Math.min(...posts.map((p) => p.id)) } : {}),
        ...(!initial && mode === "new" ? { afterId: Math.max(...posts.map((p) => p.id)) } : {}),
      });
      if (ticket !== generation) return;
      const counts = new Map(data.counts.map((c) => [c.id, c.count]));
      set({
        posts: mergeRows(initial ? [] : get().posts, data.posts).map((p) => ({
          ...p,
          commentCount: counts.get(p.id) ?? p.commentCount,
        })),
        clipsOnly,
        ...(initial || mode === "older" ? { hasMore: data.hasMore } : {}),
      });
    } catch (e) {
      if (ticket === generation) set({ error: (e as Error).message });
    } finally {
      if (ticket === generation) set({ loading: false });
    }
  },
  publish: async (withClip) => {
    if (get().busy || !get().account) return false;
    const { text, draft } = get();
    const frames = withClip ? draft : [];
    if (!text.trim() && !frames.length) return false;
    const signature = JSON.stringify([text.trim(), frames]);
    if (pending?.signature !== signature) pending = { signature, id: createId() };
    const ticket = generation;
    set({ busy: true, error: "" });
    try {
      const { post } = await sosmedRequest<{ post: Post }>("post", {
        text: text.trim(),
        frames,
        requestId: pending.id,
      });
      if (ticket !== generation) return false;
      set({
        posts: mergeRows(get().posts, [post]),
        text: "",
        draft: withClip ? [] : get().draft,
        media: frames.length ? { ...get().media, [post.id]: frames } : get().media,
      });
      pending = null;
      saveDraft();
      return true;
    } catch (e) {
      if (ticket === generation) set({ error: (e as Error).message });
      return false;
    } finally {
      if (ticket === generation) set({ busy: false });
    }
  },
}));
if (typeof window !== "undefined") {
  window.addEventListener("world-account-cleared", () => useSosmed.getState().bind(null));
  useProfile.subscribe((s) => useSosmed.getState().bind(s.profile?.id ?? null));
}
