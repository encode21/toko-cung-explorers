import { weatherAt } from "./cycle.ts";
import { FLOOD_VISIBLE_AT } from "./flood-surface.ts";

const MINUTE_MS = 60_000;
const TICK_MS = 30 * MINUTE_MS;
const TICK_COUNT = 4;

export type WeatherLocationId = "city" | "gang" | "mountain";
export type WeatherCondition = "clear" | "rain" | "flood";

type WeatherPeriod = {
  start: number;
  end: number;
  condition: WeatherCondition;
};

type WeatherTimelineRow = {
  id: WeatherLocationId;
  label: string;
  periods: WeatherPeriod[];
};

function weatherPeriods(start: number, end: number, canFlood: boolean): WeatherPeriod[] {
  const periods: WeatherPeriod[] = [];
  for (let minute = start; minute < end; minute += MINUTE_MS) {
    // Midpoints round transitions to the nearest minute without sampling a slot boundary.
    const { rain, flood } = weatherAt(minute + MINUTE_MS / 2);
    const condition = canFlood && flood > FLOOD_VISIBLE_AT ? "flood" : rain > 0 ? "rain" : "clear";
    const previous = periods.at(-1);
    if (previous?.condition === condition) previous.end = minute + MINUTE_MS;
    else periods.push({ start: minute, end: minute + MINUTE_MS, condition });
  }
  return periods;
}

/** Two hours on the same real-time weather clock that the game uses outdoors. */
export function buildWeatherTimeline(now: number) {
  const start = Math.floor(now / TICK_MS) * TICK_MS;
  const end = start + TICK_COUNT * TICK_MS;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => start + index * TICK_MS);
  const rows: WeatherTimelineRow[] = [
    { id: "city", label: "Pusat Kota", periods: weatherPeriods(start, end, false) },
    { id: "gang", label: "Kampung", periods: weatherPeriods(start, end, true) },
    // The mountain scene does not simulate this rain cycle.
    { id: "mountain", label: "Pegunungan", periods: [] },
  ];
  return { start, end, ticks, rows };
}
