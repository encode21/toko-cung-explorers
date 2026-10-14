import { WARDROBE, WARDROBE_SLOTS, CROWN_HATS, type WardrobeSlot } from "./wardrobe.ts";
/** Public, free Explorer starter collection. Never grants roles or collectible ownership. */
export const EXPLORER_ITEMS = Object.fromEntries(
  WARDROBE_SLOTS.map((slot) => [
    slot,
    [
      ...WARDROBE.filter((i) => i.slot === slot).map((i) => ({ id: i.id, label: i.label })),
      ...(["top", "bottom", "footwear"].includes(slot) ? [] : [{ id: "none", label: "Tanpa" }]),
    ],
  ]),
) as Record<WardrobeSlot, { id: string; label: string }[]>;
export type ExplorerSlot = WardrobeSlot;
export type ExplorerAppearance = {
  version: 2;
  colors: Record<"skin" | "hair" | "jacket" | "trim" | "pants" | "shoes" | "backpack", string>;
} & Record<ExplorerSlot, string>;
export const DEFAULT_EXPLORER: ExplorerAppearance = {
  version: 2,
  top: "explorer-jacket",
  bottom: "jeans",
  footwear: "boots",
  hairDecoration: "none",
  neck: "none",
  headwear: "explorer-cap",
  eyewear: "none",
  audio: "none",
  back: "explorer-pack",
  colors: {
    skin: "#c88a5f",
    hair: "#302720",
    jacket: "#b92025",
    trim: "#c0a062",
    pants: "#384947",
    shoes: "#42352d",
    backpack: "#687b61",
  },
};
export function normalizeExplorer(raw: unknown): ExplorerAppearance {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result = { ...DEFAULT_EXPLORER, colors: { ...DEFAULT_EXPLORER.colors } };
  if (r["version"] !== 1 && r["version"] !== 2) return result;
  for (const slot of Object.keys(EXPLORER_ITEMS) as ExplorerSlot[]) {
    const id = r[slot];
    if (EXPLORER_ITEMS[slot].some((item) => item.id === id)) Object.assign(result, { [slot]: id });
  }
  const colors = r["colors"];
  if (colors && typeof colors === "object")
    for (const key of Object.keys(result.colors) as (keyof ExplorerAppearance["colors"])[]) {
      const value = (colors as Record<string, unknown>)[key];
      if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value))
        result.colors[key] = value.toLowerCase();
    }
  // Headphone band occupies the crown. Selecting headphones removes either cap.
  if (result.audio === "headphones") result.headwear = "none";
  if (CROWN_HATS.includes(result.headwear)) result.hairDecoration = "none";
  return result;
}
export function equipExplorer(appearance: ExplorerAppearance, slot: ExplorerSlot, id: string) {
  return normalizeExplorer({
    ...appearance,
    [slot]: id,
    ...(slot === "headwear" && id !== "none"
      ? { audio: appearance.audio === "headphones" ? "none" : appearance.audio }
      : {}),
    ...(slot === "hairDecoration" && id !== "none" && CROWN_HATS.includes(appearance.headwear)
      ? { headwear: "none" }
      : {}),
  });
}
