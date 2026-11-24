/** Pure CungGram logic: post cap, clip budget, viral counter curve, NPC feed. No imports, so node --test runs it. */
export const MAX_POSTS = 30;
export const MAX_FRAMES = 5;
export const MAX_TEXT = 140;
/** Total clip data-URL characters kept across posts before the oldest clips lose their frames. */
export const MAX_CLIP_CHARS = 2_000_000;
export const VIRAL_SECONDS = 60;
export const VIRAL_START = 12;
export const MILESTONES = [100, 1000, 2000] as const;

export interface Post {
  id: string;
  author: string;
  text: string;
  /** Epoch ms. */
  at: number;
  mine: boolean;
  frames: string[];
  /** Views at the end of the viral minute; clips only. */
  peak?: number;
}

const clipChars = (p: Post) => p.frames.reduce((n, f) => n + f.length, 0);

/** Newest first, capped at 30; oldest clips lose their frames once over the budget. */
export function addPost(posts: Post[], post: Post): Post[] {
  const next = [{ ...post, frames: post.frames.slice(0, MAX_FRAMES) }, ...posts].slice(
    0,
    MAX_POSTS,
  );
  let total = next.reduce((n, p) => n + clipChars(p), 0);
  for (let i = next.length - 1; i >= 0 && total > MAX_CLIP_CHARS; i--) {
    total -= clipChars(next[i]!);
    next[i] = { ...next[i]!, frames: [] };
  }
  return next;
}

/** 12 -> ~340 (15 s) -> peak, easing in over the first minute. */
export function viralViews(elapsedSec: number, peak: number): number {
  const p = Math.min(1, Math.max(0, elapsedSec / VIRAL_SECONDS));
  return Math.round(VIRAL_START + (peak - VIRAL_START) * p * p * (3 - 2 * p));
}
export const viralLikes = (views: number) => Math.round(views * 0.13);
export const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}rb` : `${n}`);

/** Highest milestone newly crossed between two readings, or null. */
export const crossedMilestone = (prev: number, next: number) =>
  [...MILESTONES].reverse().find((m) => prev < m && next >= m) ?? null;

const COMMENTERS = ["rina_gemoy", "bang_jali", "mpok.atun", "dimas88", "si_ucok", "kang_ojek"];
const COMMENTS = [
  "Wkwk viral!",
  "Lokasi mana nih min?",
  "Kasian korbannya 😭",
  "Itu preman iseng yang kemarin bukan?",
  "Share ke grup RT ah",
  "Satpamnya telat banget sih",
];
/** Comments appear one by one, ~9 s apart, starting at 5 s. */
export function viralComments(elapsedSec: number, seed: number) {
  const n = Math.max(0, Math.min(COMMENTS.length, Math.floor((elapsedSec - 5) / 9) + 1));
  return COMMENTS.slice(0, n).map((text, i) => ({
    who: COMMENTERS[(Math.abs(seed) + i) % COMMENTERS.length]!,
    text,
  }));
}

const NPC_POSTS: [string, string][] = [
  ["Mpok Atun", "Gorengan anget nih, mampir!"],
  ["Pak RT", "Kerja bakti Minggu jam 7, jangan lupa bawa sapu."],
  ["Bang Jali", "Ojek kosong, siapa mau nebeng?"],
  ["Koko Cung", "Stok minyak goreng baru masuk. Jangan rebutan ya."],
  ["Mbah", "Hujan lagi. Jemuran angkat."],
  ["Ucok", "Ada yang liat kucing oren? Jawab di komen."],
];
/** Fixed fun posts, a few minutes apart, stable for a given `now` bucket. */
export function npcPosts(now: number): Post[] {
  const bucket = Math.floor(now / 600_000);
  return NPC_POSTS.map(([author, text], i) => ({
    id: `npc-${bucket}-${i}`,
    author,
    text,
    at: now - (i + 1) * 4 * 60_000,
    mine: false,
    frames: [],
  }));
}
