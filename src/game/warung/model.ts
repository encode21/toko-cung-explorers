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
  hiring: boolean;
}
export interface PublicWarung {
  id: number;
  name: string;
  level: number;
  levelName: string;
  ownerName: string | null;
  totalSales: number;
  stock: WarungStock[];
  hiring: boolean;
}
export interface WarungCard extends Omit<PublicWarung, "stock"> {
  online: boolean;
}
export interface LotCard extends WarungCard {
  /** Index into WARUNG_LOTS (city house lots). */
  lot: number;
}
export type WarungEventKind = "ngutang" | "iuran" | "ojol";
export interface WarungEvent {
  id: number;
  kind: WarungEventKind;
  npc: string;
  amount: number;
  items: OrderLine[];
  expiresAt: string;
}
export interface WarungNews {
  kind: "debt_paid" | "debt_defaulted";
  npc: string;
  amount: number;
}
export interface WarungSnapshot {
  catalog: WarungItem[];
  levels: Record<string, WarungLevel>;
  warung: MyWarung | null;
  /** Part-time wages saved before owning a warung. */
  savings: number;
  event: WarungEvent | null;
  debts: { npc: string; amount: number; dueAt: string }[];
  news: WarungNews[];
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

// Wall / awning colors grow with the warung level (Gerobak → Minimarket).
export const LEVEL_LOOK = [
  { wall: "#e9d6b0", awning: "#e0623d" },
  { wall: "#f1e2bf", awning: "#3fa7c9" },
  { wall: "#f4e8cc", awning: "#59b36a" },
  { wall: "#f7efdc", awning: "#d24a5c" },
  { wall: "#fbf6ea", awning: "#2f7fd0" },
];

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

/** Customer walk from the door to the counter (and back), in ms. */
export const CUSTOMER_WALK_MS = 3000;

/** Habis = 0 left; menipis = at most 20% of the rack (min 2). Only items the warung has stocked before. */
export function stockAlerts(stock: WarungStock[], maxStock: number) {
  const low = Math.max(2, Math.floor(maxStock * 0.2));
  return {
    empty: stock.filter((s) => s.qty === 0).map((s) => s.itemId),
    low: stock.filter((s) => s.qty > 0 && s.qty <= low).map((s) => s.itemId),
  };
}

/** Share of NPC customers who buy at this price (mirrors the server's buyChance). */
export function buyChance(price: number, market: number) {
  return Math.max(0, Math.min(1, 1.6 - price / market));
}
