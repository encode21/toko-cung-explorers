import { create } from "zustand";

/** Local input lock; never pauses networking, physics ownership, or session renewal. */
export const useGameUi = create<{
  portrait: boolean;
  panels: number;
  traveling: boolean;
  storeIntro: boolean;
  storeWalk: boolean;
  warungWalk: boolean;
  clubWalk: boolean;
}>()(() => ({
  portrait: false,
  panels: 0,
  traveling: false,
  storeIntro: false,
  storeWalk: false,
  warungWalk: false,
  clubWalk: false,
}));

export const gameUiBlocked = () => {
  const s = useGameUi.getState();
  return (
    s.portrait ||
    s.panels > 0 ||
    s.traveling ||
    s.storeIntro ||
    s.storeWalk ||
    s.warungWalk ||
    s.clubWalk
  );
};
