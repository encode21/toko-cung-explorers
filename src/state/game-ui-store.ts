import { create } from "zustand";

/** Local input lock; never pauses networking, physics ownership, or session renewal. */
export const useGameUi = create<{
  portrait: boolean;
  panels: number;
}>()(() => ({ portrait: false, panels: 0 }));

export const gameUiBlocked = () => {
  const s = useGameUi.getState();
  return s.portrait || s.panels > 0;
};
