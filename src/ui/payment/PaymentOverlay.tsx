import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { formatIdr } from "@/commerce/products/catalog";
import { createCheckout, getPaymentStatus, type CheckoutSession } from "@/services/paymentApi/checkout.functions";
import { useGame } from "@/state/game-store";
import { MockQr } from "@/ui/payment/MockQr";
import { OverlayShell } from "@/ui/OverlayShell";

type Method = "QRIS" | "VA";

export function PaymentOverlay() {
  const cart = useGame((s) => s.cart);
  const completeOrder = useGame((s) => s.completeOrder);
  const [method, setMethod] = useState<Method | null>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);
  const checkout = useServerFn(createCheckout);
  const status = useServerFn(getPaymentStatus);

  const start = async (m: Method) => {
    setBusy(true);
    setError(null);
    setMethod(m);
    try {
      const s = await checkout({ data: { items: cart.map((l) => ({ sku: l.sku, qty: l.qty })), method: m } });
      setSession(s);
      startedAt.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout gagal.");
      setMethod(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await status({ data: { orderId: session.orderId, elapsedMs: Date.now() - startedAt.current } });
        if (!active) return;
        if (res.status === "PAID") {
          completeOrder({
            id: session.orderId,
            method: session.method,
            total: session.total,
            paidAt: res.paidAt ?? new Date().toISOString(),
          });
        }
      } catch {
        /* polling gagal sesekali tidak fatal */
      }
    };
    const id = setInterval(() => void tick(), 1500);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [session, status, completeOrder]);

  return (
    <OverlayShell title="Pembayaran" subtitle="Simulasi Xendit · QRIS atau Virtual Account">
      {!session ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["QRIS", "VA"] as Method[]).map((m) => (
            <button
              key={m}
              type="button"
              disabled={busy || cart.length === 0}
              onClick={() => void start(m)}
              className="rounded-xl border border-world-outline px-4 py-6 text-left transition hover:border-world-accent disabled:opacity-40"
            >
              <p className="font-display text-2xl tracking-wide">{m === "QRIS" ? "QRIS" : "VIRTUAL ACCOUNT"}</p>
              <p className="mt-1 text-world-muted text-sm">
                {m === "QRIS" ? "Scan sekali, langsung lunas." : "Transfer ke nomor VA bank."}
              </p>
            </button>
          ))}
          {error && <p className="text-sm text-world-accent sm:col-span-2">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {session.method === "QRIS" && session.qrPayload ? (
            <MockQr payload={session.qrPayload} />
          ) : (
            <div className="rounded-lg border border-world-outline px-5 py-6 text-center">
              <p className="text-world-muted text-xs uppercase tracking-widest">{session.virtualAccount?.bank}</p>
              <p className="font-display text-3xl tracking-widest">{session.virtualAccount?.number}</p>
            </div>
          )}
          <div className="flex-1 text-sm">
            <p className="text-world-muted">Order {session.orderId}</p>
            <p className="font-display text-3xl tracking-wide">{formatIdr(session.total)}</p>
            <ul className="mt-2 space-y-1 text-world-muted text-xs">
              {session.lines.map((l) => (
                <li key={l.sku}>
                  {l.name} × {l.qty} — {formatIdr(l.subtotal)}
                </li>
              ))}
            </ul>
            <p className="mt-3 animate-pulse">Menunggu pembayaran…</p>
            <p className="mt-1 text-world-muted text-xs">
              Status pembayaran dipastikan oleh server, bukan oleh browser.
            </p>
          </div>
        </div>
      )}
    </OverlayShell>
  );
}
