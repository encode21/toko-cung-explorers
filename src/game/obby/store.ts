import { create } from "zustand";
import { useQuestCompletion } from "@/game/core/completion-store";
import { useGame } from "@/state/game-store";
import {
  completedObbyRun,
  emptyObbyRun,
  finishWarpPosition,
  landOnObby,
  OBBY_TITLE,
  respawnObbyRun,
  type ObbyRun,
} from "./model";
import { PLAYER_VISUAL_DROP } from "@/game/world/street-props";

interface ObbyState extends ObbyRun {
  land: (id: string) => void;
  respawn: () => void;
  reset: () => void;
  /** QA: jump to Finish already complete so parachute can be tested. */
  warpToFinish: () => void;
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
  warpToFinish: () => {
    set(completedObbyRun());
    useGame.getState().requestTeleport(finishWarpPosition(PLAYER_VISUAL_DROP));
    useGame.getState().setToast("TEST · Langsung ke Finish");
  },
}));
