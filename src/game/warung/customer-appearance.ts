import { avatarFromSeed, OUTFIT_UNIFORM, type AvatarConfig } from "@/identity/avatar";
import { isFemaleLook, NPC_AVATARS } from "@/identity/characters";
import { DEFAULT_EXPLORER } from "@/identity/explorer";

/** Keep each customer's identity while dressing the same rounded rig used by the main player. */
export function customerAppearance(preset: string): AvatarConfig {
  const avatar = NPC_AVATARS[preset] ?? avatarFromSeed(preset);
  return {
    ...avatar,
    explorer: {
      ...DEFAULT_EXPLORER,
      gender: isFemaleLook(avatar) ? "female" : "male",
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

const FEMALE_TITLE = /^(Bu|Ibu|Mbak|Teh|Mpok|Nek|Neng|Ceu|Tante|Dek Salsa|Dek Rara|Dek Nayla)\b/;
/** Story visitors are named per event ("Bu Romlah", "Bang Jago"): dress the look to match the name. */
export function lookForName(name: string, preset: string) {
  const female = FEMALE_TITLE.test(name);
  const base = NPC_AVATARS[preset];
  if (base && isFemaleLook(base) === female) return preset;
  return female
    ? /^(Mpok|Teh|Ceu)/.test(name)
      ? "npc-hijab-a"
      : "npc-shopper-1"
    : "npc-pedestrian-2";
}
