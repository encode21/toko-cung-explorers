import type { WarungDecorItem, WarungStyle } from "./decor";
// Warung Sendiri — shared types and pure helpers (see docs/warung-sendiri.md).
export interface WarungItem {
  id: string;
  name: string;
  wholesale: number;
  market: number;
  weight: number;
  level: number;
  color: string;
  /** Curated real Toko Cung product (photo from the store DB; price is fictional). */
  image?: string | null;
  uom?: "pcs" | "pack" | "dus" | "bal";
  /** Toko Cung shelf zone where it is picked during kulakan. */
  shelf?: string;
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
  /** F6: harga partai ke pemain lain (dus/bal di Agen/Grosir); null = tidak dijual partai. */
  bulkPrice?: number | null;
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
  /** WIB whole hours; close < open wraps past midnight, equal = 24 h. */
  openHour: number;
  closeHour: number;
  isOpen: boolean;
  style?: WarungStyle;
}
/** Koko Cung's daily rent + listrik bill. Never auto-debited; sealed = no sales until paid. */
export interface WarungRent {
  kind?: "gang";
  electricity?: number;
  dues?: number;
  dailyStaff?: number;
  dailyTotal?: number;
  text?: Record<string, string>;
  landlord: string;
  daily: number;
  owedDays: number;
  owed: number;
  sealed: boolean;
  sealDays: number;
  dueHour: number;
  paidUntil: string;
  canBargain: boolean;
}
export type WarungStory =
  | { finished: true; step: number; total: number }
  | {
      finished: false;
      step: number;
      total: number;
      title: string;
      npc: string;
      intro: string;
      outro: string;
      label: string;
      reward: number;
      progress: number;
      target: number;
      done: boolean;
      locked?: boolean;
      availableAt?: string | null;
      lockedMessage?: string | null;
    };
