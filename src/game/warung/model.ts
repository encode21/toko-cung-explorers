import type { DeliveryTrip } from "./delivery-route";
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
  truckEta?: number | null;
  deliveryTrips?: DeliveryTrip[];
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
  /** Owner overslept: the warung stays shut until this instant. */
  lateUntil?: string | null;
  style?: WarungStyle;
  rating?: WarungRating;
  /** Upgrade works in progress: the warung is closed until `until`, then becomes `level`. */
  renovation?: WarungRenovation | null;
  damage?: WarungDamage | null;
  /** Everything the next level changes; null at max level or while renovating. */
  upgradePreview?: UpgradePreview | null;
  renovationText?: Record<string, string>;
}
export interface WarungDamage {
  id: number;
  kind: "banjir" | "gempa" | "angin_kencang" | "korsleting";
  name: string;
  text: string;
  status: "damaged" | "repairing";
  stockLost: Record<string, number>;
  repairCost: number;
  subsidyPercent: number;
  subsidyAmount: number;
  netCost: number;
  compliance: { paidDays: number; windowDays: number; percent: number; owed: boolean };
  reason: string;
}
export interface WarungRenovation {
  level: number;
  levelName: string;
  until: string;
  minutesLeft: number;
}
/** Minutes left from the server deadline, so signs stay right between polls. */
export const renovationMinutesLeft = (r: WarungRenovation) =>
  Math.max(0, Math.ceil((Date.parse(r.until) - Date.now()) / 60000));
