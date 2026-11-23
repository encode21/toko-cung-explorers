import { avatarFromSeed, OUTFIT_UNIFORM, type AvatarConfig } from "@/identity/avatar";
import { NPC_AVATARS } from "@/identity/characters";
import { DEFAULT_EXPLORER } from "@/identity/explorer";

const FEMALE_PRESETS = new Set([
  "npc-cashier",
  "npc-shopper-1",
  "npc-shopper-3",
  "npc-store-staff",
  "npc-pedestrian-1",
  "npc-nakama-packing",
]);

/** Keep each customer's identity while dressing the same rounded rig used by the main player. */
export function customerAppearance(preset: string): AvatarConfig {
  const avatar = NPC_AVATARS[preset] ?? avatarFromSeed(preset);
  return {
    ...avatar,
    explorer: {
      ...DEFAULT_EXPLORER,
      gender: FEMALE_PRESETS.has(preset) ? "female" : "male",
      top:
        avatar.outfit === "smart" || avatar.outfit === "warehouse"
          ? "overshirt"
          : avatar.outfit === "driver"
            ? "hoodie"
            : "tshirt",
      bottom: avatar.outfit === "warehouse" ? "cargo" : "jeans",
      footwear: "sneakers",
      headwear: avatar.hair === "cap" ? "baseball-cap" : "none",
      eyewear: avatar.accessory === "glasses" ? "round-glasses" : "none",
      audio: avatar.accessory === "headset" ? "headphones" : "none",
      neck: avatar.accessory === "scarf" ? "neck-scarf" : "none",
      back: "none",
      colors: {
        ...DEFAULT_EXPLORER.colors,
        skin: avatar.skin,
        hair: avatar.hairColor,
        jacket: OUTFIT_UNIFORM[avatar.outfit] ?? avatar.outfitColor,
        trim: "#f6edda",
        pants: avatar.pantsColor ?? "#384355",
        shoes: avatar.shoesColor ?? "#f2efe8",
      },
    },
  };
}
