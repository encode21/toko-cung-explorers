import type { AvatarConfig } from "./avatar";
export const COSMETIC_SLOTS = ["hair", "face", "skin", "tops", "bottoms", "shoes", "headwear", "eyewear", "backpacks", "roleAccessories"] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];
export type EquippedCosmetics = Partial<Record<CosmeticSlot, string>>;
export interface Cosmetic {
 id: string; slot: CosmeticSlot; label: string; rarity: "common" | "rare" | "exclusive";
 eligibility: "free" | "owned" | "role" | "locked"; role: string | null; price: number;
 appearance: Partial<Omit<AvatarConfig, "equipped">>; mesh: string | null;
}
// Render manifest; availability and ownership always come from the authenticated catalog API.
export const COSMETICS: readonly Cosmetic[] = [
  {
    "id": "hair-short",
    "slot": "hair",
    "label": "Pendek",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "hair": "short"
    },
    "mesh": null
  },
  {
    "id": "hair-spiky",
    "slot": "hair",
    "label": "Jabrik",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "hair": "spiky"
    },
    "mesh": null
  },
  {
    "id": "hair-bob",
    "slot": "hair",
    "label": "Bob",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "hair": "bob"
    },
    "mesh": null
  },
  {
    "id": "hair-buns",
    "slot": "hair",
    "label": "Cepol",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "hair": "buns"
    },
    "mesh": null
  },
  {
    "id": "hair-buzz",
    "slot": "hair",
    "label": "Cepak",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "hair": "buzz"
    },
    "mesh": null
  },
  {
    "id": "hair-sidepart",
    "slot": "hair",
    "label": "Belah samping",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "hair": "sidepart"
    },
    "mesh": null
  },
  {
    "id": "hair-ponytail",
    "slot": "hair",
    "label": "Kuncir",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "hair": "ponytail"
    },
    "mesh": null
  },
  {
    "id": "hair-hijab",
    "slot": "hair",
    "label": "Hijab",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "hair": "hijab"
    },
    "mesh": null
  },
  {
    "id": "face-smile",
    "slot": "face",
    "label": "Senyum",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "expression": "smile"
    },
    "mesh": null
  },
  {
    "id": "face-grin",
    "slot": "face",
    "label": "Ceria",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "expression": "grin"
    },
    "mesh": null
  },
  {
    "id": "face-wink",
    "slot": "face",
    "label": "Kedip",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "expression": "wink"
    },
    "mesh": null
  },
  {
    "id": "face-calm",
    "slot": "face",
    "label": "Kalem",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "expression": "calm"
    },
    "mesh": null
  },
  {
    "id": "skin-1",
    "slot": "skin",
    "label": "Warna kulit 1",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "skin": "#f6d7bd"
    },
    "mesh": null
  },
  {
    "id": "skin-2",
    "slot": "skin",
    "label": "Warna kulit 2",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "skin": "#eac09a"
    },
    "mesh": null
  },
  {
    "id": "skin-3",
    "slot": "skin",
    "label": "Warna kulit 3",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "skin": "#d9a47a"
    },
    "mesh": null
  },
  {
    "id": "skin-4",
    "slot": "skin",
    "label": "Warna kulit 4",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "skin": "#b97f57"
    },
    "mesh": null
  },
  {
    "id": "skin-5",
    "slot": "skin",
    "label": "Warna kulit 5",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "skin": "#8d5a3b"
    },
    "mesh": null
  },
  {
    "id": "top-blue",
    "slot": "tops",
    "label": "Kaos biru",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "outfit": "casual",
      "outfitColor": "#3f86c9"
    },
    "mesh": null
  },
  {
    "id": "top-mint",
    "slot": "tops",
    "label": "Kaos mint",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "outfit": "casual",
      "outfitColor": "#4fb39a"
    },
    "mesh": null
  },
  {
    "id": "top-smart",
    "slot": "tops",
    "label": "Smart casual",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "outfit": "smart",
      "outfitColor": "#f2efe8"
    },
    "mesh": null
  },
  {
    "id": "bottom-navy",
    "slot": "bottoms",
    "label": "Celana navy",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "pantsColor": "#384355"
    },
    "mesh": null
  },
  {
    "id": "bottom-sand",
    "slot": "bottoms",
    "label": "Celana pasir",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "pantsColor": "#b5a48b"
    },
    "mesh": null
  },
  {
    "id": "shoes-dark",
    "slot": "shoes",
    "label": "Sepatu gelap",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "shoesColor": "#344452"
    },
    "mesh": null
  },
  {
    "id": "shoes-cream",
    "slot": "shoes",
    "label": "Sepatu krem",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {
      "shoesColor": "#e5e0d5"
    },
    "mesh": null
  },
  {
    "id": "headwear-cap",
    "slot": "headwear",
    "label": "Topi biru",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {},
    "mesh": "Cosmetic_Cap"
  },
  {
    "id": "eyewear-glasses",
    "slot": "eyewear",
    "label": "Kacamata",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {},
    "mesh": "Accessory_glasses"
  },
  {
    "id": "backpack-daypack",
    "slot": "backpacks",
    "label": "Tas harian",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {},
    "mesh": "Cosmetic_Backpack"
  },
  {
    "id": "role-scarf",
    "slot": "roleAccessories",
    "label": "Syal",
    "rarity": "common",
    "eligibility": "free",
    "role": null,
    "price": 0,
    "appearance": {},
    "mesh": "Accessory_scarf"
  },
  {
    "id": "role-staff-headset",
    "slot": "roleAccessories",
    "label": "Headset staf",
    "rarity": "common",
    "eligibility": "role",
    "role": "kasir",
    "price": 0,
    "appearance": {},
    "mesh": "Accessory_headset"
  },
  {
    "id": "koko-cung-cheongsam",
    "slot": "tops",
    "label": "Koko Cung · Cheongsam",
    "rarity": "exclusive",
    "eligibility": "locked",
    "role": null,
    "price": 0,
    "appearance": {
      "outfit": "casual",
      "outfitColor": "#bd433d"
    },
    "mesh": "Cosmetic_Cheongsam"
  }
];
export const SLOT_LABELS: Record<CosmeticSlot, string> = { hair: "Rambut", face: "Wajah", skin: "Kulit", tops: "Atasan", bottoms: "Bawahan", shoes: "Sepatu", headwear: "Topi", eyewear: "Kacamata", backpacks: "Tas", roleAccessories: "Aksesori peran" };
export function normalizeEquipment(raw: unknown): EquippedCosmetics {
 const result: EquippedCosmetics = {};
 if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
 for (const slot of COSMETIC_SLOTS) {
  const id = (raw as Record<string, unknown>)[slot];
  if (COSMETICS.some(c => c.slot === slot && c.id === id)) result[slot] = id as string;
 }
 return result;
}
export function resolveAppearance(avatar: AvatarConfig): AvatarConfig {
 const result = { ...avatar };
 for (const slot of COSMETIC_SLOTS) {
  const item = COSMETICS.find(c => c.slot === slot && c.id === avatar.equipped?.[slot]);
  if (item) Object.assign(result, item.appearance);
 }
 return result;
}
export function cosmeticMeshes(avatar: AvatarConfig): Set<string> {
 return new Set(COSMETICS.filter(c => c.mesh && avatar.equipped?.[c.slot] === c.id).map(c => c.mesh!));
}
