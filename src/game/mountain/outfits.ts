import { DEFAULT_EXPLORER } from "@/identity/explorer";
import type { AvatarConfig } from "@/identity/avatar";
import { mountainWorldPoint } from "./model";

export const MOUNTAIN_OUTFITS = [
  {
    id: "expedition",
    name: "Ekspedisi",
    description: "Jaket cokelat, topi lebar, dan goggles.",
    jacket: "#725337",
    trim: "#bd9a63",
    pants: "#39372f",
    hat: "#6c4e31",
    pack: "#554735",
    goggles: true,
  },
  {
    id: "safari",
    name: "Safari",
    description: "Kemeja khaki, topi safari, dan sabuk kulit.",
    jacket: "#d1c08b",
    trim: "#785d35",
    pants: "#5f6650",
    hat: "#c8b783",
    pack: "#9a8152",
    goggles: false,
  },
  {
    id: "ranger",
    name: "Penjaga Rimba",
    description: "Rompi zaitun, topi lapangan, dan ransel.",
    jacket: "#72764d",
    trim: "#b6a275",
    pants: "#514b3d",
    hat: "#777346",
    pack: "#565b3c",
    goggles: false,
  },
] as const;
export type MountainOutfitId = (typeof MOUNTAIN_OUTFITS)[number]["id"];
export const MOUNTAIN_OUTFIT_STAND = mountainWorldPoint([373, 8, 68]);
export function nearMountainOutfits(position: readonly number[]) {
  return (
    Math.hypot(position[0]! - MOUNTAIN_OUTFIT_STAND[0], position[2]! - MOUNTAIN_OUTFIT_STAND[2]) <
      58 && Math.abs(position[1]! - MOUNTAIN_OUTFIT_STAND[1]) < 4
  );
}
/** Free, temporary camp clothing. Never writes profile, wardrobe ownership, or body scale. */
export function mountainOutfitAvatar(
  avatar: AvatarConfig,
  outfit: MountainOutfitId | null,
): AvatarConfig {
  const preset = MOUNTAIN_OUTFITS.find((item) => item.id === outfit);
  if (!preset) return avatar;
  const original = avatar.explorer ?? DEFAULT_EXPLORER;
  const equipped = { ...avatar.equipped };
  for (const slot of [
    "tops",
    "bottoms",
    "shoes",
    "headwear",
    "eyewear",
    "backpacks",
    "roleAccessories",
  ] as const)
    delete equipped[slot];
  return {
    ...avatar,
    outfit: "casual",
    outfitColor: preset.jacket,
    pantsColor: preset.pants,
    shoesColor: "#352f28",
    accessory: "none",
    equipped,
    explorer: {
      ...original,
      top: "explorer-jacket",
      bottom: "jeans",
      footwear: "boots",
      headwear: "none",
      hairDecoration: "none",
      eyewear: "none",
      audio: "none",
      neck: "none",
      back: "none",
      colors: {
        ...original.colors,
        jacket: preset.jacket,
        trim: preset.trim,
        pants: preset.pants,
        shoes: "#352f28",
        backpack: preset.pack,
      },
    },
  };
}
