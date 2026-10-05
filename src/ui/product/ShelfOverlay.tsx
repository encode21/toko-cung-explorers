import { useEffect, useState } from "react";
import { formatIdr, productsOnShelf, type Product } from "@/commerce/products/catalog";
import { shelfById } from "@/game/world/layout";
import { useGame } from "@/state/game-store";
import { OverlayShell } from "@/ui/OverlayShell";

const STATUS_STYLE: Record<Product["status"], string> = {
  Tersedia: "text-world-muted",
  Menipis: "text-world-accent",
  Habis: "text-world-accent",
};

/** Panel rak: daftar produk asli Toko Cung + detail produk saat dipilih. */
export function ShelfOverlay() {
  const shelf = useGame((s) => s.activeShelf);
  const addToCart = useGame((s) => s.addToCart);
  const zone = shelf ? shelfById(shelf) : undefined;
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSku(null);
  }, [shelf]);

  if (!zone) return null;
  const products = productsOnShelf(zone.id);
  const selected = products.find((p) => p.sku === selectedSku) ?? null;

  if (selected) {
    const out = selected.stock <= 0;
    return (
      <OverlayShell title={selected.name} subtitle={`${selected.category} · ${selected.unit}`}>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedSku(null)}
            className="text-world-muted text-xs underline transition hover:text-world-panel-foreground"
          >
            ← Kembali ke {zone.label}
          </button>

          <p className="font-display text-3xl leading-none">{formatIdr(selected.price)}</p>
          <p className="text-sm leading-relaxed text-world-panel-foreground">{selected.description}</p>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-world-outline px-3 py-2">
              <dt className="text-world-muted text-[11px] uppercase tracking-widest">SKU</dt>
              <dd>{selected.sku}</dd>
            </div>
            <div className="rounded-lg border border-world-outline px-3 py-2">
              <dt className="text-world-muted text-[11px] uppercase tracking-widest">Stok</dt>
              <dd className={STATUS_STYLE[selected.status]}>
                {selected.stock} · {selected.status}
              </dd>
            </div>
            <div className="rounded-lg border border-world-outline px-3 py-2">
              <dt className="text-world-muted text-[11px] uppercase tracking-widest">Terjual 30 hari</dt>
              <dd>{selected.sales30d}</dd>
            </div>
            <div className="rounded-lg border border-world-outline px-3 py-2">
              <dt className="text-world-muted text-[11px] uppercase tracking-widest">Tren 30 hari</dt>
              <dd>
                {selected.change30d > 0 ? "+" : ""}
                {selected.change30d}%
              </dd>
            </div>
          </dl>

          <button
            type="button"
            disabled={out}
            onClick={() => addToCart(selected)}
            className="w-full rounded-lg bg-world-accent px-4 py-3 font-semibold text-sm text-world-accent-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {out ? "Stok habis" : "Ambil dan masukkan keranjang"}
          </button>
        </div>
      </OverlayShell>
    );
  }

  return (
    <OverlayShell title={zone.label} subtitle="Pilih produk untuk melihat detailnya">
      <ul className="grid max-h-[52vh] gap-2 overflow-y-auto pr-1">
        {products.map((p) => {
          const out = p.stock <= 0;
          return (
            <li key={p.sku}>
              <button
                type="button"
                onClick={() => setSelectedSku(p.sku)}
                className="flex w-full items-center justify-between gap-4 rounded-lg border border-world-outline bg-world-panel px-4 py-3 text-left transition hover:border-world-accent"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-world-panel-foreground">{p.name}</span>
                  <span className="block truncate text-world-muted text-xs">
                    {p.sku} · {p.unit} · stok {p.stock}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold text-sm text-world-panel-foreground">{formatIdr(p.price)}</span>
                  <span className={`block text-xs ${out ? "text-world-accent" : "text-world-muted"}`}>{p.status}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </OverlayShell>
  );
}
