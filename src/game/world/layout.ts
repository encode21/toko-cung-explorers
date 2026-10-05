/** Tata letak Toko Cung (digital twin) dalam meter. */

export type Vec3 = [number, number, number];

export const STORE = {
  minX: -9,
  maxX: 9,
  minZ: -13,
  maxZ: 3,
  wallHeight: 3.2,
  wallThickness: 0.35,
  doorHalfWidth: 1.7,
  doorX: 0,
};

export const WAREHOUSE = {
  minX: -9,
  maxX: 9,
  minZ: -22,
  maxZ: -13,
  passageX: 6.2,
  passageHalfWidth: 1.6,
};

export const SPAWN: Vec3 = [0, 1.2, 12];

export type ShelfId = "shelf-instant-noodle" | "shelf-drink" | "shelf-snack" | "shelf-fresh";

export interface ShelfZone {
  id: ShelfId;
  label: string;
  position: Vec3;
  rotationY: number;
  kind: "shelf" | "fridge";
}

export const SHELVES: ShelfZone[] = [
  {
    id: "shelf-instant-noodle",
    label: "Rak Makanan Instan",
    position: [-5.5, 0, -2.5],
    rotationY: 0,
    kind: "shelf",
  },
  {
    id: "shelf-snack",
    label: "Rak Rumah Tangga & Rokok",
    position: [5.5, 0, -2.5],
    rotationY: Math.PI,
    kind: "shelf",
  },
  {
    id: "shelf-drink",
    label: "Kulkas Minuman",
    position: [-5.5, 0, -8.5],
    rotationY: 0,
    kind: "fridge",
  },
  {
    id: "shelf-fresh",
    label: "Rak Sembako",
    position: [5.5, 0, -8.5],
    rotationY: Math.PI,
    kind: "shelf",
  },
];

export const CASHIER_POS: Vec3 = [5.6, 0, 1.2];
export const CASHIER_NPC_POS: Vec3 = [5.6, 0, 0.1];
export const OWNER_POS: Vec3 = [-6.4, 0, -11.4];
export const NAKAMA_WAREHOUSE_POS: Vec3 = [3.4, 0, -17.5];
export const NAKAMA_PACKING_POS: Vec3 = [-3.6, 0, -17.2];
export const COURIER_POS: Vec3 = [9.5, 0, 9.5];
export const STREET_Z = 20;

export function shelfById(id: string): ShelfZone | undefined {
  return SHELVES.find((s) => s.id === id);
}

/** Kenney mini characters ~0.65 unit tinggi di bind pose; skala ini ≈1.7 m. */
export const CHAR_SCALE = 2.2;
