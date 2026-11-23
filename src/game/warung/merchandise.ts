import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import type { WarungItem, WarungStock } from "./model";

const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "bevel",
  finish: Finish = "plastic",
): AssetPart => ({ p, s, color, shape, finish });

export const RACK_LEVELS = [0.27, 1.02, 1.77];
export const SIDE_RACK_X = [-3.95, 3.95];
export const SIDE_RACK_Z = 1.8;
export const BACK_RACK_X = [-4, 0, 4];

export interface MerchandiseSlot {
  x: number;
  y: number;
  z: number;
  /** Front of package and shelf label faces toward this z direction. */
  face: 1 | -1;
}

// A row does not move when it sells out: empty slots still show the item's shelf label.
export const MERCHANDISE_SLOTS: MerchandiseSlot[] = [
  ...RACK_LEVELS.flatMap((y) =>
    SIDE_RACK_X.map((x) => ({ x, y, z: SIDE_RACK_Z, face: -1 as const })),
  ),
  ...RACK_LEVELS.flatMap((y) => BACK_RACK_X.map((x) => ({ x, y, z: -4.25, face: 1 as const }))),
];

export function displayUnits(qty: number, maxStock: number): number {
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  return Math.min(Math.floor(qty), 5, Math.max(1, Math.ceil((qty / Math.max(1, maxStock)) * 5)));
}

type ProductKind = "rice" | "oil" | "water" | "eggs" | "noodles" | "jar" | "cup" | "soap" | "pack";

/** Database SKUs have numeric ids; their product name still determines the physical silhouette. */
function productKind(item: Pick<WarungItem, "id" | "name">): ProductKind {
  const name = `${item.id} ${item.name}`.toLowerCase();
  if (/beras|gula|tepung|rice|sugar/.test(name)) return "rice";
  if (/minyak|oil/.test(name)) return "oil";
  if (/air.mineral|aqua|le.minerale|vit\b|ades|oasis|water/.test(name)) return "water";
  if (/telur|egg/.test(name)) return "eggs";
  if (/mie|mi instan|indomie|sedaap|sarimi|supermi|noodle/.test(name)) return "noodles";
  if (/kerupuk|biskuit|biscuit|cookies|wafer/.test(name)) return "jar";
  if (/teh.gelas|cup|gelas/.test(name)) return "cup";
  if (/sabun|soap|deterjen|rinso|daia/.test(name)) return "soap";
  return "pack";
}

