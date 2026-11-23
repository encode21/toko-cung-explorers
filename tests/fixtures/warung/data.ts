import type { OrderLine, PublicWarung, WarungItem, WarungSnapshot } from "@/game/warung/model";
import type { WarungCustomer } from "@/game/warung/store";

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
  const stock = catalog.map((item, i) => ({
    itemId: item.id,
    qty: state === "empty" ? 0 : 12 + (i % 4),
    price: item.market,
  }));
  return {
    catalog,
    levels: { "1": { name: "Warung", cost: 0, maxStock: 20, npcPerHour: 20 } },
    warung: {
      id: OWNER_ID,
      name: "Warung Mampir Dulu",
      level: 1,
      levelName: "Warung",
      cash: 248500,
      totalSales: 38,
      maxStock: 20,
      nextUpgradeCost: 500000,
      stock,
      hiring: true,
      openHour: state === "closed" ? 18 : 0,
      closeHour: state === "closed" ? 22 : 0,
      isOpen: state !== "closed",
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
        : null,
    story: null,
    debts: [],
    news: [],
    settled: null,
    journal: [],
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