export interface PublicWarung {
  id: number;
  name: string;
  level: number;
  levelName: string;
  ownerName: string | null;
  totalSales: number;
  stock: WarungStock[];
  hiring: boolean;
  /** Missing until the backend ships kustom warung. */
  style?: WarungStyle;
}
export interface WarungCard extends Omit<PublicWarung, "stock"> {
  online: boolean;
}
export interface LotCard extends WarungCard {
  /** Index into WARUNG_LOTS (city house lots). */
  lot: number;
  /** Delivery truck parked here until this epoch ms (kulakan antar). */
  truckEta?: number | null;
  /** Whole days of unpaid rent; missing on older backends. */
  rentDue?: number;
  sealed?: boolean;
}
export type WarungEventKind = "ngutang" | "iuran" | "ojol" | "palak" | "sultan";
export interface WarungEvent {
  id: number;
  kind: WarungEventKind;
  npc: string;
  amount: number;
  items: OrderLine[];
  expiresAt: string;
}
export interface WarungDebt {
  id: number;
  npc: string;
  amount: number;
  dueAt: string;
  lastRemindedAt?: string | null;
}
/** A debt the owner accepted, with the server's conversation log (Buku utang chat history). */
export interface WarungDebtHistory {
  id: number;
  npc: string;
  amount: number;
  status: "ACCEPTED" | "PAID" | "DEFAULTED";
  askedAt: string;
  resolvedAt: string | null;
  log: { k: string; at: string; tone?: string | null }[];
}
export interface WarungNews {
  kind:
    | "debt_paid"
    | "debt_defaulted"
    | "debt_collected_chat"
    | "debt_delayed_chat"
    | "debt_extended_chat"
    | "debt_collected_street"
    | "theft_escaped"
    | "rent_bargain_ok"
    | "rent_bargain_fail";
  npc: string;
  amount: number;
  qty?: number;
  extendMinutes?: number;
}
/** Kavling board row (server WarungLot::market). */
export interface WarungLotOffer {
  lot: number;
  tier: "pinggir" | "tengah" | "premium";
  tierName: string;
  price: number;
  level: number;
  status: "sale" | "soon" | "exclusive";
  /** One owner across all channels. */
  unique: boolean;
  owners: number;
  ownerName: string | null;
  mine: boolean;
}
/** F7 kavling kota global (server WorldCityLot::state). */
export interface CityLotState {
  enabled: boolean;
  rentMultiplier?: number;
  offerHours?: number;
  inactiveDays?: number;
  landmark?: CityLandmark;
  tiers?: {
    tier: WarungLotOffer["tier"];
    name: string;
    npcBonusPercent: number;
    waiting: number;
    /** Unmet requirements; empty = eligible. */
    missing: string[];
  }[];
  queue?: {
    tier: WarungLotOffer["tier"];
    status: "waiting" | "offered";
    position: number | null;
    lot: number | null;
    expiresAt: string | null;
  } | null;
}
export interface CityLandmark {
  lot: number;
  name: string;
  caption: string;
}
/** Kulakan on its way: antar (truck) or ambil (boxes at Toko Cung's pickup area). */
export interface WarungShipment {
  id: number;
  mode: "antar" | "ambil";
  status: "PENDING" | "CARRYING";
  boxes: number;
  fee: number;
  items: OrderLine[];
  etaAt: string | null;
}
/** Boxes waiting at the pickup area for a player in this channel (everyone sees them). */
export interface LotPickup {
  warungId: number;
  owner: string | null;
  boxes: number;
}
/** Toko Cung pickup area where "bawa sendiri" boxes wait (world x, z). */
export const PICKUP_SPOT: [number, number] = [12.8, 10.5];
export interface WarungSnapshot {
  /** F6 Agen & Grosir; null/missing while WORLD_AGEN_ENABLED is off. */
  agen?: import("./agen").AgenInfo | null;
  kasbon?: {
    balance: number;
    limit: number;
    available: number;
    repayPercent: number;
    text: Record<string, string>;
  } | null;
  gangMessages?: { id: number; npc: string; text: string; amount: number; at: string }[];
  /** Server supports validated, persistent decoration placement. */
  decorPlacementSupported?: boolean;
  catalog: WarungItem[];
  levels: Record<string, WarungLevel>;
  warung: MyWarung | null;
  /** Part-time wages saved before owning a warung. */
  savings: number;
  event: WarungEvent | null;
  rent: WarungRent | null;
  story: WarungStory | null;
  /** Missing until the backend ships kavling hybrid. */
  lotMarket?: WarungLotOffer[];
  /** F7; missing on older backends. */
  cityLots?: CityLotState;
  shipments?: WarungShipment[];
  decor?: WarungDecorItem[];
  debts: WarungDebt[];
  /** Missing on older backends. */
  debtHistory?: WarungDebtHistory[];
  news: WarungNews[];
  settled: {
    minutes: number;
    customers: number;
    revenue: number;
    items: Record<string, number>;
  } | null;
  journal: {
    cashMovement?: boolean;
    label?: string;
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
  agen?: import("./agen").AgenCard[];
}
export interface OrderLine {
  itemId: string;
  qty: number;
}

// Wall / awning colors grow with the warung level (Warung Teras → Grosir).
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

/** Toko Cung shelf zones (world/layout SHELVES ids) → warung catalog items picked there for kulakan. */
export const SHELF_ITEMS: Record<string, readonly string[]> = {
  "shelf-instant-noodle": ["mi-instan", "kopi-sachet", "kerupuk"],
  "shelf-drink": ["teh-gelas", "air-mineral", "es-krim"],
  "shelf-fresh": ["telur", "gula", "minyak", "beras"],
  "shelf-snack": ["sabun"],
};

/** Same rule as the server (WarungLife): close < open wraps past midnight, equal = 24 h; game hours. */
export function isWarungOpenAt(open: number, close: number, hour: number) {
  const span = (close - open + 24) % 24 || 24;
  return (hour - open + 24) % 24 < span;
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

export interface LeaderboardRow {
  rank: number;
  id: number;
  name: string;
  ownerName: string | null;
  level: number;
  levelName: string;
  /** Omzet from NPC customers (auto, layani, part-time, ojol, utang lunas). */
  npc: number;
  /** Omzet from other players, counted at most at market price. */
  player: number;
  total: number;
}
export interface WarungLeaderboard {
  since: string;
  top: LeaderboardRow[];
  me: LeaderboardRow | null;
}

/** Compact rupiah for the 3D board: Rp1,2jt / Rp850rb. */
export function rupiahShort(n: number) {
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  if (n >= 1_000) return `Rp${Math.round(n / 1_000)}rb`;
  return `Rp${n}`;
}

export type CustomerPersonality = "bawel" | "sabar" | "biasa" | "kecewa" | "event";

/** Maps remaining patience ratio (0..1) to an expressive emoji. */
export function patienceEmoji(ratio: number): string {
  if (ratio > 0.65) return "😊";
  if (ratio > 0.42) return "🙂";
  if (ratio > 0.22) return "😐";
  if (ratio > 0.1) return "😠";
  return "🤬";
}

/** Deterministic street hangout spots in the city where active debtors can be spotted and collected. */
export const DEBTOR_SPOTS: readonly { x: number; z: number; area: string }[] = [
  { x: 14, z: 16, area: "Trotoar depan Toko Cung" },
  { x: -15, z: 18, area: "Pinggir jalan barat Toko Cung" },
  { x: 8.35, z: 23.85, area: "Sekitar Alun-alun Cung" },
  { x: -12.65, z: 23.85, area: "Taman Alun-alun" },
  { x: 24, z: 24, area: "Simpang Pasar" },
  { x: -24, z: 12, area: "Gang Perumahan" },
];

export function debtorSpot(debtId: number) {
  const idx = ((debtId % DEBTOR_SPOTS.length) + DEBTOR_SPOTS.length) % DEBTOR_SPOTS.length;
  return DEBTOR_SPOTS[idx]!;
}
