/**
 * Data Toko Cung asli (produk, stok, penjualan, supplier, kurir) yang diport dari
 * project `toko-cung-insights` (src/data/mock.ts + src/data/ops.ts).
 *
 * Ini adalah sumber tunggal untuk katalog dunia 3D. Nanti nilainya akan diganti
 * response Laravel Toko Cung API — bentuk field sengaja dibuat sama.
 */

export type StockStatus = "Tersedia" | "Menipis" | "Habis";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  category: string;
  status: StockStatus;
  sales30d: number;
  change30d: number;
  /** Satuan jual di rak Toko Cung. */
  unit: string;
  /** Deskripsi produk yang dibacakan NPC dan tampil di panel rak. */
  description: string;
}

export const TOKO_CUNG_INVENTORY: InventoryItem[] = [
  { id: "p1", name: "Golda Dolce Latte 200ml", sku: "GLD-DL-200", stock: 1240, price: 4500, category: "Minuman", status: "Tersedia", sales30d: 890, change30d: 12, unit: "botol 200ml", description: "Kopi susu siap minum rasa dolce latte, manis lembut dan dingin. Paling laris untuk anak sekolah dan ojek online." },
  { id: "p2", name: "Golda Vanilla Latte 200ml", sku: "GLD-VL-200", stock: 480, price: 4500, category: "Minuman", status: "Tersedia", sales30d: 72, change30d: -62, unit: "botol 200ml", description: "Varian vanilla dari Golda, aroma vanilla tebal dengan kopi yang lebih ringan. Cocok untuk yang tidak suka kopi pahit." },
  { id: "p3", name: "Indomie Goreng Special", sku: "IDM-GR-85", stock: 3200, price: 3300, category: "Makanan Instan", status: "Tersedia", sales30d: 2410, change30d: 6, unit: "bungkus 85g", description: "Mi instan goreng paling dicari di Toko Cung. Stok selalu tebal, boleh ambil satuan atau dus isi 40 bungkus." },
  { id: "p4", name: "Aqua Botol 600ml", sku: "AQA-600", stock: 96, price: 3500, category: "Minuman", status: "Menipis", sales30d: 1830, change30d: -4, unit: "botol 600ml", description: "Air mineral 600ml, dingin dari kulkas depan. Stok sedang menipis karena kiriman PT Tirta Jaya baru datang besok." },
  { id: "p5", name: "Rokok Surya X 16", sku: "RKX-16", stock: 320, price: 32000, category: "Rokok", status: "Tersedia", sales30d: 88, change30d: -55, unit: "bungkus isi 16", description: "Rokok kretek filter isi 16 batang. Disimpan di rak belakang kasir, hanya untuk pembeli 18 tahun ke atas." },
  { id: "p6", name: "Minyak Goreng Sania 2L", sku: "MYG-SN-2L", stock: 280, price: 36500, category: "Sembako", status: "Tersedia", sales30d: 95, change30d: -48, unit: "pouch 2 liter", description: "Minyak goreng kemasan pouch 2 liter. Harga grosir mulai pembelian 6 pouch, banyak diambil warung makan sekitar." },
  { id: "p7", name: "Sabun Lifebuoy 250ml", sku: "SBN-LB-250", stock: 0, price: 21000, category: "Rumah Tangga", status: "Habis", sales30d: 410, change30d: -18, unit: "botol 250ml", description: "Sabun mandi cair antibakteri 250ml. Sedang kosong, sudah masuk daftar reorder ke PT Sumber Niaga." },
  { id: "p8", name: "Kopi Kapal Api Special 165g", sku: "KPA-165", stock: 640, price: 18500, category: "Minuman", status: "Tersedia", sales30d: 520, change30d: 9, unit: "pak 165g", description: "Kopi bubuk hitam 165g, pahit mantap untuk seduh manual. Langganan warung kopi di sekitar Toko Cung." },
];

/** Ringkasan gudang Toko Cung. */
export const WAREHOUSE_SUMMARY = {
  status: "LOW STOCK",
  totalSku: 1284,
  stockValue: 812400000,
  lowStock: 5,
  overstock: 8,
  deadStock: 3,
};

/** Daftar reorder gudang beserta supplier pemasoknya. */
export const REORDER_LIST = [
  { name: "Aqua Botol 600ml", stock: 96, min: 240, supplier: "PT Tirta Jaya" },
  { name: "Sabun Lifebuoy 250ml", stock: 0, min: 180, supplier: "PT Sumber Niaga" },
  { name: "Golda Dolce Latte 200ml", stock: 12, min: 150, supplier: "PT Kopi Nusantara" },
  { name: "Indomie Goreng Special", stock: 210, min: 400, supplier: "PT Sumber Niaga" },
  { name: "Minyak Goreng Sania 2L", stock: 88, min: 120, supplier: "PT Pangan Prima" },
];

/** Supplier mitra Toko Cung beserta performa pengiriman. */
export const SUPPLIERS = [
  { name: "PT Sumber Niaga", ontime: 68, late: 12, avgDelay: "2,4 hari" },
  { name: "CV Berkah Jaya", ontime: 91, late: 3, avgDelay: "0,8 hari" },
  { name: "PT Anugerah Pangan", ontime: 74, late: 9, avgDelay: "1,9 hari" },
  { name: "PT Tirta Jaya", ontime: 82, late: 5, avgDelay: "1,2 hari" },
  { name: "PT Kopi Nusantara", ontime: 88, late: 4, avgDelay: "1,0 hari" },
  { name: "PT Pangan Prima", ontime: 79, late: 7, avgDelay: "1,6 hari" },
];

/** Ekspedisi mitra yang melakukan pickup di Toko Cung. */
export const COURIERS = [
  { name: "JNE", awaitingPickup: 8, inTransit: 22 },
  { name: "GoSend", awaitingPickup: 0, inTransit: 3 },
  { name: "Deliveree", awaitingPickup: 0, inTransit: 1 },
];

/** Ringkasan POS harian (dipakai HUD & landing page). */
export const POS_SUMMARY = {
  transactions: 274,
  revenue: 18420000,
  avgBasket: 67200,
  peakHour: "11.00 – 12.00",
  stations: ["Kasir 1", "Kasir 2", "Owner"],
};

export const TODAY_SUMMARY = {
  omzet: 41250000,
  transaksi: 318,
  aov: 129717,
  stockValue: 812400000,
};

export const TOP_PRODUCTS = [
  { name: "Indomie Goreng Special", qty: 412 },
  { name: "Golda Dolce Latte 200ml", qty: 288 },
  { name: "Aqua Botol 600ml", qty: 240 },
  { name: "Rokok Surya X 16", qty: 96 },
];
