import { create } from "zustand";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { enterGang, useGang } from "@/game/gang/store";
import { HOME_SPOTS, homeWorld } from "./model";

export const useHome = create<{ inside: boolean; windowOpen: boolean; leaving: boolean }>(() => ({
  inside: false,
  windowOpen: false,
  leaving: false,
}));

export function enterHome() {
  useHud.getState().setSheet(null);
  useGang.setState({ inside: null, customize: false, board: false });
  useHome.setState({ inside: true });
  useGame.setState({ waypoint: null, pendingTeleport: homeWorld(HOME_SPOTS.spawn) });
}
/** The door opens onto the player's own teras (gang arrival defaults to the own house). */
export async function leaveHome() {
  if (useHome.getState().leaving) return;
  useHome.setState({ leaving: true });
  try {
    await enterGang();
    if (useGang.getState().inside !== null) useHome.setState({ inside: false });
  } finally {
    useHome.setState({ leaving: false });
  }
}