export interface UpgradePreview {
  level: number;
  name: string;
  cost: number;
  lines: { group: "laku" | "buka" | "tampilan" | "biaya"; text: string }[];
  renovationMinutes: number;
  renovationGameDays: number;
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
  /** Shared delivery arrival time, including a brief unloading/departure window. */
  truckEta?: number | null;
  deliveryTrips?: DeliveryTrip[];
  name: string;
  level: number;
  levelName: string;
  ownerName: string | null;
  totalSales: number;
  stock: WarungStock[];
  hiring: boolean;
  /** Missing until the backend ships kustom warung. */
  style?: WarungStyle;
  rating?: WarungRating;
  renovation?: WarungRenovation | null;
  damage?: WarungDamage | null;
  /** Every kulakan truck near this warung (convoy): arrival ms and parking slot. */
  trucks?: { eta: number; slot: number }[];
}
export interface WarungCard extends Omit<PublicWarung, "stock"> {
  online: boolean;
}
export interface LotCard extends WarungCard {
  /** Index into WARUNG_LOTS (city house lots). */
  lot: number;
  /** Whole days of unpaid rent; missing on older backends. */
  rentDue?: number;
  sealed?: boolean;
}
export type WarungEventKind = "ngutang" | "iuran" | "ojol" | "palak" | "sultan";
export interface WarungEvent {
  id: number;
  kind: WarungEventKind;
  days?: number | null;
  npc: string;
  amount: number;
  items: OrderLine[];
  expiresAt: string;
}
export interface WarungDebt {
  kind?: "ngutang" | "pinjam_uang";
  npcKey?: string | null;
  id: number;
  npc: string;
  amount: number;
  dueAt: string;
  lastRemindedAt?: string | null;
}
/** A debt the owner accepted, with the server's conversation log (Buku utang chat history). */
export interface WarungDebtHistory {
  kind?: "ngutang" | "pinjam_uang";
  npcKey?: string | null;
  messages?: NpcMessage[];
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
    | "rent_bargain_fail"
    | "slept"
    | "review"
    | "staff_restock"
    | "renovation_done"
    | "disaster"
    | "delivery_done";
  npc: string;
  text?: string;
  /** "disaster": server kind id (banjir, gempa, angin_kencang, korsleting). */
  disaster?: string;
  stockLost?: Record<string, number>;
  /** "renovation_done": the level the warung just reached. */
  level?: number;
  levelName?: string;
  /** "review": why the NPC gave `amount` stars. */
  reason?: ReviewReason;
  amount: number;
  /** "slept": game hour the owner wakes and how many hours after opening that is. */
  wakeHour?: number;
  lateHours?: number;
  /** "slept": energy value after sleeping (the full bar comes in the response's `energy`), and whether the alarm was set. */
  energy?: number;
  alarm?: boolean;
  qty?: number;
  extendMinutes?: number;
  /** "staff_restock": what the kurir bought; `amount` includes ongkir. */
  items?: { itemId: string; qty: number }[];
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
    price?: number;
    requirements?: { key: string; label: string; have: number; need: number; ok: boolean }[];
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
/**
 * "Bawa sendiri" boxes (world x, z). East of the JPO south stairs (they end at x 12.5)
 * and south of the sidewalk, on the pickup driveway — not under the halte approach.
 */
export const PICKUP_SPOT: [number, number] = [13.6, 8.2];
export interface WarungSnapshot {
  guardAssist?: { active: boolean; limit: number; remaining: number; resetsAt: number } | null;
  guardServed?: {
    items: OrderLine[];
    refused: string[];
    pricey: boolean;
    total: number;
    alreadyServed?: boolean;
  } | null;
  guardConfronted?: boolean;
  contacts?: NpcContact[];
  /** F6 Agen & Grosir; null/missing while WORLD_AGEN_ENABLED is off. */
  agen?: import("./agen").AgenInfo | null;
  delivery?: import("../delivery/model").DeliverySnapshot | null;
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
  /** Only on a serve response. Missing on older backends. */
  served?: ServeReceipt | null;
  settled: {
    /** Server confirms that these sales were handled by the shop's employee. */
    staffed?: boolean;
    minutes: number;
    customers: number;
    revenue: number;
    items: Record<string, number>;
    /** Buyers who walked away from an above-market price, per item. Missing on older backends. */
    refusedPricey?: Record<string, number>;
    /** Count each buyer once even when several basket lines were refused. */
    refusedPriceyCustomers?: number;
  } | null;
  journal: {
    id?: number;
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

/** The order can still be filled from server stock; an emptied rack ends it gracefully. */
export function orderFillable(order: OrderLine[], stock: WarungStock[]) {
  return (
    order.length > 0 &&
    order.every((l) => (stock.find((s) => s.itemId === l.itemId)?.qty ?? 0) >= l.qty)
  );
}

/** Leaving your warung. `guard`: true/false when the staff feature is on, null when it is off (old rules). */
export function exitNotice(locked: boolean, guard: boolean | null) {
  if (guard)
    return "🧑‍💼 Penjaga warung jaga toko: jualan jalan terus selagi kamu pergi, maling nggak berani masuk.";
  const lock = locked
    ? "🔒 Warung dikunci rapat. Aman dari pencuri!"
    : "🔓 Warung tidak dikunci! Hati-hati maling kalau ditinggal lama.";
  return guard === false
    ? `${lock} Tanpa penjaga, warung tidak jualan selama kamu pergi. Rekrut Penjaga warung di menu Karyawan.`
    : lock;
}

export interface SaleBuffer {
  items: Record<string, number>;
  revenue: number;
}
/**
 * Short settles (the penjaga selling between polls) merge into one "ada yang beli" toast, at most once a
 * minute; `hold` defers it while another notice (kurir) owns the single toast slot.
 */
export function saleToast(
  buf: SaleBuffer | null,
  settled: { revenue: number; items: Record<string, number> } | null,
  now: number,
  lastAt: number,
  hold: boolean,
): { buf: SaleBuffer | null; flush: SaleBuffer | null } {
  let next = buf;
  if (settled && settled.revenue > 0) {
    const items = { ...(buf?.items ?? {}) };
    for (const [id, q] of Object.entries(settled.items)) items[id] = (items[id] ?? 0) + q;
    next = { items, revenue: (buf?.revenue ?? 0) + settled.revenue };
  }
  return next && !hold && now - lastAt >= 60_000
    ? { buf: null, flush: next }
    : { buf: next, flush: null };
}

/** Server serve receipt (WorldWarung `served`): what was charged at the player's own prices. */
export interface ServeReceipt {
  lines: { itemId: string; qty: number; price: number; amount: number }[];
  base: number;
  tip: number;
  fastTip: number;
  combo: number;
  total: number;
  kasbon: number;
}

/** Order total at the warung's own set prices (before tips), as the server charges it. */
export const orderTotal = (order: OrderLine[], stock: WarungStock[]) =>
  order.reduce((a, l) => a + (stock.find((s) => s.itemId === l.itemId)?.price ?? 0) * l.qty, 0);

/**
 * Live buyers use the offline rule (buyChance): each line priced more than 5% above market is bought with that chance,
 * otherwise dropped. `pricey` = something above the 5% tolerance was looked at (the buyer grumbles either way).
 */
export function priceCheck(
  order: OrderLine[],
  stock: WarungStock[],
  catalog: WarungItem[],
  rand: () => number = Math.random,
) {
  const kept: OrderLine[] = [];
  const refused: string[] = [];
  let pricey = false;
  for (const l of order) {
    const price = stock.find((s) => s.itemId === l.itemId)?.price ?? 0;
    const market = catalog.find((c) => c.id === l.itemId)?.market ?? price;
    if (fairPrice(price, market)) kept.push(l);
    else {
      pricey = true;
      if (rand() < buyChance(price, market)) kept.push(l);
      else refused.push(l.itemId);
    }
  }
  return { order: kept, refused, pricey };
}

/** Toast after a serve, from the server receipt (never a Kas diff that mixes in penjaga/kurir/payroll). */
export function receiptText(r: ServeReceipt) {
  const extras = [
    r.tip ? `tip ${rupiah(r.tip)}` : "",
    r.fastTip ? `cekatan${r.combo ? ` combo ×${r.combo + 1}` : ""} ${rupiah(r.fastTip)}` : "",
  ].filter(Boolean);
  return `${rupiah(r.base)}${extras.length ? ` + ${extras.join(" + ")}` : ""} = +${rupiah(r.total)} masuk Kas${
    r.kasbon > 0 ? ` (${rupiah(r.kasbon)} otomatis bayar kasbon)` : ""
  }`;
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

/** Mirrors server WarungLife::isOpenNow: hours, the owner not oversleeping past opening, no renovation. */
export function warungOpenNow(
  w: Pick<MyWarung, "openHour" | "closeHour" | "lateUntil" | "renovation" | "damage">,
  hour: number,
  now = Date.now(),
) {
  return (
    isWarungOpenAt(w.openHour, w.closeHour, hour) &&
    !(w.lateUntil && Date.parse(w.lateUntil) > now) &&
    !(w.renovation && Date.parse(w.renovation.until) > now) &&
    w.damage?.status !== "damaged"
  );
}

/** "Indomie ×2, Gula ×1" for staff notices; unknown ids fall back to the id. */
export function itemLines(lines: { itemId: string; qty: number }[], catalog: WarungItem[]) {
  return lines
    .map((l) => `${catalog.find((c) => c.id === l.itemId)?.name ?? l.itemId} ×${l.qty}`)
    .join(", ");
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

/** Up to 5% above market is still fair, without complaints. */
export function fairPrice(price: number, market: number) {
  return price * 100 <= market * 105;
}

/** Mirrors the server: fair prices sell; demand falls to zero at 1.3× market. */
export function buyChance(price: number, market: number) {
  return Math.max(0, Math.min(1, (130 * market - 100 * price) / (25 * market)));
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
  { x: 14, z: 12.6, area: "Trotoar depan Toko Cung" },
  { x: -18, z: 12.6, area: "Pinggir jalan barat Toko Cung" },
  { x: 10, z: 27.6, area: "Dekat Halte Toko Cung" },
  { x: -14, z: 27.6, area: "Trotoar seberang Toko Cung" },
  { x: 24, z: 28.4, area: "Simpang Pasar" },
  { x: -24, z: 12, area: "Gang Perumahan" },
];

export function debtorSpot(debtId: number) {
  const idx = ((debtId % DEBTOR_SPOTS.length) + DEBTOR_SPOTS.length) % DEBTOR_SPOTS.length;
  return DEBTOR_SPOTS[idx]!;
}

export type ReviewReason =
  | "good"
  | "mistake"
  | "slow"
  | "empty"
  | "timeout"
  | "wrong"
  | "mahal"
  | "utang_kasih"
  | "utang_tolak"
  | "tagih_kasar";
/** NPC ratings (server WarungReviews): average of the last 30 reviews. */
export interface WarungRating {
  avg: number | null;
  count: number;
  recent: { stars: number; reason: ReviewReason; npc: string; at: string }[];
}
export const REVIEW_TEXT: Record<ReviewReason, string> = {
  utang_kasih: "Makasih sudah boleh ngutang!",
  utang_tolak: "Belum boleh ngutang, ya sudah…",
  tagih_kasar: "Nagihnya kasar banget…",
  good: "Cepet, pas, mantap!",
  mistake: "Sempat salah ambil sih…",
  slow: "Agak lelet ya.",
  empty: "Barangnya kosong mulu.",
  timeout: "Lelet banget, nunggu kelamaan.",
  wrong: "Salah ambil terus, kapok.",
  mahal: "Mahal banget, di Toko Cung lebih murah…",
};
/** Same stars the server gives a walkout (WarungReviews::forWalkout). */
export const walkoutStars = (reason: "empty" | "timeout" | "wrong" | "mahal") =>
  reason === "wrong" ? 1 : 2;
export const starText = (n: number) => "⭐".repeat(Math.max(1, Math.min(5, Math.round(n))));
/** Leave cue follows only served-vs-not: a slow serve (😅) is still a success; displeasure shows in text/stars. */
/** 🫤 = the item ran out before serving: no fault of the buyer or the player, so no cue. */
export const leaveSfx = (reaction: string) =>
  reaction.startsWith(SOLD_OUT_REACTION) || reaction.startsWith(PRICEY_REACTION)
    ? null
    : ["🤩", "😊", "😅"].some((e) => reaction.startsWith(e))
      ? "cash"
      : "angry";
export const SOLD_OUT_REACTION = "🫤";
/** 😒 = refused overpriced goods: shown in text and stars, never the wrong-order tetot (BUG-105). */
export const PRICEY_REACTION = "😒";
/** A low rating makes walk-ins come a bit less often. */
export const ratingSpawnFactor = (avg: number | null | undefined) =>
  avg == null ? 1 : avg < 3 ? 1.5 : avg < 4 ? 1.2 : 1;

/** First order line the bag doesn't match yet (the item the NPC points at). */
export function wrongItemHint(order: OrderLine[], picked: Record<string, number>) {
  return order.find((l) => (picked[l.itemId] ?? 0) !== l.qty)?.itemId ?? null;
}
/** After the 2nd mistake the annoyed NPC buys less: one fewer of the biggest line, or drops the last line. */
export function shrinkOrder(order: OrderLine[]): OrderLine[] {
  const big = order.reduce((a, l) => (l.qty > a.qty ? l : a), order[0]!);
  if (big.qty > 1) return order.map((l) => (l === big ? { ...l, qty: l.qty - 1 } : l));
  return order.length > 1 ? order.slice(0, -1) : order;
}

/** A regular's chat for their current life chapter (server world-warung-personas). */
export interface NpcChat {
  sessionId: string;
  nodeId: "opening" | "followup" | "loan";
  prompt: string;
  options: { label: string }[];
}
/** Regular shopper; `stages` unlock in order as the warung's total jualan reaches `from`. */
export interface Persona {
  name: string;
  nickname: string;
  avatar: string;
  personality: CustomerPersonality;
  waitMs: number;
  bond: string;
  stages: { from: number; trait: string; story: string; lines: string[]; chat?: NpcChat }[];
}
/** Current life chapter: the last stage whose `from` the warung's total jualan has reached. */
export const personaStage = (p: Persona, totalSales: number) =>
  p.stages.filter((s) => totalSales >= s.from).at(-1) ?? p.stages[0]!;
/** CungChat > Kontak row (server WarungNpcs::contacts). */
export interface NpcContact {
  id: string;
  name: string;
  avatar: string;
  role: string;
  stage: number;
  stages: number;
  story: { trait: string; story: string }[];
  visits: number;
  affinity: number;
  affinityLabel: string;
  canStart: boolean;
  lastMessage: string | null;
  shopLine: string;
  bond: string | null;
  /** In-progress session; a completed session remains readable in the thread. */
  chat: NpcChat | null;
  lastAt: string | null;
}

export interface NpcMessage {
  id: number;
  from: "npc" | "me" | "sys";
  text: string;
  at: string;
  meta?: { reward?: number; loanId?: number; status?: string };
}
export interface NpcThread {
  persona: string;
  messages: NpcMessage[];
  beforeId: number | null;
  active: NpcChat | null;
  canStart: boolean;
  nextChatAt: string;
  loans: {
    id: number;
    amount: number;
    status: "ACCEPTED" | "PAID" | "DEFAULTED";
    dueAt: string;
    canRemind: boolean;
  }[];
}
/** Polls and older pages can overlap; stable message IDs preserve exactly what was said. */
export function mergeNpcMessages(current: NpcMessage[], incoming: NpcMessage[]): NpcMessage[] {
  return [...new Map([...current, ...incoming].map((m) => [m.id, m])).values()].sort(
    (a, b) => a.id - b.id,
  );
}