/** Small, batched merchandise with seams, labels and recognisable real-world silhouettes. */
export function merchandiseShape(
  item: Pick<WarungItem, "id" | "name" | "color" | "uom">,
  slot: MerchandiseSlot,
  x: number,
): AssetPart[] {
  const { y, z, face } = slot;
  const color = item.color || "#e5c391";
  const front = (depth: number) => z + face * depth;
  switch (productKind(item)) {
    case "rice":
      return [
        part([x, y + 0.25, z], [0.42, 0.5, 0.31], "#eee2bb", "coach", "fabric"),
        part([x, y + 0.5, z], [0.33, 0.035, 0.25], "#c5b58d", "bevel", "fabric"),
        part([x, y + 0.24, front(0.16)], [0.34, 0.24, 0.012], color, "box"),
        part([x, y + 0.24, front(0.17)], [0.19, 0.11, 0.012], "#fff9df", "box"),
      ];
    case "oil":
      return [
        part([x, y + 0.23, z], [0.28, 0.46, 0.22], "#eac34c", "coach"),
        part([x, y + 0.48, z], [0.15, 0.09, 0.15], "#f0d76b", "cone"),
        part([x, y + 0.55, z], [0.11, 0.06, 0.11], "#d4412f", "cylinder"),
        part([x, y + 0.23, front(0.115)], [0.23, 0.2, 0.012], color, "box"),
        part([x, y + 0.24, front(0.127)], [0.16, 0.08, 0.008], "#fff9de", "box"),
      ];
    case "water":
      return [
        part([x, y + 0.23, z], [0.21, 0.46, 0.21], "#b9d8dd", "cylinder"),
        part([x, y + 0.48, z], [0.21, 0.09, 0.21], "#c9e8e6", "cone"),
        part([x, y + 0.56, z], [0.1, 0.07, 0.1], "#248ba6", "cylinder"),
        part([x, y + 0.25, z], [0.216, 0.16, 0.216], color, "cylinder"),
        part([x, y + 0.26, front(0.111)], [0.14, 0.07, 0.012], "#f9f9e7", "box"),
      ];
    case "eggs":
      return [
        part([x, y + 0.04, z], [0.46, 0.08, 0.36], "#bda783", "bevel", "cardboard"),
        ...[-0.14, 0, 0.14].flatMap((dx) =>
          [-0.085, 0.085].map((dz) =>
            part([x + dx, y + 0.14, z + dz], [0.12, 0.18, 0.12], "#e1bf8e", "sphere", "paint"),
          ),
        ),
      ];
    case "noodles":
      return [
        part([x, y + 0.2, z], [0.43, 0.4, 0.16], color, "coach"),
        part([x, y + 0.02, z], [0.45, 0.03, 0.17], "#e0b36e", "box"),
        part([x, y + 0.39, z], [0.45, 0.03, 0.17], "#e0b36e", "box"),
        part([x, y + 0.25, front(0.09)], [0.33, 0.08, 0.012], "#fff9e3", "box"),
        part([x, y + 0.12, front(0.095)], [0.24, 0.12, 0.018], "#f3ce70", "sphere"),
      ];
    case "jar":
      return [
        // Pale rim and exposed snack pieces keep the jar legible without transparent volume sorting.
        part([x, y + 0.03, z], [0.34, 0.06, 0.34], "#d9e6dc", "cylinder", "glass"),
        part([x, y + 0.22, z], [0.29, 0.38, 0.29], "#e7bb63", "cylinder"),
        part([x, y + 0.23, front(0.15)], [0.21, 0.15, 0.01], color, "box"),
        part([x, y + 0.45, z], [0.35, 0.08, 0.35], "#b95136", "cylinder"),
        part([x, y + 0.48, z], [0.22, 0.025, 0.22], "#d8784c", "cylinder"),
      ];
    case "cup":
      return [
        part([x, y + 0.14, z], [0.26, 0.28, 0.26], "#ad7041", "cone"),
        part([x, y + 0.29, z], [0.29, 0.025, 0.29], color, "cylinder"),
        part([x, y + 0.16, front(0.1)], [0.17, 0.12, 0.016], "#f6edbc", "box"),
      ];
    case "soap":
      return [
        part([x, y + 0.15, z], [0.4, 0.3, 0.22], color, "bevel", "cardboard"),
        part([x, y + 0.17, front(0.115)], [0.31, 0.16, 0.01], "#fff5df", "bevel"),
        part([x, y + 0.17, front(0.123)], [0.21, 0.04, 0.01], color, "box"),
      ];
    default: {
      const bulk = item.uom === "dus" || /-dus$/.test(item.id);
      return [
        part(
          [x, y + 0.23, z],
          [0.42, 0.46, 0.28],
          bulk ? "#bb9366" : color,
          "bevel",
          bulk ? "cardboard" : "plastic",
        ),
        part([x, y + 0.47, z], [0.43, 0.025, 0.29], "#dfcba4", "box", "cardboard"),
        part([x, y + 0.25, front(0.145)], [0.33, 0.26, 0.01], bulk ? color : "#f6edd1", "box"),
        part([x, y + 0.25, front(0.155)], [0.23, 0.055, 0.01], bulk ? "#fff4da" : color, "box"),
        part([x + 0.08, y + 0.08, front(0.155)], [0.12, 0.055, 0.01], "#54443c", "box"),
      ];
    }
  }
}

export function merchandiseParts(
  stock: WarungStock[],
  catalog: Map<string, WarungItem>,
  maxStock: number,
): AssetPart[] {
  return stock.slice(0, MERCHANDISE_SLOTS.length).flatMap((row, index) => {
    const item = catalog.get(row.itemId);
    const slot = MERCHANDISE_SLOTS[index]!;
    const count = displayUnits(row.qty, maxStock);
    if (!item || !count) return [];
    return Array.from({ length: count }, (_, unit) =>
      merchandiseShape(item, slot, slot.x - 1.05 + unit * 0.52),
    ).flat();
  });
}

export function merchandiseSignature(stock: WarungStock[] | undefined, maxStock: number): string {
  return (stock ?? [])
    .slice(0, MERCHANDISE_SLOTS.length)
    .map((row) => `${row.itemId}:${displayUnits(row.qty, maxStock)}`)
    .join("|");
}
