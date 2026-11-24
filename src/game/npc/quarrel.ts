/** Pure state machine for a bump quarrel between two walkers (or one walker and the player). */
export const QUARREL_COOLDOWN = 180;
/** Contact radius: a hair above the 0.85 m walker spacing so blocked walkers still count as a bump. */
export const BUMP_DIST = 0.9;
export const WATCH_DIST = 6;
export type QuarrelPhase =
  "CHARGE" | "FALL" | "GETUP" | "ARGUE" | "SORRY" | "FLEE" | "BREAK" | "DONE";
export type QuarrelAnim = "Hit" | "Fall" | "GetUp" | "Talk" | "Idle" | "Run";
/** Gap between random "Preman Iseng" punches: 4-7 minutes. */
export const punchDelay = (r: number) => 240 + Math.min(1, Math.max(0, r)) * 180;
/** Walkers in a punch are `a` (aggressor, who) 0, `b` (victim) 1, `breaker` (satpam/Pak RT) 2. */
export type QuarrelWho = 0 | 1 | 2;
export interface Quarrel {
  /** "punch": `a` runs at `b` and punches; the player is only ever a witness. */
  kind: "quarrel" | "punch";
  a: string;
  /** null = the player bumped `a`; the NPC does all the talking. */
  b: string | null;
  /** Punch only: bystander who ends it with "Bubar!"; null = the victim runs away instead. */
  breaker: string | null;
  phase: QuarrelPhase;
  /** Seconds in the current phase. */
  t: number;
  /** Index into `lines` while ARGUE/SORRY. */
  line: number;
  lines: { who: QuarrelWho; text: string }[];
}
export interface QuarrelState {
  now: number;
  active: Quarrel | null;
  /** Earliest `now` for the next random punch. */
  nextPunch: number;
  /** World x, z of the aggressor, refreshed by the NPC driver so the HUD can offer "Rekam". */
  at: [number, number] | null;
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
const SHOUT = ["Woy! Apa-apaan nih?!", "Lu ngeliatin gua ya?!"];
const FLEE = "Awas lu ya! Gue laporin!";
const BREAK = "Sudah, sudah! Bubar!";
/** CHARGE is a timeout: the driver calls `punchLanded` on contact. */
const DURATION = {
  CHARGE: 3,
  FALL: 1.2,
  GETUP: 1.2,
  ARGUE: 2.2,
  SORRY: 2.4,
  FLEE: 2.6,
  BREAK: 2.4,
} as const;

export const createQuarrelState = (): QuarrelState => ({
  now: 0,
  active: null,
  nextPunch: 240,
  at: null,
  until: new Map(),
});
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
  s.active = { kind: "quarrel", a, b, breaker: null, phase: "FALL", t: 0, line: 0, lines };
  return s.active;
}

/** Random punch: `a` charges `b`. Returns null when busy, cooling down, or too soon. */
export function startPunch(
  s: QuarrelState,
  a: string,
  b: string,
  seed: number,
  breaker: string | null,
): Quarrel | null {
  if (s.active || s.now < s.nextPunch || !ready(s, a) || !ready(s, b)) return null;
  const end = breaker && seed % 2 === 0 ? "BREAK" : "FLEE";
  s.nextPunch = s.now + punchDelay((Math.abs(seed) % 100) / 100);
  s.active = {
    kind: "punch",
    a,
    b,
    breaker: end === "BREAK" ? breaker : null,
    phase: "CHARGE",
    t: 0,
    line: 0,
    lines: [
      { who: 1, text: SHOUT[0]! },
      { who: 0, text: SHOUT[1]! },
      end === "BREAK" ? { who: 2, text: BREAK } : { who: 1, text: FLEE },
    ],
  };
  return s.active;
}

/** Contact: the punch connects and the victim goes down. */
export function punchLanded(q: Quarrel) {
  if (q.phase !== "CHARGE") return;
  q.phase = "FALL";
  q.t = 0;
}

/** True while a quarrel/punch is on and its aggressor is within `r` metres of (x, z). */
export const quarrelNear = (s: QuarrelState, x: number, z: number, r: number) =>
  !!s.active && !!s.at && Math.hypot(s.at[0] - x, s.at[1] - z) <= r;

export function stepQuarrel(s: QuarrelState, dt: number) {
  s.now += dt;
  const q = s.active;
  if (!q) return;
  q.t += dt;
  if (q.phase === "DONE" || q.t < DURATION[q.phase]) return;
  q.t = 0;
  if (q.phase === "CHARGE") q.phase = "FALL";
  else if (q.phase === "FALL") q.phase = "GETUP";
  else if (q.phase === "GETUP") q.phase = "ARGUE";
  else if (q.line < q.lines.length - 2) q.line++;
  else if (q.phase === "ARGUE") {
    q.phase = q.kind === "punch" ? (q.breaker ? "BREAK" : "FLEE") : "SORRY";
    q.line = q.lines.length - 1;
  } else {
    q.phase = "DONE";
    s.active = null;
    s.until.set(q.a, s.now + QUARREL_COOLDOWN);
    if (q.b) s.until.set(q.b, s.now + QUARREL_COOLDOWN);
  }
}

export const quarrelRole = (q: Quarrel, id: string): QuarrelWho | null =>
  q.a === id ? 0 : q.b === id ? 1 : q.breaker === id ? 2 : null;

/** Line currently spoken, with who speaks it; null while falling or getting up. */
export function quarrelLine(q: Quarrel) {
  return ["ARGUE", "SORRY", "FLEE", "BREAK"].includes(q.phase) ? q.lines[q.line]! : null;
}

export function quarrelAnim(q: Quarrel, who: QuarrelWho): QuarrelAnim {
  if (q.phase === "CHARGE") return who === 0 ? "Run" : "Idle";
  if (q.phase === "FLEE") return who === 1 ? "Run" : "Idle";
  if (q.phase === "FALL") return who === 0 ? "Hit" : "Fall";
  if (q.phase === "GETUP") return "GetUp";
  return "Talk";
}
