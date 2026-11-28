import { create } from "zustand";
import type { ContextAction } from "@/game/interactions/context-action";
import { BUILDING_LOTS } from "@/game/world/outdoor-layout";
import { useGang } from "@/game/gang/store";
import { useGame } from "@/state/game-store";

export const NIAGA_NAME = "Cung Niaga";
export const NIAGA_WAYPOINT = "venue-niaga";
/** Ruko tetangga timur Cung Motor (partner-5); menghadap -z seperti deretan ruko partner. */
export const NIAGA_LOT = BUILDING_LOTS.find((l) => l.id === "partner-5")!;
const front = NIAGA_LOT.z - NIAGA_LOT.depth / 2;
export const NIAGA_COUNTER: [number, number] = [NIAGA_LOT.x, front - 1];
/** Pajangan sejajar fasad, di antara trotoar dan ruko; pintu (±2 m dari tengah) dibiarkan lega. */
export const NIAGA_DISPLAY = [
  { kind: "viar", color: "#e6a817", x: NIAGA_LOT.x - 4, z: front - 2 },
  { kind: "pickup", color: "#f4f1ea", x: NIAGA_LOT.x + 4.4, z: front - 2 },
  { kind: "truck", color: "#2f6fb0", x: NIAGA_LOT.x + 10.5, z: front - 2 },
] as const;

export const useNiagaDealer = create<{ open: boolean }>(() => ({ open: false }));
export const openNiagaDealer = () => useNiagaDealer.setState({ open: true });
export const closeNiagaDealer = () => useNiagaDealer.setState({ open: false });

export function niagaContextActions(): ContextAction[] {
  if (useGang.getState().inside !== null) return [];
  const p = useGame.getState().playerPos;
  const distance = Math.hypot(p[0] - NIAGA_COUNTER[0], p[2] - NIAGA_COUNTER[1]);
  if (distance > 3.5 || p[1] > 2) return [];
  return [
    {
      id: "niaga:dealer",
      label: "Lihat Viar, Pickup & Truk",
      title: NIAGA_NAME,
      distance,
      priority: 2,
      busy: false,
      execute: openNiagaDealer,
    },
  ];
}
