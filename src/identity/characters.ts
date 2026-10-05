/** Katalog karakter koleksi. Pembelian nyata nanti lewat backend pembayaran. */
export type Rarity = "starter" | "exclusive" | "premium" | "limited" | "signature";
import type { AvatarConfig } from "@/identity/avatar";
export type CharacterAvailability = "available" | "coming-soon";

export interface CollectibleCharacter {
  id: string;
  name: string;
  rarity: Rarity;
  badges: string[];
  description: string;
  /** Harga indikatif (IDR) — harga final ditentukan backend. */
  priceIdr: number | null;
  availability: CharacterAvailability;
}

export const COLLECTIBLES: CollectibleCharacter[] = [
  {
    id: "koko-cung",
    name: "Koko Cung",
    rarity: "signature",
    badges: ["Exclusive", "Signature Character"],
    description:
      "Koko Cung adalah karakter ikonik eksklusif Toko Cung World dengan outfit cheongsam merah khas. Bisa dimiliki sebagai koleksi premium dan digunakan di dalam dunia.",
    priceIdr: 49000,
    availability: "available",
  },
  { id: "ci-cung", name: "Ci Cung", rarity: "exclusive", badges: ["Exclusive"], description: "Kakak Koko Cung yang jago hitung stok.", priceIdr: null, availability: "coming-soon" },
  { id: "kasir-cung", name: "Kasir Cung", rarity: "premium", badges: ["Premium"], description: "Kasir paling cepat se-Toko Cung.", priceIdr: null, availability: "coming-soon" },
  { id: "gudang-cung", name: "Gudang Cung", rarity: "premium", badges: ["Premium"], description: "Raja palet dan forklift.", priceIdr: null, availability: "coming-soon" },
  { id: "driver-cung", name: "Driver Cung", rarity: "premium", badges: ["Premium"], description: "Kurir andalan, paket selalu tepat waktu.", priceIdr: null, availability: "coming-soon" },
  { id: "imlek-cung", name: "Cung Imlek", rarity: "limited", badges: ["Limited", "Seasonal"], description: "Edisi musiman Tahun Baru Imlek.", priceIdr: null, availability: "coming-soon" },
];

export const RARITY_COLOR: Record<Rarity, string> = {
  starter: "#8aa4c8",
  exclusive: "#d9503f",
  premium: "#c98a3c",
  limited: "#d65a8a",
  signature: "#c9a227",
};

export function collectibleById(id: string | null | undefined) {
  return COLLECTIBLES.find((c) => c.id === id) ?? null;
}

const NPC_BASE: AvatarConfig = {
  hair: "short", hairColor: "#241b17", skin: "#eac09a", expression: "smile",
  outfit: "casual", outfitColor: "#3f86c9", accessory: "none",
};

/** Preset ringan agar pemain, warga, dan Nakama memakai bahasa visual yang sama. */
export const NPC_AVATARS: Record<string, AvatarConfig> = {
  "npc-cashier": { ...NPC_BASE, hair: "bob", outfit: "cashier", accessory: "headset" },
  "npc-owner": { ...NPC_BASE, hairColor: "#6a5448", outfit: "smart", outfitColor: "#5c6b80", accessory: "glasses" },
  "npc-courier": { ...NPC_BASE, hair: "cap", outfit: "driver", expression: "grin" },
  "npc-shopper-1": { ...NPC_BASE, hair: "buns", outfitColor: "#d65a8a" },
  "npc-shopper-2": { ...NPC_BASE, hair: "spiky", skin: "#d9a47a", outfitColor: "#4fb39a" },
  "npc-shopper-3": { ...NPC_BASE, hair: "cap", outfit: "warehouse", skin: "#b97f57" },
  "npc-pedestrian-1": { ...NPC_BASE, hair: "bob", skin: "#f6d7bd", outfitColor: "#e0a83a", expression: "calm" },
  "npc-pedestrian-2": { ...NPC_BASE, hair: "cap", outfit: "driver", skin: "#8d5a3b" },
  "npc-nakama-warehouse": { ...NPC_BASE, hair: "cap", outfit: "warehouse", expression: "grin" },
  "npc-nakama-packing": { ...NPC_BASE, hair: "bob", outfit: "warehouse", accessory: "headset" },
};
