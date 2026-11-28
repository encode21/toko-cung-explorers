import type { ContextAction } from "@/game/interactions/context-action";
import { summonVehicle } from "@/game/garasi/store";
import { ownVehicle } from "@/game/vehicles/runtime";
import { useGame } from "@/state/game-store";

type ParkedFleet = {
  label: string;
  type: "motor" | "viar" | "truk";
  owned: boolean;
  variant: string | null;
  x: number;
  z: number;
  reach: number;
};

/** Posisi armada yang sedang dirender per area (kota/kampung), diisi oleh DeliveryVehicles. */
const parkedByArea = new Map<string, ParkedFleet[]>();
export function setParkedFleet(area: string, fleet: ParkedFleet[]) {
  parkedByArea.set(area, fleet);
}

/** Dekat Viar/Pickup/Truk armada: milik sendiri → panggil versi yang bisa dikendarai; sewa → arahkan ke dealer. */
export function fleetContextActions(): ContextAction[] {
  if (ownVehicle()) return [];
  const [px, , pz] = useGame.getState().playerPos;
  let best: { fleet: ParkedFleet; distance: number } | null = null;
  for (const fleet of [...parkedByArea.values()].flat()) {
    if (fleet.type === "motor") continue;
    const distance = Math.hypot(px - fleet.x, pz - fleet.z);
    if (distance <= fleet.reach && (!best || distance < best.distance)) best = { fleet, distance };
  }
  if (!best) return [];
  const { fleet, distance } = best;
  return [
    {
      id: `fleet:${fleet.label}`,
      label: fleet.owned ? `Kendarai ${fleet.label}` : `${fleet.label} · masih sewa`,
      title: "Armada warung",
      distance,
      priority: 2,
      busy: false,
      execute: () =>
        fleet.owned
          ? summonVehicle(`niaga:${fleet.variant}`, "here")
          : useGame
              .getState()
              .setToast(
                "Kendaraan sewa hanya untuk antar pesanan. Beli di Cung Niaga untuk dikendarai.",
              ),
    },
  ];
}
