import type { ContextAction } from "@/game/interactions/context-action";
import { enterGang, busToGangBlocked, useGang } from "@/game/gang/store";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { useGame } from "@/state/game-store";
import { useWarung } from "@/game/warung/store";
import { HALTE_BOARD, HALTE_BUS } from "./halte-jpo";
import { startBusRide, useBusRide } from "./bus-ride";

/** Bus routes from Halte Toko Cung; the server charges the fare (config/world-bus.php). */
const ROUTES = [
  { to: "gang", label: "Bus ke Gang Kampung · Rp3.500" },
  { to: "pasar", label: "Bus ke Pasar · Rp3.500" },
] as const;

/** Outer westbound lane, then south on Jalan Kampung toward the gang gate. */
const TO_GANG = [
  { x: HALTE_BUS.x, z: HALTE_BUS.z },
  { x: -24, z: HALTE_BUS.z },
  { x: -30, z: 12 },
  { x: -30, z: -28 },
];
/** Pull into the eastbound lane and run toward the market. */
const TO_PASAR = [
  { x: HALTE_BUS.x, z: HALTE_BUS.z },
  { x: 4, z: 18.2 },
  { x: 55, z: 18.2 },
  { x: 96, z: 14 },
];

let riding = false;

async function ride(to: "gang" | "pasar") {
  if (riding || useBusRide.getState().riding) return;
  if (to === "gang") {
    const blocked = busToGangBlocked();
    if (blocked) {
      useGame.getState().setToast(blocked);
      return;
    }
  }
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
      await startBusRide({
        title: "Bus ke Gang Kampung",
        path: TO_GANG,
        arrive: () => enterGang(),
      });
    } else {
      await startBusRide({
        title: "Bus ke Pasar",
        path: TO_PASAR,
        arrive: async () => {
          useGame.setState({ waypoint: null, pendingTeleport: [104, 0.83, 7] });
          return true;
        },
      });
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
    busy: riding || useBusRide.getState().riding,
    execute: () => ride(r.to),
  }));
}
