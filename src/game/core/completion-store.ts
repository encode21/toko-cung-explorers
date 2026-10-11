import { create } from "zustand";

export interface QuestCompletion {
  title: string;
  durationSeconds: number;
  /** Chapter completion XP from rewards.xp */
  xpAwarded: number;
  /** Sum of per-clue XP (secret quests); 0 for ordinary quests */
  clueXp: number;
  pointAwarded: number;
  theme?: string | null;
}

interface CompletionState {
  result: QuestCompletion | null;
  show: (result: QuestCompletion) => void;
  dismiss: () => void;
}

export const useQuestCompletion = create<CompletionState>((set) => ({
  result: null,
  show: (result) => set({ result }),
  dismiss: () => set({ result: null }),
}));

export function formatMissionTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}
