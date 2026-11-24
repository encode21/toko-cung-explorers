import { create } from "zustand";
import { dayKey, loadSkippedOn, saveSkippedOn } from "@/game/npc/quest-marker";

/** Lightweight scripted talk for the Daily Quest Giver — not AI chat. */
export const useQuestGiverDialogue = create<{
  open: boolean;
  busy: boolean;
  error: string;
  acceptedJustNow: boolean;
  /** Fixed NPC giver (Wali Kota / Kades) being talked to; "" for the Koko Cung flow. */
  giverId: string;
  /** Day the player chose "Nanti saja"; the "!" returns the next day. */
  skippedOn: string;
}>(() => ({
  open: false,
  busy: false,
  error: "",
  acceptedJustNow: false,
  giverId: "",
  skippedOn: loadSkippedOn(),
}));

export function openQuestGiverDialogue() {
  useQuestGiverDialogue.setState({
    open: true,
    busy: false,
    error: "",
    acceptedJustNow: false,
    giverId: "",
  });
}

export function openNpcGiverDialogue(giverId: string) {
  useQuestGiverDialogue.setState({
    open: true,
    busy: false,
    error: "",
    acceptedJustNow: false,
    giverId,
  });
}

export function skipQuest() {
  const today = dayKey();
  saveSkippedOn(today);
  useQuestGiverDialogue.setState({ skippedOn: today });
  closeQuestGiverDialogue();
}

export function closeQuestGiverDialogue() {
  useQuestGiverDialogue.setState({
    open: false,
    busy: false,
    error: "",
    acceptedJustNow: false,
    giverId: "",
  });
}
