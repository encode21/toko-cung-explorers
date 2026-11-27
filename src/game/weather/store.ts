import { CLEAR_WEATHER, WEATHER_SLOT_MS, weatherAt, type Weather } from "./cycle";

// Dev-only previews; real clients always derive the same phase from the shared clock.
const forced: Weather | null = (() => {
  if (!import.meta.env.DEV || typeof location === "undefined") return null;
  const q = new URLSearchParams(location.search).get("weather");
  const previews: Record<string, Weather> = {
    clear: CLEAR_WEATHER,
    drizzle: { rain: 0.14, flood: 0, rainbow: 0, phase: "drizzle" },
    rain: { rain: 0.5, flood: 0.15, rainbow: 0, phase: "rain" },
    storm: { rain: 1, flood: 1, rainbow: 0, phase: "heavy" },
    clearing: { rain: 0.3, flood: 0.6, rainbow: 0, phase: "clearing" },
    rainbow: { rain: 0, flood: 0, rainbow: 1, phase: "rainbow" },
  };
  return previews[q ?? ""] ?? null;
})();

let cache: { at: number; w: Weather } = { at: 0, w: CLEAR_WEATHER };
let clearUntil = 0;
/**
 * Waking up: the storm you went to bed in has passed (for this player) until the next weather slot.
 * shortcut: local only, other players still see the shared rain; move to the server if it must be shared.
 */
export function clearSkyAfterSleep(now = Date.now()) {
  if (weatherAt(now).rain <= 0) return;
  clearUntil = (Math.floor(now / WEATHER_SLOT_MS) + 1) * WEATHER_SLOT_MS;
  cache = { at: now, w: CLEAR_WEATHER };
}
/** Current weather, recomputed at most every 500 ms (callers run per frame). */
export function currentWeather(): Weather {
  if (forced) return forced;
  const now = Date.now();
  if (now < clearUntil) return CLEAR_WEATHER;
  if (now - cache.at > 500) cache = { at: now, w: weatherAt(now) };
  return cache.w;
}
