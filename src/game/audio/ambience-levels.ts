/** Pure level/density rules for city + gang ambience (runtime in city-ambience.ts). */
export interface AmbienceInput {
  rain: number;
  indoor: boolean;
  hour: number;
  gang: boolean;
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const isDaylight = (hour: number) => hour >= 5 && hour < 18;
export const isNightHour = (hour: number) => !isDaylight(hour);

/** Mean ms between bird calls; Infinity when none (night / heavy rain / indoors). */
export function birdIntervalMs({ rain, indoor, hour, gang }: AmbienceInput) {
  if (indoor || !isDaylight(hour) || rain > 0.6) return Infinity;
  const dawnBoost = hour < 9 ? 0.7 : 1;
  return (gang ? 5000 : 14000) * dawnBoost * (1 + rain * 2);
}

export function ambienceLevels(input: AmbienceInput) {
  const { indoor, gang } = input;
  const rain = clamp01(input.rain);
  const outdoor = !indoor;
  return {
    // Drizzle soft + bright (high-passed), heavy fuller; roof rain is muffled and quieter.
    rainGain: rain === 0 ? 0 : (0.012 + 0.06 * rain ** 1.3) * (indoor ? 0.45 : 1),
    rainHighpass: indoor ? 200 : 900 - 700 * rain,
    rainLowpass: indoor ? 700 + 500 * rain : 3200 + 3800 * rain,
    cricketGain: outdoor && isNightHour(input.hour) && rain < 0.5 ? 1 : 0,
    trafficGain: outdoor && !gang ? 0.012 * (1 - 0.5 * rain) : 0,
    thunder: rain > 0.8,
    // BGM multiplier while raining so the weather carries the mood.
    bgmDuck: 1 - 0.3 * rain,
  };
}
