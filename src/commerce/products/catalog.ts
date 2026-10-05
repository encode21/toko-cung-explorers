import type { PropKey } from "@/assets/game-assets";
import type { ShelfId } from "@/game/world/layout";
import { TOKO_CUNG_INVENTORY, type InventoryItem, type StockStatus } from "@/commerce/products/tokocung-inventory";

/**
 * Katalog dunia 3D diturunkan langsung dari inventaris Toko Cung asli
 * (TOKO_CUNG_INVENTORY). Harga & stok authoritative nanti datang dari Laravel API
 * lewat src/services/tokoCungApi — klien tidak pernah menentukan harga final.
 */
export interface Product {
  sku: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  status: StockStatus;
  sales30d: number;
  change30d: number;
  unit: string;
  description: string;
  shelf: ShelfId;
  prop: PropKey;
}

/** Kategori Toko Cung → zona rak di dunia. */
const CATEGORY_SHELF: Record<string, ShelfId> = {
  "Makanan Instan": "shelf-instant-noodle",
  Minuman: "shelf-drink",
  Rokok: "shelf-snack",
  "Rumah Tangga": "shelf-snack",
  Sembako: "shelf-fresh",
};

/** Bentuk fisik produk di rak (prop 3D). */
const SKU_PROP: Record<string, PropKey> = {
  "GLD-DL-200": "cartonSmall",
  "GLD-VL-200": "carton",
  "IDM-GR-85": "bag",
  "AQA-600": "sodaBottle",
  "RKX-16": "candyBar",
  "MYG-SN-2L": "bottleOil",
  "SBN-LB-250": "bottleKetchup",
  "KPA-165": "canSmall",
};

function toProduct(item: InventoryItem): Product {
  return {
    sku: item.sku,
    name: item.name,
    price: item.price,
    stock: item.stock,
    category: item.category,
    status: item.status,
    sales30d: item.sales30d,
    change30d: item.change30d,
    unit: item.unit,
    description: item.description,
    shelf: CATEGORY_SHELF[item.category] ?? "shelf-fresh",
    prop: SKU_PROP[item.sku] ?? "can",
  };
}

export const PRODUCTS: Product[] = TOKO_CUNG_INVENTORY.map(toProduct);

export function productsOnShelf(shelf: ShelfId): Product[] {
  return PRODUCTS.filter((p) => p.shelf === shelf);
}

export function productBySku(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}
