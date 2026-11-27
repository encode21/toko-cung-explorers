/** Shared weather from the wall clock: every client sees the same rain without a server. Pure. */
export type WeatherPhase = "clear" | "drizzle" | "rain" | "heavy" | "clearing" | "rainbow";
export type Weather = { rain: number; flood: number; rainbow: number; phase: WeatherPhase };
export const CLEAR_WEATHER: Weather = { rain: 0, flood: 0, rainbow: 0, phase: "clear" };
export const WEATHER_SLOT_MS = 15 * 60_000;
export const RAINY_CHANCE = 0.4;

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const ramp = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

/** Drizzle → moderate → heavy → clearing → rainbow, shared by city and mountain. */
export function weatherAt(now: number): Weather {
  const slot = Math.floor(now / WEATHER_SLOT_MS);
  if (hash(slot) >= RAINY_CHANCE) return { ...CLEAR_WEATHER };
  const p = (now - slot * WEATHER_SLOT_MS) / WEATHER_SLOT_MS;
  const rising = 0.28 * ramp(p, 0, 0.2) + 0.44 * ramp(p, 0.2, 0.4) + 0.28 * ramp(p, 0.4, 0.48);
  const rain = rising * (1 - ramp(p, 0.6, 0.8));
  const flood = ramp(p, 0.25, 0.6) * (1 - ramp(p, 0.6, 0.95));
  const rainbow = ramp(p, 0.8, 0.84) * (1 - ramp(p, 0.92, 0.99));
  const phase: WeatherPhase =
    p < 0.2
      ? "drizzle"
      : p < 0.4
        ? "rain"
        : p < 0.6
          ? "heavy"
          : p < 0.8
            ? "clearing"
            : p < 0.99
              ? "rainbow"
              : "clear";
  return { rain, flood, rainbow, phase };
}
/** Walking in a flooded gang: up to 45% slower. */
export function floodSpeedFactor(flood: number) {
  return 1 - 0.45 * Math.min(1, Math.max(0, flood));
}

const WIB_MS = 7 * 60 * 60 * 1000;
/** Calendar date in Asia/Jakarta, `YYYY-MM-DD`. */
export function jakartaDate(ms: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
}
function wibMidnight(ms: number) {
  const shifted = ms + WIB_MS;
  return Math.floor(shifted / 86_400_000) * 86_400_000 - WIB_MS;
}
const padHour = (h: number) => String(h).padStart(2, "0");
/** Collapse 7,8,9,14 into `07–09, 14`. */
export function hourRanges(hours: number[]) {
  if (!hours.length) return "";
  const parts: string[] = [];
  let start = hours[0]!,
    end = start;
  const push = () =>
    parts.push(start === end ? padHour(start) : `${padHour(start)}–${padHour(end)}`);
  for (const hour of hours.slice(1)) {
    if (hour === end + 1) end = hour;
    else {
      push();
      start = end = hour;
    }
  }
  push();
  return parts.join(", ");
}
export type RainDay = { date: string; label: string; hours: number[]; ranges: string };
/**
 * Next days of rain, from the same clock every client already shares.
 * An hour counts when any of its 15-minute slots is wet.
 */
export function rainForecast(now = Date.now(), days = 7): RainDay[] {
  const start = wibMidnight(now);
  const today = jakartaDate(now);
  const tomorrow = jakartaDate(start + 86_400_000);
  return Array.from({ length: days }, (_, index) => {
    const day = start + index * 86_400_000;
    const hours: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const wet = [0, 1, 2, 3].some(
        (slot) => weatherAt(day + hour * 3_600_000 + slot * WEATHER_SLOT_MS + 1_000).rain > 0,
      );
      if (wet) hours.push(hour);
    }
    const date = jakartaDate(day + 12 * 3_600_000);
    const label =
      date === today
        ? "Hari ini"
        : date === tomorrow
          ? "Besok"
          : new Intl.DateTimeFormat("id-ID", {
              timeZone: "Asia/Jakarta",
              weekday: "short",
              day: "numeric",
              month: "short",
            }).format(day + 12 * 3_600_000);
    return { date, label, hours, ranges: hourRanges(hours) };
  });
}
/** Rainy clock hours on one Jakarta date (`YYYY-MM-DD`). */
export function rainOnDate(date: string) {
  const day = Date.parse(`${date}T00:00:00+07:00`);
  if (Number.isNaN(day)) return [];
  const hours: number[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const wet = [0, 1, 2, 3].some(
      (slot) => weatherAt(day + hour * 3_600_000 + slot * WEATHER_SLOT_MS + 1_000).rain > 0,
    );
    if (wet) hours.push(hour);
  }
  return hours;
}
