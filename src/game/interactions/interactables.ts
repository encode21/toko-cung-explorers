import {
  CASHIER_NPC_POS,
  COURIER_POS,
  NAKAMA_PACKING_POS,
  NAKAMA_WAREHOUSE_POS,
  OWNER_POS,
  SHELVES,
  type Vec3,
} from "@/game/world/layout";
import { BENCHES } from "@/game/world/street-props";

import { dynamicInteractableById } from "@/game/interactions/dynamic";

export type NpcRole =
  | "kasir"
  | "owner"
  | "nakama-gudang"
  | "nakama-packing"
  | "kurir"
  | "pembeli"
  | "warga";

export interface Interactable {
  id: string;
  label: string;
  kind: "npc" | "shelf" | "cashier" | "bench";
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
    position: [CASHIER_NPC_POS[0] - 1.2, 0, CASHIER_NPC_POS[2] + 1.6],
    radius: 2.2,
  },
  {
    id: "npc-cashier",
    role: "kasir",
    label: "Mbak Rina (Kasir)",
    kind: "npc",
    position: CASHIER_NPC_POS,
    radius: 2.4,
    persona: "Rina, kasir Toko Cung yang ramah dan cepat. Bisa bantu cari produk dan jelaskan cara bayar QRIS/VA.",
  },
  {
    id: "npc-owner",
    role: "owner",
    label: "Pak Cung (Owner)",
    kind: "npc",
    position: OWNER_POS,
    radius: 2.4,
    persona: "Pak Cung, pemilik Toko Cung. Bicara hangat, suka cerita soal toko, promo, dan pelanggan langganan.",
  },
  {
    id: "npc-nakama-warehouse",
    role: "nakama-gudang",
    label: "Nakama Gudang",
    kind: "npc",
    position: NAKAMA_WAREHOUSE_POS,
    radius: 2.4,
    persona: "Nakama gudang Toko Cung yang mengurus stok dan restock rak. Tahu stok mana yang menipis.",
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
  {
    id: "npc-courier",
    role: "kurir",
    label: "Kurir",
    kind: "npc",
    position: COURIER_POS,
    radius: 2.6,
    persona: "Kurir yang baru sampai di depan Toko Cung untuk pickup paket. Santai dan singkat.",
  },
  ...BENCHES.map<Interactable>((b) => ({
    id: b.id,
    label: b.label,
    kind: "bench",
    position: b.position,
    radius: b.radius,
    yaw: b.yaw,
  })),
];

export function interactableById(id: string) {
  return INTERACTABLES.find((i) => i.id === id) ?? dynamicInteractableById(id);
}
