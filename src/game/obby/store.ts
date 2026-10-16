import { create } from "zustand";
import { useQuestCompletion } from "@/game/core/completion-store";
import { useGame } from "@/state/game-store";
import { emptyObbyRun, landOnObby, OBBY_TITLE, respawnObbyRun, type ObbyRun } from "./model";

interface ObbyState extends ObbyRun {
  land: (id: string) => void;
  respawn: () => void;
  reset: () => void;
}

/** Session-only practice progress. Currency and persistent quest rewards remain server-owned. */
export const useObby = create<ObbyState>((set, get) => ({
  ...emptyObbyRun(),
  land: (id) => {
    const previous = get();
    const next = landOnObby(previous, id, Date.now());
    if (next === previous) return;
    set(next);
    if (next.checkpoint !== previous.checkpoint) {
      useGame.getState().setToast("Checkpoint tersimpan · Jatuh? Kembali ke sini!");
    }
    if (next.status === "complete") {
      useQuestCompletion.getState().show({
        title: OBBY_TITLE,
        durationSeconds: (Date.now() - next.startedAt) / 1000,
        xpAwarded: 0,
        clueXp: 0,
        pointAwarded: 0,
        theme: "plaza-obby",
      });
    }
  },
  respawn: () => set(respawnObbyRun(get())),
  reset: () => set(emptyObbyRun()),
}));
