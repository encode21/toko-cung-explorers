import { kulakanPrice } from "./agen";
import type { WarungItem, WarungSnapshot } from "./model";

/** Server GrosirSale::snapshot: Toko Grosir sale on twin game dates (1/1 … 12/12). */
export interface GrosirSaleInfo {
  active: boolean;
  date: string;
  endsAt: string | null;
  nextAt: string;
  title: string;
  body: string;
  discountPercent: number;
  flash: { itemId: string; discountPercent: number; quota: number; used: number }[];
}

type PriceData = Pick<WarungSnapshot, "agen" | "grosirSale"> | null | undefined;

/** Unit price at the Toko Grosir kasir now: `was` is the struck-through price while the sale runs. */
export function grosirUnitPrice(item: WarungItem, data: PriceData) {
  const base = kulakanPrice(item, data?.agen);
  const sale = data?.grosirSale?.active ? data.grosirSale : null;
  if (!sale) return { price: base, was: null, flash: null };
  const flash = sale.flash.find((f) => f.itemId === item.id) ?? null;
  const left = flash ? Math.max(0, flash.quota - flash.used) : 0;
  const pct = flash && left > 0 ? flash.discountPercent : sale.discountPercent;
  return { price: Math.floor((base * (100 - pct)) / 100), was: base, flash, left };
}

/** Line total like the server (GrosirSale::cost): flash price up to the quota left, sale price after. */
export function grosirLineCost(item: WarungItem, qty: number, data: PriceData) {
  const base = kulakanPrice(item, data?.agen);
  const sale = data?.grosirSale?.active ? data.grosirSale : null;
  if (!sale) return base * qty;
  const salePrice = Math.floor((base * (100 - sale.discountPercent)) / 100);
  const flash = sale.flash.find((f) => f.itemId === item.id);
  if (!flash) return salePrice * qty;
  const n = Math.min(qty, Math.max(0, flash.quota - flash.used));
  return n * Math.floor((base * (100 - flash.discountPercent)) / 100) + (qty - n) * salePrice;
}

/** "2j 05m" / "12m 30d" until an ISO instant. */
export function countdown(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.floor((Date.parse(iso) - now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0
    ? `${h}j ${String(m).padStart(2, "0")}m`
    : `${m}m ${String(s % 60).padStart(2, "0")}d`;
}
