import type { Vec3 } from "../layout";

/** Meter-based modules. Ground-floor retail coordinates remain stable. */
export const FLOORS = [
  { id: "retail", level: 1, base: 0, height: 3.2, label: "01 · GROSIR & RETAIL", access: "open" },
  {
    id: "service",
    level: 2,
    base: 3.4,
    height: 3.2,
    label: "02 · LAYANAN & KOMUNITAS",
    access: "future",
  },
  {
    id: "operations",
    level: 3,
    base: 6.8,
    height: 3.2,
    label: "03 · STOK & PACKING",
    access: "future",
  },
] as const;
export const LIFT: Vec3 = [7, 0, -20];
export const WORLD_POINTS: {
  id: string;
  label: string;
  position: Vec3;
  radius: number;
  message: string;
}[] = [
  {
    id: "customer-cart-info",
    label: "Troli belanja",
    position: [-8.1, 0, 0],
    radius: 1.5,
    message:
      "Troli pelanggan · dekati rak untuk melihat produk. Barang pilihan tersimpan di keranjang belanja pada HUD.",
  },
  {
    id: "pickup-info",
    label: "Pickup pesanan",
    position: [12.8, 0, 10.5],
    radius: 2,
    message:
      "Area pickup · pesanan yang telah disiapkan diserahkan kepada kurir di sini. Hubungi Nakama Packing untuk informasi layanan.",
  },
  {
    id: "directory",
    label: "Direktori Toko Cung",
    position: [2.7, 0, 5],
    radius: 1.8,
    message:
      "Lantai 1: belanja & kasir. Lantai 2: layanan & komunitas (segera). Lantai 3: stok & packing (segera). Lift di gudang belakang.",
  },
  {
    id: "service-lift",
    label: "Lift · Lantai 2 / 3",
    position: [7, 0, -18.4],
    radius: 1.7,
    message:
      "Lift belum beroperasi. Lantai 2 disiapkan untuk layanan dan komunitas; lantai 3 untuk stok dan packing.",
  },
  {
    id: "loading-dispatch",
    label: "Bongkar muat",
    position: [0, 0, -23.6],
    radius: 2,
    message:
      "Area bongkar muat · akses gudang melalui pintu belakang. Pickup pesanan aktif berada di depan, bersama kurir.",
  },
  {
    id: "featured-products",
    label: "Promo hari ini",
    position: [-2.6, 0, 2.1],
    radius: 1.3,
    message:
      "Jelajahi rak makanan, minuman, dan sembako. Dekati rak untuk melihat produk dan memasukkannya ke keranjang.",
  },
];
/** Future triggers are explicitly disabled; no client-side staff authorization. */
export const FUTURE_TRIGGERS = [
  {
    id: "community-event",
    floor: 2,
    center: [0, 4.9, -4] as Vec3,
    size: [8, 3, 8] as Vec3,
    enabled: false,
  },
  {
    id: "stock-event",
    floor: 3,
    center: [0, 8.3, -15] as Vec3,
    size: [12, 3, 10] as Vec3,
    enabled: false,
  },
];
