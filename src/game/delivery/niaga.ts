import { create } from "zustand";
import type { ContextAction } from "@/game/interactions/context-action";
import { BUILDING_LOTS } from "@/game/world/outdoor-layout";
import { useGang } from "@/game/gang/store";
import { useGame } from "@/state/game-store";

export const NIAGA_NAME = "Cung Niaga";
/** Ruko tetangga timur Cung Motor (partner-5); menghadap -z seperti deretan ruko partner. */
const lot = BUILDING_LOTS.find((l) => l.id === "partner-5")!;
export const NIAGA_COUNTER: [number, number] = [lot.x, lot.z - lot.depth / 2 - 1];

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
