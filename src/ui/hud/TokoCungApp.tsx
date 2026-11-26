import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Minus, Plus, ShoppingBasket, Truck } from "lucide-react";
import { ProductArt } from "@/game/warung/ProductArt";
import { rupiah, type WarungItem } from "@/game/warung/model";
import { basketTotal, kulakanPrice } from "@/game/warung/agen";
import {
  addToBasket,
  deliveryFee,
  ensureWarungData,
  payBasket,
  useWarung,
  warungCommand,
} from "@/game/warung/store";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { useHud } from "@/state/hud-store";
import { AppBridge } from "@/lib/app-bridge";
import { finaleCommand, useFinale } from "@/game/finale/store";
import { PhoneAppScreen } from "./PhonePanel";
import "./toko-cung-app.css";

function Quantity({
  item,
  value,
  max,
  increment,
  busy,
  onChange,
}: {
  item: WarungItem;
  value: number;
  max: number;
  increment: number;
  busy: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const enteredValue = () => {
    const parsed = Number(draft);
    return draft?.trim() && Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : value;
  };
  const commit = () => {
    if (draft === null) return;
    const next = enteredValue();
    setDraft(null);
    onChange(next);
    if (!next) addButton.current?.focus();
  };
  const step = (delta: number) => {
    const next = Math.max(0, enteredValue() + delta);
    setDraft(null);
    onChange(next);
    if (!next) addButton.current?.focus();
  };
  return (
    <div
      className="toko-quantity"
      data-selected={value > 0 || undefined}
      role="group"
      aria-label={`Jumlah ${item.name}`}
    >
      {value > 0 && (
        <>
          <button
            type="button"
            disabled={busy}
            aria-label={`Kurangi ${item.name}`}
            onPointerDown={(event) => {
              if (draft !== null) event.preventDefault();
            }}
            onClick={() => step(-1)}
          >
            <Minus aria-hidden />
          </button>
          <input
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            autoComplete="off"
            pattern="[0-9]*"
            aria-label={`Jumlah ${item.name}`}
            title="Ketuk angka untuk mengetik jumlah"
            value={draft ?? value}
            disabled={busy}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key !== "Escape") event.stopPropagation();
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                step(event.key === "ArrowUp" ? increment : -1);
              }
            }}
          />
        </>
      )}
      <button
        ref={addButton}
        type="button"
        disabled={busy || enteredValue() >= max}
        aria-label={`Tambah ${item.name}`}
        onPointerDown={(event) => {
          if (draft !== null) event.preventDefault();
        }}
        onClick={() => step(increment)}
      >
        <Plus aria-hidden />
      </button>
    </div>
  );
}

