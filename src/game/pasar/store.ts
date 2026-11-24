import { create } from "zustand";
import { takeEnergy } from "@/game/energy/store";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { setLocalSocialAnim } from "@/game/social/social-actions";
import { useGame } from "@/state/game-store";
import { useWarung } from "@/game/warung/store";
import { loadJobs } from "@/game/easyjobs/store";
import { eatToast, kioskById, type KioskId, type MenuItem } from "./model";

interface PasarState {
  /** Kiosk whose shop sheet is open. */
  open: KioskId | null;
  busy: boolean;
  /** Vendor bark bubble, shown until `until` (Date.now ms). */
  bark: { kiosk: KioskId; text: string; until: number } | null;
}
export const usePasar = create<PasarState>(() => ({ open: null, busy: false, bark: null }));
export const openPasar = (id: KioskId) => usePasar.setState({ open: id });
export const closePasar = () => usePasar.setState({ open: null });

interface PasarResponse {
  energy: { value: number };
  spent: number;
  kas: { cash: number | null; savings: number };
}

export async function buyFood(kioskId: KioskId, item: MenuItem, qty = 1) {
  const k = kioskById(kioskId);
  if (!k || usePasar.getState().busy) return;
  usePasar.setState({ busy: true });
  try {
    const r = await worldRequest<PasarResponse>("pasar", {
      action: "buy",
      requestId: createId(),
      kiosk: kioskId,
      item: item.id,
      qty,
    });
    takeEnergy(r);
    const { cash } = r.kas;
    if (cash != null)
      useWarung.setState((w) =>
        w.data?.warung ? { data: { ...w.data, warung: { ...w.data.warung, cash } } } : w,
      );
    setLocalSocialAnim("Drink", 2400);
    useGame.getState().setToast(eatToast(item, qty));
    usePasar.setState({
      bark: {
        kiosk: kioskId,
        text: k.barks[Math.floor(Math.random() * k.barks.length)]!,
        until: Date.now() + 3500,
      },
    });
    void loadJobs();
  } catch (e) {
    useGame.getState().setToast(e instanceof Error ? e.message : "Gagal, coba lagi.");
  } finally {
    usePasar.setState({ busy: false });
  }
}
