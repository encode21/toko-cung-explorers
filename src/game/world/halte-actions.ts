import type { ContextAction } from "@/game/interactions/context-action";
import { enterGang, useGang } from "@/game/gang/store";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { useGame } from "@/state/game-store";
import { showLoader } from "@/ui/hud/travel-loader";
import { useWarung } from "@/game/warung/store";
import { HALTE_BOARD } from "./halte-jpo";

/** Bus routes from Halte Toko Cung; the server charges the fare (config/world-bus.php). */
const ROUTES = [
  { to: "gang", label: "Bus ke Gang Kampung · Rp3.500" },
  { to: "pasar", label: "Bus ke Pasar · Rp3.500" },
] as const;
let riding = false;

async function ride(to: "gang" | "pasar") {
  if (riding) return;
  riding = true;
  try {
    const r = await worldRequest<{ kas: { cash: number | null } }>("bus", {
      action: "ride",
      to,
      requestId: createId(),
    });
    const cash = r.kas.cash;
    if (cash != null)
      useWarung.setState((w) =>
        w.data?.warung ? { data: { ...w.data, warung: { ...w.data.warung, cash } } } : w,
      );
    if (to === "gang") {
      showLoader("Naik bus ke Gang Kampung", "Turun dekat rumahmu", "bus", 2600);
      await enterGang();
    } else {
      showLoader("Naik bus ke Pasar", "Turun di depan pasar", "bus", 2600);
      useGame.setState({ waypoint: null, pendingTeleport: [104, 0.83, 7] });
    }
  } catch (e) {
    useGame.getState().setToast(e instanceof Error ? e.message : "Bus belum bisa berangkat.");
  } finally {
    riding = false;
  }
}

export function halteContextActions(): ContextAction[] {
  if (useGang.getState().inside !== null) return [];
  const p = useGame.getState().playerPos;
  const distance = Math.hypot(p[0] - HALTE_BOARD[0], p[2] - HALTE_BOARD[2]);
  if (distance > 3.5 || p[1] > 2) return [];
  return ROUTES.map((r) => ({
    id: `halte:${r.to}`,
    label: r.label,
    title: "Halte Toko Cung",
    distance,
    priority: 2,
    busy: riding,
    execute: () => ride(r.to),
  }));
}
