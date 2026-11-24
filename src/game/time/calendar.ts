import { GAME_DAY_MS } from "./model.ts";

/**
 * Game calendar: one game day per GAME_DAY_MS (48 real minutes), counted from the epoch like
 * `worldMinutes` and the server's GameClock day index. Game date 1 Jan 2026 = the game day holding
 * real 24 Nov 2026 00:00 WIB, so a game month passes in about a real day.
 */
const ANCHOR = Math.floor(Date.UTC(2026, 10, 23, 17) / GAME_DAY_MS);
const BASE = Date.UTC(2026, 0, 1);
const DAY = 86_400_000;
export const GAME_HOUR_MS = GAME_DAY_MS / 24;

/** Game date `YYYY-MM-DD` of a real instant. */
export function gameDate(ms: number) {
  return new Date(BASE + (Math.floor(ms / GAME_DAY_MS) - ANCHOR) * DAY).toISOString().slice(0, 10);
}
/** Real instant at which a game date starts (00:00 game time). */
export function gameDateStart(date: string) {
  return ((Date.parse(`${date}T00:00:00Z`) - BASE) / DAY + ANCHOR) * GAME_DAY_MS;
}
/** Game clock of a real instant. */
export function gameClock(ms: number) {
  const minutes = Math.floor(
    (((ms % GAME_DAY_MS) + GAME_DAY_MS) % GAME_DAY_MS) / (GAME_DAY_MS / 1440),
  );
  return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
}
const pad = (n: number) => String(n).padStart(2, "0");
const longDay = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDay = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});
/** "Kamis, 12 Januari 2026" for the game date of a real instant. */
export const gameDateLabel = (ms: number) =>
  longDay.format(Date.parse(`${gameDate(ms)}T00:00:00Z`));
/** "Kam, 12 Jan · 14.30" in game time, for due dates. */
export function gameMoment(ms: number) {
  const { hour, minute } = gameClock(ms);
  return `${shortDay.format(Date.parse(`${gameDate(ms)}T00:00:00Z`))} · ${pad(hour)}.${pad(minute)}`;
}
