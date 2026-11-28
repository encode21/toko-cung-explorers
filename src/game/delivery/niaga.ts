import { create } from "zustand";
import type { ContextAction } from "@/game/interactions/context-action";
import { isNiagaRoom, NIAGA_NAME, NIAGA_VENUE } from "@/game/showroom/layout";
import { useGame } from "@/state/game-store";

export { NIAGA_NAME } from "@/game/showroom/layout";

/** Meja sales galeri (sama dengan meja kasir Cung Motor), relatif ke origin ruangan. */
const COUNTER: [number, number] = [-10.8, 9.4];

export const useNiagaDealer = create<{ open: boolean }>(() => ({ open: false }));
export const openNiagaDealer = () => useNiagaDealer.setState({ open: true });
export const closeNiagaDealer = () => useNiagaDealer.setState({ open: false });

export function niagaContextActions(): ContextAction[] {
  const p = useGame.getState().playerPos;
  if (!isNiagaRoom(p[0], p[2])) return [];
  const [ox, , oz] = NIAGA_VENUE.room.origin;
  const distance = Math.hypot(p[0] - (ox + COUNTER[0]), p[2] - (oz + COUNTER[1]));
  if (distance > 3.4) return [];
  return [
    {
      id: "niaga:catalog",
      label: "Lihat katalog & beli",
      title: NIAGA_NAME,
      distance,
      priority: 2,
      busy: false,
      execute: openNiagaDealer,
    },
  ];
}
