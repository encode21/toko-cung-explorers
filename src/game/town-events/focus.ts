import { create } from "zustand";
import { useGame } from "@/state/game-store";

export const useActivityFocus = create(() => ({ selected: null as string | null }));

export function trackActivity(selected: string) {
  useActivityFocus.setState({ selected });
  useGame.setState({ waypoint: null, guidanceMuted: false });
}
