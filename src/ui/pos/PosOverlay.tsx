import { formatIdr } from "@/commerce/products/catalog";
import { cartTotal, useGame } from "@/state/game-store";
import { OverlayShell } from "@/ui/OverlayShell";

/** Retail POS di meja kasir. Total ditampilkan sebagai estimasi; server yang final. */
export function PosOverlay() {
  const cart = useGame((s) => s.cart);
  const changeQty = useGame((s) => s.changeQty);
  const setOverlay = useGame((s) => s.setOverlay);
  const total = cartTotal(cart);

  return (
    <OverlayShell
      title="Kasir Toko Cung"
      subtitle="Retail POS · struk sementara, total resmi dihitung di server"
      wide
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-3xl tracking-wide">{formatIdr(total)}</p>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setOverlay("payment")}
            className="rounded-lg bg-world-brand px-5 py-3 font-semibold text-world-brand-foreground transition hover:brightness-110 disabled:opacity-40"
          >
            Bayar sekarang
          </button>
        </div>
      }
    >
      {cart.length === 0 ? (
        <p className="text-world-muted text-sm">
          Keranjang masih kosong. Ambil barang dari rak dulu, lalu kembali ke kasir.
        </p>
      ) : (
        <ul className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
          {cart.map((line) => (
            <li
              key={line.sku}
              className="flex items-center justify-between gap-4 rounded-lg border border-world-outline px-4 py-3"
            >
              <div>
                <p className="font-medium">{line.name}</p>
                <p className="text-world-muted text-xs">
                  {formatIdr(line.price)} × {line.qty} = {formatIdr(line.price * line.qty)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Kurangi ${line.name}`}
                  onClick={() => changeQty(line.sku, -1)}
                  className="h-8 w-8 rounded-md border border-world-outline"
                >
                  −
                </button>
                <span className="w-6 text-center">{line.qty}</span>
                <button
                  type="button"
                  aria-label={`Tambah ${line.name}`}
                  onClick={() => changeQty(line.sku, 1)}
                  className="h-8 w-8 rounded-md border border-world-outline"
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </OverlayShell>
  );
}
