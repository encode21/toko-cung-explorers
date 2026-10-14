import data from "./wardrobe-catalog.json" with { type: "json" };
export type WardrobeSlot =
  | "top"
  | "bottom"
  | "footwear"
  | "headwear"
  | "hairDecoration"
  | "eyewear"
  | "audio"
  | "neck"
  | "back";
export interface WardrobeItem {
  id: string;
  slot: WardrobeSlot | "set";
  label: string;
  price: number;
  colors?: Record<string, string>;
  preset?: Partial<Record<WardrobeSlot, string>>;
}
export const WARDROBE = data as WardrobeItem[];
export const SLOT_LABELS: Record<WardrobeSlot | "set", string> = {
  top: "Atasan",
  bottom: "Bawahan",
  footwear: "Alas kaki",
  headwear: "Topi & bando",
  hairDecoration: "Hiasan rambut",
  eyewear: "Kacamata",
  audio: "Telinga & audio",
  neck: "Leher",
  back: "Punggung",
  set: "Set outfit",
};
export const WARDROBE_SLOTS = Object.keys(SLOT_LABELS).filter((s) => s !== "set") as WardrobeSlot[];
export const CROWN_HATS = ["explorer-cap", "baseball-cap", "bucket-hat", "beanie", "mini-crown"];
export function itemOwned(
  item: WardrobeItem,
  owned: readonly string[],
  catalog: readonly WardrobeItem[] = WARDROBE,
) {
  return (
    item.price === 0 ||
    owned.includes(item.id) ||
    (!!item.preset &&
      Object.values(item.preset).every(
        (id) =>
          id === "none" ||
          catalog.some((i) => i.id === id && (i.price === 0 || owned.includes(id))),
      ))
  );
}
