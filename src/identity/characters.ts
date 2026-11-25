/** Katalog karakter koleksi. Pembelian nyata nanti lewat backend pembayaran. */
export type Rarity = "starter" | "exclusive" | "premium" | "limited" | "signature";
import { OUTFIT_UNIFORM, type AvatarConfig, type OutfitId } from "./avatar.ts";
import { DEFAULT_EXPLORER, type ExplorerAppearance } from "./explorer.ts";
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
  {
    id: "ci-cung",
    name: "Ci Cung",
    rarity: "exclusive",
    badges: ["Exclusive"],
    description: "Kakak Koko Cung yang jago hitung stok.",
    priceIdr: null,
    availability: "coming-soon",
  },
  {
    id: "kasir-cung",
    name: "Kasir Cung",
    rarity: "premium",
    badges: ["Premium"],
    description: "Kasir paling cepat se-Toko Cung.",
    priceIdr: null,
    availability: "coming-soon",
  },
  {
    id: "gudang-cung",
    name: "Gudang Cung",
    rarity: "premium",
    badges: ["Premium"],
    description: "Raja palet dan forklift.",
    priceIdr: null,
    availability: "coming-soon",
  },
  {
    id: "driver-cung",
    name: "Driver Cung",
    rarity: "premium",
    badges: ["Premium"],
    description: "Kurir andalan, paket selalu tepat waktu.",
    priceIdr: null,
    availability: "coming-soon",
  },
  {
    id: "imlek-cung",
    name: "Cung Imlek",
    rarity: "limited",
    badges: ["Limited", "Seasonal"],
    description: "Edisi musiman Tahun Baru Imlek.",
    priceIdr: null,
    availability: "coming-soon",
  },
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
  hair: "short",
  hairColor: "#241b17",
  skin: "#eac09a",
  expression: "smile",
  outfit: "casual",
  outfitColor: "#3f86c9",
  accessory: "none",
};

function vendorLook(
  skin: string,
  hair: string,
  jacket: string,
  explorer: Partial<ExplorerAppearance>,
): AvatarConfig {
  return {
    ...NPC_BASE,
    hairColor: hair,
    skin,
    outfitColor: jacket,
    explorer: {
      ...DEFAULT_EXPLORER,
      headwear: "none",
      back: "none",
      footwear: "sneakers",
      ...explorer,
      colors: { ...DEFAULT_EXPLORER.colors, skin, hair, jacket },
    },
  };
}

