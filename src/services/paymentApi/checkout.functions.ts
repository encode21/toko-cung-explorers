import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { productBySku } from "@/commerce/products/catalog";

/**
 * Checkout & payment gateway (vertical slice: MOCK).
 *
 * Harga, stok, dan status pembayaran DITENTUKAN DI SERVER, bukan di browser.
 * Client hanya mengirim sku + qty. Saat Laravel API dan Xendit disambungkan,
 * cukup ganti isi handler ini — kontrak ke game tetap sama.
 */

const CheckoutInput = z.object({
  items: z.array(z.object({ sku: z.string(), qty: z.number().int().min(1).max(99) })).min(1),
  method: z.enum(["QRIS", "VA"]),
});

export interface CheckoutSession {
  orderId: string;
  method: "QRIS" | "VA";
  /** Total resmi dari server. */
  total: number;
  lines: { sku: string; name: string; price: number; qty: number; subtotal: number }[];
  /** Payload QRIS (mock) untuk digambar sebagai QR di layar POS. */
  qrPayload?: string | undefined;
  virtualAccount?: { bank: string; number: string } | undefined;
  expiresAt: string;
  status: "PENDING";
}

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CheckoutInput.parse(input))
  .handler(async ({ data }): Promise<CheckoutSession> => {
    const lines = data.items.map((item) => {
      const product = productBySku(item.sku);
      if (!product) throw new Error(`Produk ${item.sku} tidak ditemukan`);
      if (product.stock < item.qty) throw new Error(`Stok ${product.name} tidak cukup`);
      return {
        sku: product.sku,
        name: product.name,
        price: product.price,
        qty: item.qty,
        subtotal: product.price * item.qty,
      };
    });

    const total = lines.reduce((sum, l) => sum + l.subtotal, 0);
    const orderId = `TCW-${Date.now().toString(36).toUpperCase()}`;

    return {
      orderId,
      method: data.method,
      total,
      lines,
      qrPayload: data.method === "QRIS" ? `00020101021226TOKOCUNG${orderId}5405${total}5802ID` : undefined,
      virtualAccount:
        data.method === "VA"
          ? { bank: "BCA", number: `8808${String(total).padStart(6, "0").slice(0, 6)}${Date.now() % 1000}` }
          : undefined,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: "PENDING",
    };
  });

/** Polling status pembayaran (mock: dianggap lunas setelah beberapa detik). */
export const getPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string(), elapsedMs: z.number().min(0) }).parse(input),
  )
  .handler(async ({ data }) => ({
    orderId: data.orderId,
    status: data.elapsedMs > 6000 ? ("PAID" as const) : ("PENDING" as const),
    paidAt: data.elapsedMs > 6000 ? new Date().toISOString() : null,
  }));
