/**
 * Kontrak Laravel Toko Cung API (referensi untuk integrasi berikutnya).
 *
 * Semua panggilan ke endpoint ini WAJIB dari server (createServerFn), bukan dari
 * browser: token API dan endpoint privileged tidak boleh ada di client bundle.
 */

export interface ApiProduct {
  sku: string;
  name: string;
  /** Harga authoritative dari backend, dalam rupiah. */
  price: number;
  stock: number;
  category: string;
  /** Pemetaan ke zona rak di dunia 3D. */
  shelf?: string;
  image_url?: string | null;
}

export interface ApiCartLine {
  sku: string;
  qty: number;
}

export interface ApiOrder {
  id: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  total: number;
  payment_method: "QRIS" | "VA";
  created_at: string;
}

export const TOKO_CUNG_API_ROUTES = {
  products: "/api/products",
  stock: "/api/stock",
  cart: "/api/cart",
  checkout: "/api/checkout",
  orders: "/api/orders",
} as const;
