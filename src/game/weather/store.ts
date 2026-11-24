import { WEATHER_SLOT_MS, weatherAt, type Weather } from "./cycle";

// Dev-only override for testing: ?weather=storm | clear.
const forced: Weather | null = (() => {
  if (!import.meta.env.DEV || typeof location === "undefined") return null;
  const q = new URLSearchParams(location.search).get("weather");
  return q === "storm" ? { rain: 1, flood: 1 } : q === "clear" ? { rain: 0, flood: 0 } : null;
})();

let cache: { at: number; w: Weather } = { at: 0, w: { rain: 0, flood: 0 } };
let clearUntil = 0;
/**
 * Waking up: the storm you went to bed in has passed (for this player) until the next weather slot.
 * shortcut: local only, other players still see the shared rain; move to the server if it must be shared.
 */
export function clearSkyAfterSleep(now = Date.now()) {
  if (weatherAt(now).rain <= 0) return;
  clearUntil = (Math.floor(now / WEATHER_SLOT_MS) + 1) * WEATHER_SLOT_MS;
  cache = { at: now, w: { rain: 0, flood: 0 } };
}
/** Current weather, recomputed at most every 500 ms (callers run per frame). */
export function currentWeather(): Weather {
  if (forced) return forced;
  const now = Date.now();
  if (now < clearUntil) return { rain: 0, flood: 0 };
  if (now - cache.at > 500) cache = { at: now, w: weatherAt(now) };
  return cache.w;
}
