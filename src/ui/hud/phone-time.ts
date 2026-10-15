import type { TimeOfDay } from "@/game/time/model";

export const PHONE_PERIODS = [
  { id: "late", label: "Dini hari" },
  { id: "dawn", label: "Pagi" },
  { id: "day", label: "Siang" },
  { id: "dusk", label: "Sore" },
  { id: "night", label: "Malam" },
] as const;

export type PhoneSky = (typeof PHONE_PERIODS)[number]["id"];

/** Follow the world's lighting periods, including its 18:15 transition to night. */
export function phoneSky(timeOfDay: TimeOfDay, minutes: number): PhoneSky {
  if (minutes < 300) return "late";
  if (timeOfDay === "DAWN" || timeOfDay === "MORNING") return "dawn";
  if (timeOfDay === "DAY") return "day";
  if (timeOfDay === "AFTERNOON" || timeOfDay === "GOLDEN_HOUR") return "dusk";
  return "night";
}