/** Preset ringan agar pemain, warga, dan staf toko memakai bahasa visual yang sama. */
export const NPC_AVATARS: Record<string, AvatarConfig> = {
  npc_daily_cung: {
    ...NPC_BASE,
    mascot: "koko-cung",
    hair: "sidepart",
    hairColor: "#191b23",
    outfitColor: "#17263e",
    pantsColor: "#202937",
    shoesColor: "#171b24",
    expression: "grin",
  },
  "npc-ko-asu": {
    ...NPC_BASE,
    mascot: "ko-asu",
    hair: "buzz",
    hairColor: "#9b9fa4",
    outfitColor: "#8c3039",
    pantsColor: "#303342",
    shoesColor: "#242833",
    accessory: "glasses",
  },
  "npc-cashier": { ...NPC_BASE, hair: "bob", outfit: "cashier", accessory: "headset" },
  "npc-owner": {
    ...NPC_BASE,
    hairColor: "#6a5448",
    outfit: "smart",
    outfitColor: "#5c6b80",
    accessory: "glasses",
  },
  "npc-courier": { ...NPC_BASE, hair: "cap", outfit: "driver", expression: "grin" },
  // Satpam Toko Cung (Koko Cung's rent collectors): white shirt, navy trousers and cap.
  "npc-satpam": {
    ...NPC_BASE,
    hair: "cap",
    hairColor: "#1f2a44",
    outfit: "smart",
    outfitColor: "#f2f2ee",
    pantsColor: "#1f2a44",
    shoesColor: "#15171c",
  },
  "npc-shopper-1": { ...NPC_BASE, hair: "buns", outfitColor: "#d65a8a" },
  "npc-shopper-2": { ...NPC_BASE, hair: "spiky", skin: "#d9a47a", outfitColor: "#4fb39a" },
  "npc-shopper-3": {
    ...NPC_BASE,
    // Women only (Mbak Nita, Dek Nayla, Bu Romlah…): the rig's ponytail reads as short hair from the front.
    hair: "bob",
    outfit: "casual",
    outfitColor: "#aa7bc5",
    skin: "#b97f57",
  },
  "npc-store-staff": { ...NPC_BASE, hair: "short", outfit: "cashier", accessory: "headset" },
  "npc-pedestrian-1": {
    ...NPC_BASE,
    // Men use this look (Mas Ucup, Pak Sabar, Om Hendra, Bang Jago): a bob read as female.
    hair: "buzz",
    skin: "#f6d7bd",
    outfitColor: "#e0a83a",
    expression: "calm",
  },
  "npc-pedestrian-2": {
    ...NPC_BASE,
    hair: "short",
    outfit: "casual",
    outfitColor: "#839765",
    accessory: "glasses",
    skin: "#8d5a3b",
  },
  "npc-nakama-warehouse": { ...NPC_BASE, hair: "cap", outfit: "warehouse", expression: "grin" },
  // Explorer rig (same rounded rig as the player); render with `playerAvatar`.
  "npc-wali-kota": {
    ...NPC_BASE,
    hair: "sidepart",
    hairColor: "#2a2420",
    skin: "#d9a47a",
    outfitColor: "#7a4a2b",
    expression: "smile",
    explorer: {
      ...DEFAULT_EXPLORER,
      top: "overshirt",
      bottom: "jeans",
      footwear: "slip-on",
      headwear: "none",
      back: "none",
      colors: {
        ...DEFAULT_EXPLORER.colors,
        skin: "#d9a47a",
        hair: "#2a2420",
        jacket: "#8a5a2e",
        trim: "#e3b94f",
        pants: "#1f2430",
        shoes: "#17130f",
      },
    },
  },
  "npc-pak-kades": {
    ...NPC_BASE,
    hair: "short",
    hairColor: "#3a3a3a",
    skin: "#b97f57",
    outfitColor: "#c8b783",
    expression: "calm",
    explorer: {
      ...DEFAULT_EXPLORER,
      build: "heavy",
      top: "overshirt",
      bottom: "cargo",
      footwear: "boots",
      headwear: "none",
      back: "none",
      colors: {
        ...DEFAULT_EXPLORER.colors,
        skin: "#b97f57",
        hair: "#3a3a3a",
        jacket: "#c8b783",
        trim: "#785d35",
        pants: "#5f6650",
        shoes: "#3a2c20",
      },
    },
  },
  // Pasar vendors (explorer rig, render with `playerAvatar`).
  "npc-mang-udin": vendorLook("#a8704a", "#1e1a17", "#d9822b", { build: "heavy", top: "tshirt" }),
  "npc-bang-jali": vendorLook("#c88a5f", "#241b17", "#2f6f8f", {
    build: "slim",
    top: "hoodie",
    headwear: "baseball-cap",
  }),
  "npc-bu-sri": vendorLook("#d9a47a", "#2a1d1a", "#c0495a", {
    gender: "female",
    top: "overshirt",
    bottom: "skirt-leggings",
    hairDecoration: "flower-clip",
  }),
  "npc-pak-darman": vendorLook("#8d5a3b", "#2b2622", "#e8e2d0", {
    build: "muscular",
    top: "tshirt",
    bottom: "shorts",
    footwear: "slip-on",
    headwear: "straw-hat",
  }),
  "npc-nakama-packing": { ...NPC_BASE, hair: "bob", outfit: "warehouse", accessory: "headset" },
  // Women in hijab (Mpok Lela, Teh Nining, Mpok/Teh story visitors).
  "npc-hijab-a": {
    ...NPC_BASE,
    hair: "hijab",
    hairColor: "#c2577a",
    outfitColor: "#e7b04d",
    skin: "#d9a47a",
  },
  "npc-hijab-b": {
    ...NPC_BASE,
    hair: "hijab",
    hairColor: "#3f6f8f",
    outfitColor: "#9fd0c1",
    skin: "#eac09a",
  },
};

/** Women's looks: an explicit explorer body wins, else the long or covered hairstyles. */
export const isFemaleLook = (look: Pick<AvatarConfig, "hair" | "explorer">) =>
  look.explorer?.gender
    ? look.explorer.gender === "female"
    : ["bob", "buns", "ponytail", "hijab"].includes(look.hair);

const LOD_TOP: Record<OutfitId, string> = {
  casual: "tshirt",
  smart: "overshirt",
  cashier: "tshirt",
  warehouse: "hoodie",
  driver: "varsity",
};
const LOD_BUILDS = ["regular", "slim", "regular", "heavy"] as const;
const cache = new Map<string, AvatarConfig | null>();

/**
 * Explorer-rig twin of a light NPC look (same colours, hair, skin, outfit role) for near-LOD rendering.
 * Build varies deterministically by id. Mascots and looks that already have an explorer return null.
 */
export function npcExplorerLook(id: string): AvatarConfig | null {
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const base = NPC_AVATARS[id];
  let look: AvatarConfig | null = null;
  if (base && !base.mascot && !base.explorer) {
    const female = isFemaleLook(base);
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    look = {
      ...base,
      explorer: {
        ...DEFAULT_EXPLORER,
        gender: female ? "female" : "male",
        build: LOD_BUILDS[h % LOD_BUILDS.length]!,
        top: LOD_TOP[base.outfit],
        bottom:
          female && base.outfit === "casual"
            ? "skirt-leggings"
            : base.outfit === "warehouse"
              ? "cargo"
              : "jeans",
        footwear: "sneakers",
        headwear: base.hair === "cap" ? "baseball-cap" : "none",
        eyewear: base.accessory === "glasses" ? "round-glasses" : "none",
        audio: base.accessory === "headset" ? "headphones" : "none",
        neck: base.accessory === "scarf" ? "neck-scarf" : "none",
        back: "none",
        colors: {
          ...DEFAULT_EXPLORER.colors,
          skin: base.skin,
          hair: base.hairColor,
          jacket: OUTFIT_UNIFORM[base.outfit] ?? base.outfitColor,
          pants: base.pantsColor ?? DEFAULT_EXPLORER.colors.pants,
          shoes: base.shoesColor ?? DEFAULT_EXPLORER.colors.shoes,
        },
      },
    };
  }
  cache.set(id, look);
  return look;
}
