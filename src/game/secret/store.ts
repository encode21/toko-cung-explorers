import { create } from "zustand";
import type { SecretFeedback } from "./types";

interface SecretState {
  open: boolean;
  objectiveIndex: number | null;
  feedback: SecretFeedback | null;
  localAttempts: number;
  revealMarkers: boolean;
  forceClueIndex: number | null;
  openDiscovery: (objectiveIndex: number) => void;
  closeDiscovery: () => void;
  setFeedback: (feedback: SecretFeedback | null) => void;
  bumpLocalAttempts: () => void;
  setRevealMarkers: (v: boolean) => void;
  setForceClueIndex: (n: number | null) => void;
  resetLocal: () => void;
}

export const useSecretQuest = create<SecretState>((set) => ({
  open: false,
  objectiveIndex: null,
  feedback: null,
  localAttempts: 0,
  revealMarkers: false,
  forceClueIndex: null,
  openDiscovery: (objectiveIndex) =>
    set({ open: true, objectiveIndex, feedback: null, localAttempts: 0 }),
  closeDiscovery: () => set({ open: false, objectiveIndex: null, feedback: null }),
  setFeedback: (feedback) => set({ feedback }),
  bumpLocalAttempts: () => set((s) => ({ localAttempts: s.localAttempts + 1 })),
  setRevealMarkers: (revealMarkers) => set({ revealMarkers }),
  setForceClueIndex: (forceClueIndex) => set({ forceClueIndex }),
  resetLocal: () =>
    set({
      open: false,
      objectiveIndex: null,
      feedback: null,
      localAttempts: 0,
      revealMarkers: false,
      forceClueIndex: null,
    }),
}));
