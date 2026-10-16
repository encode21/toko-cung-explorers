import { create } from "zustand";

/** Lightweight scripted talk for the Daily Quest Giver — not AI chat. */
export const useQuestGiverDialogue = create<{
  open: boolean;
  busy: boolean;
  error: string;
  acceptedJustNow: boolean;
}>(() => ({
  open: false,
  busy: false,
  error: "",
  acceptedJustNow: false,
}));

export function openQuestGiverDialogue() {
  useQuestGiverDialogue.setState({ open: true, busy: false, error: "", acceptedJustNow: false });
}

export function closeQuestGiverDialogue() {
  useQuestGiverDialogue.setState({ open: false, busy: false, error: "", acceptedJustNow: false });
}
