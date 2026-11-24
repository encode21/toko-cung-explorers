/** Pure "!" marker state for fixed quest-giver NPCs (Pak Wali Kota, Pak Kades). */
export type QuestMarkerState = "available" | "accepted" | "skipped" | "none";

export const SKIP_KEY = "world.questSkippedOn";

/** Local calendar day: a skipped quest comes back with tomorrow's quests. */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function questMarkerState(a: {
  available: boolean;
  hasQuests: boolean;
  skippedOn: string;
  today: string;
}): QuestMarkerState {
  if (a.available) return a.skippedOn === a.today ? "skipped" : "available";
  return a.hasQuests ? "accepted" : "none";
}

export function loadSkippedOn(): string {
  try {
    return globalThis.localStorage?.getItem(SKIP_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveSkippedOn(day: string) {
  try {
    globalThis.localStorage?.setItem(SKIP_KEY, day);
  } catch {
    /* private mode: skip only lasts this session */
  }
}

/** Fixed quest givers. `at` is world position for the city and scene-local for the gang. */
export const QUEST_GIVERS = {
  "npc-wali-kota": {
    name: "Pak Wali Kota",
    role: "Wali Kota",
    line: "Selamat datang di kota kita! Ada beberapa tugas kota hari ini. Mau bantu warga?",
  },
  "npc-pak-kades": {
    name: "Pak Kades",
    role: "Kepala Desa",
    line: "Nah, warga gang! Hari ini ada beberapa urusan kampung. Bisa bantu Bapak?",
  },
  "npc-mang-udin": {
    name: "Mang Udin",
    role: "Gorengan pasar",
    line: "Pesanan gorengan numpuk, bantu Mang antar ya!",
  },
  "npc-bu-sri": {
    name: "Bu Sri",
    role: "Buah segar",
    line: "Ada parsel buah yang harus diantar. Bisa bantu Ibu?",
  },
  "gang-neighbor-a": {
    name: "Pak RT Kosim",
    role: "Ketua RT",
    line: "Iuran sampah belum kekumpul. Bantu Bapak tagih ya.",
  },
} as const;
export type QuestGiverId = keyof typeof QUEST_GIVERS;
export const KADES_LOCAL: [number, number, number] = [4, 0, -4];
