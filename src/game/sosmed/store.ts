import { create } from "zustand";
import { useProfile } from "@/identity/profile-store";
import { worldRequest, WorldApiError } from "@/services/world/client";
import { createId } from "@/lib/id";
import { MAX_FRAMES, MAX_TEXT, mergeRows, type Post } from "./sosmed";

type Draft = { text: string; frames: string[] };
const emptyDraft = (): Draft => ({ text: "", frames: [] });
const key = (account: string) => "cung.sosmed.draft.v2." + account;
let generation = 0;
export const SOSMED_REFRESH_MS = 60_000;
let nextPollAt = 0;
let blockedUntil = 0;
let rateLimitDelay = SOSMED_REFRESH_MS;
let pending: { signature: string; id: string } | null = null;
export async function sosmedRequest<T>(action: string, data: Record<string, unknown> = {}) {
  if (Date.now() < blockedUntil)
    throw new WorldApiError(
      429,
      "CungGram sedang menunggu batas permintaan pulih. Coba sebentar lagi.",
    );
  const ticket = generation;
  try {
    const result = await worldRequest<T>("sosmed", { action, ...data });
    if (ticket === generation) rateLimitDelay = SOSMED_REFRESH_MS;
    return result;
  } catch (e) {
    if (ticket === generation && e instanceof WorldApiError && e.status === 429) {
      blockedUntil = Date.now() + rateLimitDelay;
      rateLimitDelay = Math.min(5 * 60_000, rateLimitDelay * 2);
    }
    throw e;
  }
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
  read: (mode?: "initial" | "new" | "older" | "poll", clipsOnly?: boolean) => Promise<void>;
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
    nextPollAt = blockedUntil = 0;
    rateLimitDelay = SOSMED_REFRESH_MS;
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
    if (mode === "poll" && Date.now() < Math.max(nextPollAt, blockedUntil)) return;
    nextPollAt = Date.now() + SOSMED_REFRESH_MS;
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
        ...(!initial && (mode === "new" || mode === "poll")
          ? { afterId: Math.max(...posts.map((p) => p.id)) }
          : {}),
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
