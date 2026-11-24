import { create } from "zustand";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { enterGang, useGang } from "@/game/gang/store";
import { HOME_SPOTS, homeWorld } from "./model";
import { cityHalteArrival } from "@/game/gang/model";
import { showLoader } from "@/ui/hud/travel-loader";

export const useHome = create<{ inside: boolean; windowOpen: boolean; leaving: boolean }>(() => ({
  inside: false,
  windowOpen: false,
  leaving: false,
}));

export function enterHome() {
  showLoader("Masuk rumah", "Pulang dulu, istirahat sebentar", "rumah", 900);
  useHud.getState().setSheet(null);
  useGang.setState({ inside: null, customize: false, board: false });
  useHome.setState({ inside: true });
  useGame.setState({ waypoint: null, pendingTeleport: homeWorld(HOME_SPOTS.spawn) });
}
/** The door opens onto the player's own teras (gang arrival defaults to the own house). */
export async function leaveHome() {
  if (useHome.getState().leaving) return;
  useHome.setState({ leaving: true });
  showLoader("Keluar rumah", "Menuju gang kampung", "gang", 900);
  try {
    await enterGang();
    if (useGang.getState().inside !== null) useHome.setState({ inside: false });
    else {
      // Gang unreachable (API down, retry pending, blocked): never trap the player, drop them at the city gate.
      const gate = useGang.getState().data?.layout.gate ?? { x: -30, z: -60 };
      useHome.setState({ inside: false });
      useGame.setState({ waypoint: null, pendingTeleport: cityHalteArrival(gate) });
    }
  } finally {
    useHome.setState({ leaving: false });
  }
}
