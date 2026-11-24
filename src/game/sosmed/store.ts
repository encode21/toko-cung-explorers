import { create } from "zustand";
import { useGame } from "@/state/game-store";
import {
  MAX_FRAMES,
  MAX_TEXT,
  VIRAL_SECONDS,
  addPost,
  crossedMilestone,
  formatCount,
  viralViews,
  type Post,
} from "./sosmed.ts";

const KEY = "cung.sosmed.v1";
interface Saved {
  posts: Post[];
  draft: string[];
}
const load = (): Saved => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    if (raw && Array.isArray(raw.posts) && Array.isArray(raw.draft)) return raw;
  } catch {
    /* storage blocked or corrupt: start empty */
  }
  return { posts: [], draft: [] };
};
const save = (s: Saved) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ posts: s.posts, draft: s.draft }));
  } catch {
    /* quota or private mode: stay in memory */
  }
};

export const useSosmed = create<
  Saved & {
    /** Clip frames waiting to be attached to the next post. */
    setDraft: (frames: string[]) => void;
    publish: (text: string, withClip: boolean) => void;
  }
>((set, get) => ({
  ...load(),
  setDraft: (draft) => {
    set({ draft: draft.slice(0, MAX_FRAMES) });
    save(get());
  },
  publish: (text, withClip) => {
    const { posts, draft } = get();
    const frames = withClip ? draft : [];
    const body = text.trim().slice(0, MAX_TEXT);
    if (!body && !frames.length) return;
    const at = Date.now();
    set({
      posts: addPost(posts, {
        id: `me-${at}`,
        author: "Kamu",
        text: body || "Rekaman seru nih!",
        at,
        mine: true,
        frames,
        ...(frames.length ? { peak: 2000 + (at % 400) } : {}),
      }),
      draft: withClip ? [] : draft,
    });
    save(get());
  },
}));

/** Toast per views milestone while a fresh clip is going viral. */
export function watchViral() {
  const seen = new Map<string, number>();
  const t = setInterval(() => {
    const now = Date.now();
    for (const p of useSosmed.getState().posts) {
      const age = (now - p.at) / 1000;
      if (!p.peak || age > VIRAL_SECONDS + 5) continue;
      const views = viralViews(age, p.peak);
      const m = crossedMilestone(seen.get(p.id) ?? 0, views);
      seen.set(p.id, views);
      if (m) useGame.getState().setToast(`Klipmu tembus ${formatCount(m)} views 🔥`);
    }
  }, 2000);
  return () => clearInterval(t);
}
