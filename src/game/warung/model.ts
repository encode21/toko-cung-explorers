// Warung Sendiri — shared types and pure helpers (see docs/warung-sendiri.md).
export interface WarungItem {
  id: string;
  name: string;
  wholesale: number;
  market: number;
  weight: number;
  level: number;
  color: string;
}
export interface WarungLevel {
  name: string;
  cost: number;
  maxStock: number;
  npcPerHour: number;
}
export interface WarungStock {
  itemId: string;
  qty: number;
  price: number;
}
export interface MyWarung {
  id: number;
  name: string;
  level: number;
  levelName: string;
  cash: number;
  totalSales: number;
  maxStock: number;
  nextUpgradeCost: number | null;
  stock: WarungStock[];
}
export interface PublicWarung {
  id: number;
  name: string;
  level: number;
  levelName: string;
  ownerName: string | null;
  totalSales: number;
  stock: WarungStock[];
}
export interface WarungCard extends Omit<PublicWarung, "stock"> {
  online: boolean;
}
export interface WarungSnapshot {
  catalog: WarungItem[];
  levels: Record<string, WarungLevel>;
  warung: MyWarung | null;
  settled: {
    minutes: number;
    customers: number;
    revenue: number;
    items: Record<string, number>;
  } | null;
  journal: {
    type: string;
    itemId: string | null;
    qty: number;
    amount: number;
    cashAfter: number;
    at: string;
  }[];
}
export interface WarungDirectory {
  mineId: number | null;
  online: WarungCard[];
  top: WarungCard[];
}
export interface OrderLine {
  itemId: string;
  qty: number;
}

/** Interiors live far from the city; each warung id maps to one of SLOTS rooms. */
export const WARUNG_ORIGIN: [number, number, number] = [3000, 0, 3000];
export const WARUNG_SLOT_SPACING = 80;
export const WARUNG_SLOTS = 32;

export function warungSlot(id: number) {
  return ((id % WARUNG_SLOTS) + WARUNG_SLOTS) % WARUNG_SLOTS;
}
export function warungOrigin(id: number): [number, number, number] {
  return [
    WARUNG_ORIGIN[0],
    WARUNG_ORIGIN[1],
    WARUNG_ORIGIN[2] + warungSlot(id) * WARUNG_SLOT_SPACING,
  ];
}
/** Slot index for a world position, or -1 outside the warung area (city, mountain, club). */
export function warungSlotAt(x: number, z: number) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x - WARUNG_ORIGIN[0]) > 30) return -1;
  const slot = Math.round((z - WARUNG_ORIGIN[2]) / WARUNG_SLOT_SPACING) || 0;
  return slot >= 0 &&
    slot < WARUNG_SLOTS &&
    Math.abs(z - WARUNG_ORIGIN[2] - slot * WARUNG_SLOT_SPACING) <= 30
    ? slot
    : -1;
}

/** A walk-in customer's order: 1–3 stocked items, each 1–3 pcs and never more than in stock. */
export function makeOrder(stock: WarungStock[], rand: () => number = Math.random): OrderLine[] {
  const pool = stock.filter((s) => s.qty > 0);
  const lines: OrderLine[] = [];
  const count = Math.min(pool.length, 1 + Math.floor(rand() * 3));
  for (let i = 0; i < count; i++) {
    const [pick] = pool.splice(Math.floor(rand() * pool.length), 1);
    lines.push({ itemId: pick!.itemId, qty: Math.min(pick!.qty, 1 + Math.floor(rand() * 3)) });
  }
  return lines;
}

export function rupiah(n: number) {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}
