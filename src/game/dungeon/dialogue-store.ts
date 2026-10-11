import { create } from "zustand";
import type { DungeonDialogueScript } from "./dialogue";

interface DungeonDialogueState {
  script: DungeonDialogueScript | null;
  lineIndex: number;
  submitting: boolean;
  error: string;
  open: (script: DungeonDialogueScript) => void;
  advance: () => void;
  setSubmitting: (v: boolean) => void;
  setError: (error: string) => void;
  close: () => void;
}

export const useDungeonDialogue = create<DungeonDialogueState>((set, get) => ({
  script: null,
  lineIndex: 0,
  submitting: false,
  error: "",
  open: (script) => set({ script, lineIndex: 0, submitting: false, error: "" }),
  advance: () => {
    const { script, lineIndex } = get();
    if (!script) return;
    if (lineIndex < script.lines.length - 1) set({ lineIndex: lineIndex + 1, error: "" });
  },
  setSubmitting: (submitting) => set({ submitting }),
  setError: (error) => set({ error, submitting: false }),
  close: () => set({ script: null, lineIndex: 0, submitting: false, error: "" }),
}));
