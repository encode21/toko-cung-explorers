/** Server disaster kinds (config/world-disasters.php) → alert headline and phone vibration. */
const TITLES: Record<string, string> = {
  banjir: "Banjir!",
  gempa: "Gempa bumi!",
  angin_kencang: "Angin kencang!",
  korsleting: "Korsleting listrik!",
};

/** How long the screen shakes when the alert opens. */
export const QUAKE_MS = 2400;

export function disasterTitle(kind?: string) {
  return (kind && TITLES[kind]) || "Bencana!";
}

/** An earthquake buzzes longer and harder than the other disasters. */
export function vibrationPattern(kind?: string): number[] {
  return kind === "gempa" ? [500, 120, 500, 120, 700] : [300, 120, 300];
}
