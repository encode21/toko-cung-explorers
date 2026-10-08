import { KIOSK } from "./kiosk";
import { NPC_CONFIG } from "@/game/npc/population";
import { WORLD_POINTS } from "@/game/world/building/plan";
import {
  CASHIER_NPC_POS,
  NAKAMA_PACKING_POS,
  NAKAMA_WAREHOUSE_POS,
  SHELVES,
  type Vec3,
} from "@/game/world/layout";
import { BENCHES } from "@/game/world/street-props";

import { dynamicInteractableById } from "@/game/interactions/dynamic";

export type NpcRole =
  "kasir" | "owner" | "nakama-gudang" | "nakama-packing" | "kurir" | "pembeli" | "warga";

export interface Interactable {
  id: string;
  label: string;
  kind: "npc" | "shelf" | "cashier" | "bench" | "world" | "kiosk";
  position: Vec3;
  radius: number;
  /** Persona untuk AI NPC. */
  persona?: string;
  /** Peran NPC — menentukan konteks percakapan. */
  role?: NpcRole;
  /** Yaw bangku (untuk duduk menghadap benar). */
  yaw?: number;
}

export const PEDESTRIAN_ROUTE: Vec3[] = [
  [-12, 0, 11],
  [10, 0, 11],
];

export const INTERACTABLES: Interactable[] = [
  { ...KIOSK, kind: "kiosk" },
  ...WORLD_POINTS.map((point) => ({ ...point, kind: "world" as const })),
  ...SHELVES.map<Interactable>((s) => ({
    id: s.id,
    label: s.label,
    kind: "shelf",
    position: s.position,
    radius: 2.6,
  })),
  {
    id: "cashier-station",
    label: "Kasir Toko Cung",
    kind: "cashier",
    position: [CASHIER_NPC_POS[0], 0, 2.5],
    radius: 1.5,
  },
  {
    id: "npc-nakama-warehouse",
    role: "nakama-gudang",
    label: "Nakama Gudang",
    kind: "npc",
    position: NAKAMA_WAREHOUSE_POS,
    radius: 2.4,
    persona:
      "Nakama gudang Toko Cung yang mengurus stok dan restock rak. Tahu stok mana yang menipis.",
  },
  {
    id: "npc-nakama-packing",
    role: "nakama-packing",
    label: "Nakama Packing",
    kind: "npc",
    position: NAKAMA_PACKING_POS,
    radius: 2.4,
    persona: "Nakama packing Toko Cung yang membungkus pesanan online dan menyerahkan ke kurir.",
  },
  ...BENCHES.filter((b) => !NPC_CONFIG.some((n) => n.seatBenchId === b.id)).map<Interactable>(
    (b) => ({
      id: b.id,
      label: b.label,
      kind: "bench",
      position: b.position,
      radius: b.radius,
      yaw: b.yaw,
    }),
  ),
];

export function interactableById(id: string) {
  return INTERACTABLES.find((i) => i.id === id) ?? dynamicInteractableById(id);
}
