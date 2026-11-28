// F6 Agen & Grosir: pure helpers mirroring app/Services/World/WarungAgen.php (server stays the authority).
import { grosirLineCost } from "./grosir-sale";
import type { OrderLine, WarungItem, WarungSnapshot } from "./model";

export interface AgenInfo {
  discountPercent: number;
  discounts: Record<string, number>;
  minLevel: number;
  bulkUoms: string[];
  floorPercent: number;
  maxQtyPerBuy: number;
  dailyCap: number;
  boughtToday: number;
  text: Record<string, string>;
}

export interface AgenCard {
  id: number;
  name: string;
  level: number;
  levelName: string;
  ownerName: string | null;
  offers: number;
  sameGang: boolean;
  langganan: boolean;
}

/** Toko Cung kulakan price per unit after the Agen/Grosir discount (floored like the server). */
export const kulakanPrice = (item: WarungItem, agen?: AgenInfo | null) =>
  Math.floor((item.wholesale * (100 - (agen?.discountPercent ?? 0))) / 100);

export const isBulk = (item: WarungItem | undefined, agen?: AgenInfo | null) =>
  !!item?.uom && !!agen?.bulkUoms.includes(item.uom);

/** [min, max] partai price: floor%..100% of the Toko Cung price. */
export const bulkRange = (item: WarungItem, agen: AgenInfo): [number, number] => [
  Math.ceil((item.wholesale * agen.floorPercent) / 100),
  item.wholesale,
];

/** Kulakan basket total at this warung's (possibly discounted, possibly on-sale) Toko Cung prices. */
export const basketTotal = (basket: OrderLine[], data: WarungSnapshot | null | undefined) =>
  basket.reduce((sum, line) => {
    const item = data?.catalog.find((c) => c.id === line.itemId);
    return sum + (item ? grosirLineCost(item, line.qty, data) : 0);
  }, 0);