export function TokoCungApp() {
  const softsell = useFinale((s) => (s.data?.enabled ? s.data.softsell : false));
  useEffect(() => {
    if (!useFinale.getState().data) void finaleCommand("state");
  }, []);
  const data = useWarung((s) => s.data);
  const basket = useWarung((s) => s.basket);
  const busy = useWarung((s) => s.busy);
  const error = useWarung((s) => s.error);
  const recommended = useWarung((s) => s.recommendedRestock);
  const [loading, setLoading] = useState(!data);
  const [view, setView] = useState<"catalog" | "cart">("catalog");
  const [increment, setIncrement] = useState(1);
  const [ordered, setOrdered] = useState(false);
  const [quantityNotice, setQuantityNotice] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    void ensureWarungData().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  const changeView = (next: "catalog" | "cart") => {
    setView(next);
    scroll.current?.scrollTo({ top: 0 });
  };
  const screen = (content: ReactNode) => (
    <PhoneAppScreen
      app="tokocung"
      title="Toko Cung App"
      backAction={
        view === "cart"
          ? { label: "Kembali ke produk", onClick: () => changeView("catalog") }
          : null
      }
    >
      {content}
    </PhoneAppScreen>
  );
  const w = data?.warung;
  if (loading)
    return screen(
      <div className="toko-app toko-empty" role="status">
        Memuat produk…
      </div>,
    );
  if (!data)
    return screen(
      <div className="toko-app toko-empty">
        <p>Produk belum dapat dimuat.</p>
        <button className="toko-primary" disabled={busy} onClick={() => void warungCommand("read")}>
          Coba lagi
        </button>
      </div>,
    );
  if (!w)
    return screen(
      <div className="toko-app toko-empty">
        <ShoppingBasket aria-hidden />
        <p>Buka warung untuk mulai belanja stok.</p>
        <button className="toko-primary" onClick={() => useHud.getState().setSheet("warung")}>
          Buka Warungku
        </button>
      </div>,
    );

  const quantity = (id: string) => basket.find((line) => line.itemId === id)?.qty ?? 0;
  const pending = (id: string) =>
    (data.shipments ?? []).reduce(
      (sum, shipment) =>
        sum +
        shipment.items.filter((line) => line.itemId === id).reduce((n, line) => n + line.qty, 0),
      0,
    );
  const stock = (id: string) => w.stock.find((line) => line.itemId === id)?.qty ?? 0;
  const limit = (item: WarungItem) =>
    item.level > w.level
      ? 0
      : Math.max(0, Math.min(999, w.maxStock - stock(item.id) - pending(item.id)));
  const items = data.catalog;
  const lines = basket.map((line) => {
    const item = data.catalog.find((entry) => entry.id === line.itemId);
    return { ...line, item, maximum: item ? limit(item) : 0 };
  });
  const subtotal = basketTotal(basket, data);
  const count = basket.reduce((sum, line) => sum + line.qty, 0);
  const fee = count ? deliveryFee(subtotal) : 0;
  const total = subtotal + fee;
  const invalid = lines.some((line) => line.qty > line.maximum);
  const short = Math.max(0, total - w.cash);
  const changeQuantity = (item: WarungItem, next: number) => {
    if (useWarung.getState().busy) return;
    const current = useWarung.getState().basket.find((line) => line.itemId === item.id)?.qty ?? 0;
    const maximum = limit(item);
    addToBasket(item.id, Math.max(0, Math.min(maximum, next)) - current);
    setQuantityNotice(
      next > maximum ? `${item.name}: maksimal ${maximum} dalam keranjang sesuai sisa rak.` : "",
    );
    setOrdered(false);
  };
  const counter = (item: WarungItem, maximum: number) => (
    <Quantity
      item={item}
      value={quantity(item.id)}
      max={maximum}
      increment={increment}
      busy={busy}
      onChange={(next) => changeQuantity(item, next)}
    />
  );
  const order = async () => {
    if (await payBasket("antar")) {
      setOrdered(true);
      changeView("catalog");
    } else scroll.current?.scrollTo({ top: 0 });
  };

  return screen(
    <div className="toko-app" data-tokocung-app aria-busy={busy}>
      <div className="toko-wallet">
        <span>Kas game</span>
        <strong>
          <KasMoneyIcon aria-hidden />
          {rupiah(w.cash)}
        </strong>
      </div>
      {quantityNotice && (
        <p className="toko-quantity-notice" role="status">
          {quantityNotice}
        </p>
      )}
      <div className="toko-scroll" ref={scroll}>
        {ordered && (
          <div className="toko-notice" role="status">
            <Check aria-hidden />
            <span>Pesanan berhasil! Truk akan mengantar ke {w.name}.</span>
          </div>
        )}
        {ordered && softsell && (
          // F8 soft-sell (DAGANG): one quiet line on the kulakan receipt, never blocks the order.
          <AppBridge className="toko-app-bridge">Belanja grosir beneran di Toko Cung App</AppBridge>
        )}
        {error && (
          <p className="toko-error" role="alert">
            {error}
          </p>
        )}
        {view === "catalog" ? (
          <>
            {recommended && (
              <div className="toko-recommendation">
                <span>
                  Pesanan <strong>{recommended.customerName}</strong>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    for (const request of recommended.items) {
                      const item = data.catalog.find((entry) => entry.id === request.itemId);
                      if (item)
                        changeQuantity(
                          item,
                          Math.max(
                            quantity(item.id),
                            request.qty - stock(item.id) - pending(item.id),
                          ),
                        );
                    }
                    changeView("cart");
                  }}
                >
                  Tambah kebutuhan
                </button>
              </div>
            )}
            <div className="toko-catalog-toolbar">
              <span>
                <b>{items.length}</b> Produk
              </span>
              {count > 0 && (
                <small className="toko-quantity-help">Ketuk angka untuk ubah jumlah</small>
              )}
            </div>
            {!items.length && <p className="toko-empty">Produk belum tersedia.</p>}
            <div className="toko-products">
              {items.map((item) => {
                const maximum = limit(item);
                return (
                  <article
                    className="toko-product"
                    key={item.id}
                    aria-disabled={maximum === 0 || undefined}
                  >
                    <div className="toko-product-image">
                      <ProductArt id={item.id} size={120} />
                    </div>
                    <div className="toko-product-info">
                      <h3>{item.name}</h3>
                      <span className="toko-unit">{item.uom ?? "pcs"}</span>
                      <strong className="toko-price">
                        {rupiah(kulakanPrice(item, data.agen))}
                      </strong>
                      {!!data.agen?.discountPercent && (
                        <small className="toko-unit">
                          Harga {w.levelName} −{data.agen.discountPercent}%
                        </small>
                      )}
                      <small className="toko-stock">
                        {item.level > w.level
                          ? `Terbuka Lv. ${item.level}`
                          : maximum === 0
                            ? "Rak penuh"
                            : `Stok ${stock(item.id)}/${w.maxStock}${pending(item.id) ? ` · Dikirim ${pending(item.id)}` : ""}`}
                      </small>
                    </div>
                    {maximum > 0 && counter(item, maximum)}
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h3 className="toko-cart-title">
              Keranjang <span>{count} barang</span>
            </h3>
            {count > 0 && <p className="toko-quantity-help">Ketuk angka untuk mengetik jumlah.</p>}
            {!count ? (
              <p className="toko-empty">Keranjang masih kosong. Tambahkan produk dari katalog.</p>
            ) : (
              <>
                <ul className="toko-cart-lines">
                  {lines.map((line) => (
                    <li key={line.itemId}>
                      <ProductArt id={line.itemId} size={56} />
                      <div className="toko-cart-item">
                        <strong>{line.item?.name ?? "Produk tidak tersedia"}</strong>
                        <small>
                          {rupiah(line.item ? kulakanPrice(line.item, data.agen) : 0)} /{" "}
                          {line.item?.uom ?? "pcs"}
                        </small>
                        {line.item && line.maximum > 0 ? (
                          counter(line.item, line.maximum)
                        ) : (
                          <button
                            type="button"
                            className="toko-remove"
                            disabled={busy}
                            onClick={() => addToBasket(line.itemId, -line.qty)}
                          >
                            Hapus
                          </button>
                        )}
                        {line.item && line.qty > line.maximum && (
                          <small className="toko-invalid">
                            {line.maximum > 0
                              ? `Maksimal ${line.maximum}. Kurangi jumlah.`
                              : "Produk ini sudah tidak bisa dipesan."}
                          </small>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="toko-destination">
                  <Truck aria-hidden />
                  <span>
                    Diantar ke <strong>{w.name}</strong>
                  </span>
                </p>
                <dl className="toko-totals">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{rupiah(subtotal)}</dd>
                  </div>
                  <div>
                    <dt>Ongkir</dt>
                    <dd>{rupiah(fee)}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{rupiah(total)}</dd>
                  </div>
                </dl>
                <p className="toko-simulation">Dibayar dengan Kas game.</p>
              </>
            )}
          </>
        )}
      </div>
      <footer className="toko-checkout">
        {view === "catalog" ? (
          <button
            type="button"
            className="toko-primary"
            disabled={!count || busy}
            onClick={() => changeView("cart")}
          >
            <ShoppingBasket aria-hidden />
            <span>{count ? `Keranjang · ${count}` : "Pilih produk"}</span>
            {count > 0 && <b>{rupiah(subtotal)}</b>}
          </button>
        ) : (
          <>
            {short > 0 && (
              <p className="toko-invalid" role="status">
                Kas kurang {rupiah(short)}.
              </p>
            )}
            <button
              type="button"
              className="toko-primary"
              disabled={!count || busy || invalid || short > 0}
              onClick={() => void order()}
            >
              <Truck aria-hidden />
              <span>{busy ? "Memesan…" : "Pesan & antar"}</span>
              <b>{rupiah(total)}</b>
            </button>
          </>
        )}
        {(view === "catalog" ? items.length > 0 : count > 0) && (
          <button
            type="button"
            className="toko-multiplier"
            aria-label={`Jumlah per ketuk: ${increment}. Ketuk untuk mengganti kelipatan.`}
            title="Ganti jumlah per ketuk (+)"
            disabled={busy}
            onClick={() => setIncrement((current) => (current % 5) + 1)}
          >
            ×{increment}
          </button>
        )}
      </footer>
    </div>,
  );
}
