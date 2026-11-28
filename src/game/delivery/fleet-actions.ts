import type { ContextAction } from "@/game/interactions/context-action";
import { summonVehicle } from "@/game/garasi/store";
import { ownVehicle } from "@/game/vehicles/runtime";
import { useGame } from "@/state/game-store";
import { deliveryCommand, useDelivery } from "./store";

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

type DeliveryPile = { orderId: number; npcName: string; boxes: number; x: number; z: number };
const pilesByArea = new Map<string, DeliveryPile[]>();
export function setDeliveryPiles(area: string, piles: DeliveryPile[]) {
  pilesByArea.set(area, piles);
}

/** Paket antar sendiri di halaman warung: angkat dulu (seperti dus grosir bawa sendiri), lalu antar. */
export function deliveryPileActions(): ContextAction[] {
  if (ownVehicle()) return [];
  const [px, , pz] = useGame.getState().playerPos;
  let best: { pile: DeliveryPile; distance: number } | null = null;
  for (const pile of [...pilesByArea.values()].flat()) {
    const distance = Math.hypot(px - pile.x, pz - pile.z);
    if (distance <= 2.6 && (!best || distance < best.distance)) best = { pile, distance };
  }
  if (!best) return [];
  const { pile, distance } = best;
  return [
    {
      id: `delivery-pile:${pile.orderId}`,
      label: `Angkat paket ${pile.npcName} (${pile.boxes} dus)`,
      title: "Pesan antar",
      distance,
      priority: 2,
      busy: useDelivery.getState().busy,
      execute: async () => {
        if (!(await deliveryCommand("delivery_pickup", { orderId: pile.orderId }))) return;
        useDelivery.getState().setActiveSelfOrderId(pile.orderId);
        const game = useGame.getState();
        game.setWaypoint("delivery-target");
        game.setToast(
          `📦 Paket terangkat! Antar ke ${pile.npcName}: jalan kaki, motor, atau mobil.`,
        );
      },
    },
  ];
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
