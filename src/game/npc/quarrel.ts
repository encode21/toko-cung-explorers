/** Pure state machine for a bump quarrel between two walkers (or one walker and the player). */
export const QUARREL_COOLDOWN = 180;
/** Contact radius: a hair above the 0.85 m walker spacing so blocked walkers still count as a bump. */
export const BUMP_DIST = 0.9;
export const WATCH_DIST = 6;
export type QuarrelPhase = "FALL" | "GETUP" | "ARGUE" | "SORRY" | "DONE";
export type QuarrelAnim = "Hit" | "Fall" | "GetUp" | "Talk" | "Idle";
export interface Quarrel {
  a: string;
  /** null = the player bumped `a`; the NPC does all the talking. */
  b: string | null;
  phase: QuarrelPhase;
  /** Seconds in the current phase. */
  t: number;
  /** Index into `lines` while ARGUE/SORRY. */
  line: number;
  lines: { who: 0 | 1; text: string }[];
}
export interface QuarrelState {
  now: number;
  active: Quarrel | null;
  until: Map<string, number>;
}

const ARGUE: [string, string, string][] = [
  ["Eh, jalan liat-liat dong!", "Lah situ yang nyelonong!", "Ngeles aja, orang situ yang nabrak!"],
  ["Aduh, sakit tau!", "Siapa suruh jalan sambil nunduk?", "Dih, nyolot amat."],
  ["Mata tuh dipake, Mas!", "Situ juga jalannya miring!", "Udah deh, jangan ngegas."],
];
const SOLO: [string, string, string][] = [
  ["Eh, jalan liat-liat dong!", "Aduh, pinggang gue...", "Lain kali pelan-pelan napa."],
  ["Woy, hati-hati dikit!", "Untung gue nggak jatuh beneran.", "Kebiasaan deh anak muda."],
];
const SORRY = ["Yaudah, maaf, maaf...", "Iya iya, gue juga salah. Maaf ya."];
const DURATION = { FALL: 1.2, GETUP: 1.2, ARGUE: 2.2, SORRY: 2.4 } as const;

export const createQuarrelState = (): QuarrelState => ({ now: 0, active: null, until: new Map() });
/** Shared singleton used by the city NPCs. */
export const quarrels = createQuarrelState();

const ready = (s: QuarrelState, id: string) => (s.until.get(id) ?? 0) <= s.now;

/** Returns the new quarrel, or null when one is active or a participant is cooling down. */
export function startQuarrel(
  s: QuarrelState,
  a: string,
  b: string | null,
  seed: number,
): Quarrel | null {
  if (s.active || !ready(s, a) || (b !== null && !ready(s, b))) return null;
  const set = (b ? ARGUE : SOLO)[Math.abs(seed) % (b ? ARGUE : SOLO).length]!;
  const n = 2 + (Math.abs(seed) % 2);
  const lines = set.slice(0, n).map((text, i) => ({ who: (b ? i % 2 : 0) as 0 | 1, text }));
  lines.push({ who: (b ? n % 2 : 0) as 0 | 1, text: SORRY[Math.abs(seed) % SORRY.length]! });
  s.active = { a, b, phase: "FALL", t: 0, line: 0, lines };
  return s.active;
}

export function stepQuarrel(s: QuarrelState, dt: number) {
  s.now += dt;
  const q = s.active;
  if (!q) return;
  q.t += dt;
  if (q.phase === "DONE" || q.t < DURATION[q.phase]) return;
  q.t = 0;
  if (q.phase === "FALL") q.phase = "GETUP";
  else if (q.phase === "GETUP") q.phase = "ARGUE";
  else if (q.line < q.lines.length - 2) q.line++;
  else if (q.phase === "ARGUE") {
    q.phase = "SORRY";
    q.line = q.lines.length - 1;
  } else {
    q.phase = "DONE";
    s.active = null;
    s.until.set(q.a, s.now + QUARREL_COOLDOWN);
    if (q.b) s.until.set(q.b, s.now + QUARREL_COOLDOWN);
  }
}

export const quarrelRole = (q: Quarrel, id: string): 0 | 1 | null =>
  q.a === id ? 0 : q.b === id ? 1 : null;

/** Line currently spoken, with who speaks it; null while falling or getting up. */
export function quarrelLine(q: Quarrel) {
  return q.phase === "ARGUE" || q.phase === "SORRY" ? q.lines[q.line]! : null;
}

export function quarrelAnim(q: Quarrel, who: 0 | 1): QuarrelAnim {
  if (q.phase === "FALL") return who === 0 ? "Hit" : "Fall";
  if (q.phase === "GETUP") return "GetUp";
  return "Talk";
}
