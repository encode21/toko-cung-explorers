/** Shared V2 appearance configuration. Existing saved profiles remain valid. */
export type HairStyle =
  "short" | "spiky" | "bob" | "buns" | "cap" | "buzz" | "sidepart" | "ponytail" | "hijab";
export type Expression = "smile" | "grin" | "wink" | "calm";
export type OutfitId = "casual" | "smart" | "cashier" | "warehouse" | "driver";
export type Accessory = "none" | "glasses" | "headset" | "scarf";

export interface AvatarConfig {
  hair: HairStyle;
  hairColor: string;
  skin: string;
  expression: Expression;
  outfit: OutfitId;
  outfitColor: string;
  accessory: Accessory;
  /** Optional garment palette; old saved profiles remain compatible. */
  pantsColor?: string;
  shoesColor?: string;
}

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: "short", label: "Pendek" },
  { id: "spiky", label: "Jabrik" },
  { id: "bob", label: "Bob" },
  { id: "buns", label: "Cepol" },
  { id: "cap", label: "Topi" },
  { id: "buzz", label: "Cepak" },
  { id: "sidepart", label: "Belah samping" },
  { id: "ponytail", label: "Kuncir" },
  { id: "hijab", label: "Hijab" },
];
export const HAIR_COLORS = ["#1f1a17", "#4a2f22", "#8a5a34", "#d9b26a", "#b7413a", "#3b4f8a"];
export const SKIN_TONES = ["#f6d7bd", "#eac09a", "#d9a47a", "#b97f57", "#8d5a3b"];
export const EXPRESSIONS: { id: Expression; label: string }[] = [
  { id: "smile", label: "Senyum" },
  { id: "grin", label: "Ceria" },
  { id: "wink", label: "Kedip" },
  { id: "calm", label: "Kalem" },
];
export const OUTFITS: { id: OutfitId; label: string }[] = [
  { id: "casual", label: "Kasual" },
  { id: "smart", label: "Smart casual" },
  { id: "cashier", label: "Seragam kasir" },
  { id: "warehouse", label: "Rompi gudang" },
  { id: "driver", label: "Seragam kurir" },
];
export const OUTFIT_COLORS = ["#3f86c9", "#4fb39a", "#e0a83a", "#d65a8a", "#5c6b80", "#f2efe8"];
export const ACCESSORIES: { id: Accessory; label: string }[] = [
  { id: "none", label: "Tanpa" },
  { id: "glasses", label: "Kacamata" },
  { id: "headset", label: "Headset" },
  { id: "scarf", label: "Syal" },
];

/** Warna tetap untuk seragam peran (preset). */
export const OUTFIT_UNIFORM: Partial<Record<OutfitId, string>> = {
  cashier: "#d9503f",
  warehouse: "#e8862e",
  driver: "#2f5f9e",
};

export const DEFAULT_AVATAR: AvatarConfig = {
  hair: "short",
  hairColor: HAIR_COLORS[0]!,
  skin: SKIN_TONES[1]!,
  expression: "smile",
  outfit: "casual",
  outfitColor: OUTFIT_COLORS[0]!,
  accessory: "none",
};

/** Gabungkan JSON dari database dengan default, abaikan nilai tak dikenal. */
export function normalizeAvatar(raw: unknown): AvatarConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<
    Record<keyof AvatarConfig, unknown>
  >;
  const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T =>
    typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : d;
  const color = (v: unknown, d: string) =>
    typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d;
  return {
    hair: pick(
      r.hair,
      HAIR_STYLES.map((h) => h.id),
      DEFAULT_AVATAR.hair,
    ),
    hairColor: color(r.hairColor, DEFAULT_AVATAR.hairColor),
    skin: color(r.skin, DEFAULT_AVATAR.skin),
    expression: pick(
      r.expression,
      EXPRESSIONS.map((e) => e.id),
      DEFAULT_AVATAR.expression,
    ),
    outfit: pick(
      r.outfit,
      OUTFITS.map((o) => o.id),
      DEFAULT_AVATAR.outfit,
    ),
    outfitColor: color(r.outfitColor, DEFAULT_AVATAR.outfitColor),
    accessory: pick(
      r.accessory,
      ACCESSORIES.map((a) => a.id),
      DEFAULT_AVATAR.accessory,
    ),
    pantsColor: color(r.pantsColor, "#384355"),
    shoesColor: color(r.shoesColor, "#344452"),
  };
}

/** Avatar acak yang stabil per id — dipakai untuk pemain tanpa data. */
export function avatarFromSeed(seed: string): AvatarConfig {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const at = <T>(list: readonly T[], k: number) => list[(h >>> k) % list.length]!;
  return {
    ...DEFAULT_AVATAR,
    hair: at(HAIR_STYLES, 1).id,
    hairColor: at(HAIR_COLORS, 3),
    skin: at(SKIN_TONES, 5),
    outfitColor: at(OUTFIT_COLORS, 7),
  };
}
