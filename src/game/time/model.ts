export type TimeMode = "REAL_TIME" | "FIXED_TIME" | "DEMO_TIME";
export type TimeOfDay =
  "DAWN" | "MORNING" | "DAY" | "AFTERNOON" | "GOLDEN_HOUR" | "EVENING" | "NIGHT";
export const TIME_PRESETS = [
  "06:00",
  "08:30",
  "12:00",
  "16:00",
  "17:30",
  "19:00",
  "23:00",
] as const;
export const wrapMinutes = (minutes: number) => ((minutes % 1440) + 1440) % 1440;
export function parseWorldTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new Error("World time must be HH:mm (00:00–23:59)");
  const [h, m] = value.split(":").map(Number);
  return h! * 60 + m!;
}
/** WIB is UTC+7 year-round; independent of the browser's timezone. */
export function jakartaMinutes(epochMs: number) {
  return wrapMinutes(epochMs / 60000 + 7 * 60);
}
export function describeTime(value: number) {
  const minutes = wrapMinutes(value);
  const hour = Math.floor(minutes / 60);
  const minute = Math.floor(minutes % 60);
  const timeOfDay: TimeOfDay =
    minutes < 300
      ? "NIGHT"
      : minutes < 390
        ? "DAWN"
        : minutes < 600
          ? "MORNING"
          : minutes < 900
            ? "DAY"
            : minutes < 1020
              ? "AFTERNOON"
              : minutes < 1095
                ? "GOLDEN_HOUR"
                : minutes < 1320
                  ? "EVENING"
                  : "NIGHT";
  return {
    minutes,
    hour,
    minute,
    currentTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    timeOfDay,
    dayProgress: minutes / 1440,
    normalizedDayProgress: minutes / 1440,
    isNight: minutes >= 1095 || minutes < 300,
    isStoreOpen: minutes >= 420 && minutes < 1320,
  };
}
export function smoothRange(start: number, end: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}
export function artificialLightLevels(minutes: number) {
  const night = 1 - smoothRange(300, 390, minutes) + smoothRange(1050, 1095, minutes);
  const open = smoothRange(390, 420, minutes) * (1 - smoothRange(1320, 1350, minutes));
  return { street: night, store: 0.22 + night * (0.23 + open * 0.55) };
}
/** East = +X, west = -X; a small southerly offset lights the storefront facade. */
export function sunDirection(minutes: number): [number, number, number] {
  const angle = ((minutes - 360) / 720) * Math.PI;
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  const z = 0.32;
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}
