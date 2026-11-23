import type { OrderLine, PublicWarung, WarungItem, WarungSnapshot } from "@/game/warung/model";
import type { WarungCustomer } from "@/game/warung/store";
import type { WarungDecorItem } from "@/game/warung/decor";

/** Local example inventory: IDs match the renderer, prices are fixture data only. */
const decor: WarungDecorItem[] = [
  { id: "wall-default", slot: "wall", name: "Dinding bawaan", price: 0, level: 1 },
  { id: "wall-mint", slot: "wall", name: "Cat mint", price: 12000, level: 1 },
  { id: "wall-pink", slot: "wall", name: "Cat merah muda", price: 12000, level: 1 },
  { id: "wall-biru", slot: "wall", name: "Cat biru langit", price: 15000, level: 1 },
  { id: "wall-bata", slot: "wall", name: "Dinding bata", price: 60000, level: 2 },
  { id: "awning-default", slot: "awning", name: "Kanopi bawaan", price: 0, level: 1 },
  { id: "awning-tosca", slot: "awning", name: "Kanopi tosca", price: 25000, level: 1 },
  { id: "awning-kuning", slot: "awning", name: "Kanopi kuning", price: 25000, level: 1 },
  { id: "awning-pelangi", slot: "awning", name: "Kanopi pelangi", price: 75000, level: 2 },
  { id: "awning-emas", slot: "awning", name: "Kanopi emas", price: 300000, level: 4 },
  { id: "floor-kotak", slot: "floor", name: "Ubin kotak", price: 0, level: 1 },
  { id: "floor-catur", slot: "floor", name: "Lantai catur", price: 35000, level: 1 },
  { id: "floor-kayu", slot: "floor", name: "Lantai kayu", price: 50000, level: 2 },
  { id: "floor-teraso", slot: "floor", name: "Lantai teraso", price: 80000, level: 2 },
  { id: "poster", slot: "extra", name: "Poster promo", price: 10000, level: 1 },
  { id: "tanaman", slot: "extra", name: "Tanaman hias", price: 15000, level: 1 },
  { id: "kipas", slot: "extra", name: "Kipas angin dinding", price: 30000, level: 1 },
  { id: "lampu-hias", slot: "extra", name: "Lampu hias", price: 45000, level: 2 },
  { id: "meja-makan", slot: "extra", name: "Meja makan", price: 80000, level: 2 },
  { id: "kulkas-neon", slot: "extra", name: "Kulkas neon", price: 320000, level: 3 },
];

/** Test-only stock, money, identities and requests. Never used by the game build. */
export const OWNER_ID = 7;
export const VISITOR_ID = 8;
export const requestedItems: OrderLine[] = [
  { itemId: "mi-instan", qty: 1 },
  { itemId: "teh-gelas", qty: 1 },
];
const catalog: WarungItem[] = [
  ["mi-instan", "Mi instan", 2500, 3500, "#f6c343"],
  ["kopi-sachet", "Kopi sachet", 1000, 2000, "#7a4b2a"],
  ["teh-gelas", "Teh gelas", 1000, 2000, "#7ac74f"],
  ["air-mineral", "Air mineral", 2000, 3000, "#2f7fd0"],
  ["kerupuk", "Kerupuk", 1500, 2500, "#e2483d"],
  ["telur", "Telur", 2200, 3000, "#ead0a8"],
  ["gula", "Gula", 14000, 17000, "#3fa7c9"],
  ["minyak", "Minyak goreng", 16000, 19000, "#f6c343"],
  ["beras", "Beras", 12000, 15000, "#59b36a"],
].map(([id, name, wholesale, market, color]) => ({
  id: String(id),
  name: String(name),
  wholesale: Number(wholesale),
  market: Number(market),
  color: String(color),
  weight: 1,
  level: 1,
}));

export function createSnapshot(state: string): WarungSnapshot {
  const management = state === "management" || state === "manage";
  const stock = catalog.map((item, i) => ({
    itemId: item.id,
    qty: state === "empty" ? 0 : management && i < 2 ? i * 2 : 12 + (i % 4),
    price: item.market,
  }));
  return {
    catalog,
    levels: {
      "1": { name: "Gerobak", cost: 0, maxStock: 20, npcPerHour: 20 },
      "2": { name: "Warung", cost: 500000, maxStock: 40, npcPerHour: 30 },
    },
    decor,
    warung: {
      id: OWNER_ID,
      name: "Warung Mampir Dulu",
      level: 1,
      levelName: "Warung",
      cash: 248500,
      totalSales: 138500,
      maxStock: 20,
      nextUpgradeCost: 500000,
      stock,
      hiring: true,
      openHour: state === "closed" ? 18 : 0,
      closeHour: state === "closed" ? 22 : 0,
      isOpen: state !== "closed",
      style: {
        wall: "wall-default",
        awning: "awning-default",
        floor: "floor-kotak",
        extras: ["poster"],
        owned: ["wall-mint", "poster"],
      },
    },
    savings: 25000,
    event: null,
    rent:
      state === "sealed"
        ? {
            landlord: "Koko Cung",
            daily: 15000,
            owedDays: 3,
            owed: 45000,
            sealed: true,
            sealDays: 3,
            dueHour: 6,
            paidUntil: "2026-11-22",
            canBargain: false,
          }
        : management
          ? {
              landlord: "Koko Cung",
              daily: 15000,
              owedDays: 1,
              owed: 15000,
              sealed: false,
              sealDays: 3,
              dueHour: 6,
              paidUntil: "2026-11-22",
              canBargain: true,
            }
          : null,
    story: management
      ? {
          finished: false,
          step: 2,
          total: 8,
          title: "Pelanggan pertama",
          npc: "Koko Cung",
          intro: "Layani warga yang mampir ke warungmu.",
          outro: "Warungmu mulai dikenal warga!",
          label: "Layani pembeli",
          reward: 15000,
          progress: 3,
          target: 5,
          done: false,
        }
      : null,
    debts: [],
    news: [],
    settled: null,
    journal: management
      ? [
          {
            type: "SERVE",
            itemId: "teh-gelas",
            qty: 2,
            amount: 4000,
            cashAfter: 248500,
            at: "2026-11-23T09:30:00Z",
          },
          {
            type: "RESTOCK",
            itemId: "mi-instan",
            qty: 10,
            amount: -25000,
            cashAfter: 244500,
            at: "2026-11-23T08:20:00Z",
          },
        ]
      : [],
    shipments: [],
  };
}

export function createVisit(snapshot: WarungSnapshot): PublicWarung {
  return {
    ...snapshot.warung!,
    stock: structuredClone(snapshot.warung!.stock),
    id: VISITOR_ID,
    name: "Warung Bu Sari",
    ownerName: "Bu Sari",
  };
}

export function createQueue(now = Date.now()): WarungCustomer[] {
  return ["Bu Rini", "Pak Budi", "Mbak Sari"].map((name, i) => ({
    id: `preview-${i}-${now}`,
    name,
    avatar: ["npc-shopper-1", "npc-courier", "npc-shopper-3"][i]!,
    personality: "sabar",
    traitLabel: "Sabar",
    line: "Beli mi instan dan teh gelas ya.",
    waitMs: 10 * 60_000,
    arrivedAt: now - 5000 + i * 600,
    leavingAt: null,
    wantedItems: structuredClone(requestedItems),
  }));
}
