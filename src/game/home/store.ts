import { create } from "zustand";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { enterGang, useGang } from "@/game/gang/store";
import { useProlog } from "@/game/prolog/store";
import { canLeaveHome, HOME_SPOTS, homeWorld } from "./model";
import { cityHalteArrival } from "@/game/gang/model";
import {
  beginTravelRequest,
  travelRequestCurrent,
  finishTravelRequest,
  cancelTravelRequest,
} from "@/ui/hud/travel-loader";

export const useHome = create<{ inside: boolean; windowOpen: boolean; leaving: boolean }>(() => ({
  inside: false,
  windowOpen: false,
  leaving: false,
}));

export function enterHome() {
  const request = beginTravelRequest(
    "Masuk rumah",
    "Pulang dulu, istirahat sebentar",
    "rumah",
    900,
  );
  useHud.getState().setSheet(null);
  useGang.setState({ inside: null, customize: false, board: false });
  useHome.setState({ inside: true });
  useGame.setState({ waypoint: null, pendingTeleport: homeWorld(HOME_SPOTS.spawn) });
  finishTravelRequest(request);
}
/** The door opens onto the player's own teras (gang arrival defaults to the own house). */
export async function leaveHome() {
  if (useHome.getState().leaving) return;
  if (!canLeaveHome(useProlog.getState().data)) {
    useGame.getState().setToast("Selesaikan tugas prolog sebelum keluar rumah.");
    return;
  }
  useHome.setState({ leaving: true });
  let request = beginTravelRequest("Keluar rumah", "Menuju gang kampung", "gang", 900);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Ignore a late destination response after the eight-second city fallback.
    const entered = await Promise.race([
      enterGang(undefined, {}, request).catch(() => false),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), 8000);
      }),
    ]);
    clearTimeout(timer);
    if (!travelRequestCurrent(request)) return;
    if (entered && useGang.getState().inside !== null) {
      useHome.setState({ inside: false });
    } else {
      cancelTravelRequest(request);
      request = beginTravelRequest("Kembali ke kota", "Menuju Gerbang Kampung", "kota", 700);
      const gate = useGang.getState().data?.layout.gate ?? { x: -30, z: -60 };
      useHome.setState({ inside: false });
      useGang.setState({ inside: null });
      useGame.setState({ waypoint: null, pendingTeleport: cityHalteArrival(gate) });
    }
    finishTravelRequest(request);
  } finally {
    clearTimeout(timer);
    useHome.setState({ leaving: false });
  }
}
