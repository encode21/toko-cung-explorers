// F6 Agen & Grosir UI: Agen list (Komunitas), partai buy dialog (visitor shop), harga grosir (Harga tab).
import { useState } from "react";
import { visitGangShop, useGang } from "@/game/gang/store";
import { bulkRange, isBulk, kulakanPrice } from "@/game/warung/agen";
import { rupiah } from "@/game/warung/model";
import { ProductArt } from "@/game/warung/ProductArt";
import { buyFromWarung, deliveryFee, useWarung, warungCommand } from "@/game/warung/store";
import { useHud } from "@/state/hud-store";
import "./agen.css";

/** "Agen terdekat / langganan" in Warungku → Komunitas. */
export function AgenList() {
  const list = useWarung((s) => s.directory?.agen);
  const warungBusy = useWarung((s) => s.busy);
  const gangBusy = useGang((s) => s.busy);
  const busy = warungBusy || gangBusy;
  if (!list) return null;
  return (
    <>
      <h4>Agen terdekat / langganan</h4>
      {list.length ? (
        list.map((a) => (
          <div key={a.id} className="warung-row">
            <i className="warung-badge" aria-hidden>
              {a.level}
            </i>
            <div>
              <strong>{a.name}</strong>
              <span>
                {a.ownerName ?? "Pemain"} · {a.levelName} · {a.offers} barang partai
                {a.sameGang && <em className="agen-chip">Satu gang</em>}
                {a.langganan && <em className="agen-chip">Langganan</em>}
              </span>
            </div>
            <button
              type="button"
              className="warung-secondary"
              disabled={busy}
              onClick={() => {
                useHud.getState().setSheet(null);
                void visitGangShop(a.id);
              }}
            >
              Mampir
            </button>
          </div>
        ))
      ) : (
        <p className="warung-hint">
          Belum ada Agen yang menjual partai. Kulakan dulu di Toko Cung.
        </p>
      )}
    </>
  );
}

/** Partai offers inside a visited Agen/Grosir, with a small buy dialog. */
export function AgenOffers() {
  const inside = useWarung((s) => s.inside);
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const [pick, setPick] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const agen = data?.agen;
  const mine = data?.warung;
  if (!agen || !inside || inside.level < agen.minLevel || inside.id === mine?.id) return null;
  const offers = inside.stock.filter((s) => s.bulkPrice && s.qty > 0);
  if (!offers.length) return null;
  const left = Math.max(0, agen.dailyCap - agen.boughtToday);
  const chosen = offers.find((s) => s.itemId === pick);
  const item = chosen && data.catalog.find((c) => c.id === chosen.itemId);
  return (
    <section className="agen-offers" aria-label={`Harga grosir di ${inside.name}`}>
      <header>
        <strong>Harga grosir {inside.levelName}</strong>
        <small>
          {agen.text["supplied_by"]} · sisa jatah hari ini {left}
        </small>
      </header>
      <div className="warung-visitor-grid">
        {offers.map((s) => {
          const it = data.catalog.find((c) => c.id === s.itemId);
          return (
            <article key={s.itemId} className="warung-product">
              <ProductArt id={s.itemId} size={36} />
              <strong>
                {it?.name ?? s.itemId} {it?.uom && <em className="agen-chip">{it.uom}</em>}
              </strong>
              <span>Gudang {s.qty}</span>
              <button
                type="button"
                className="warung-cta"
                disabled={busy || !mine || !left}
                onClick={() => {
                  setPick(s.itemId);
                  setQty(1);
                }}
              >
                {rupiah(s.bulkPrice!)}
              </button>
            </article>
          );
        })}
      </div>
      {chosen && item && mine && (
        <div
          className="agen-dialog"
          role="dialog"
          aria-label={`Beli partai ${item.name}`}
          ref={(el) => el?.scrollIntoView({ block: "nearest" })}
        >
          <strong>Beli partai {item.name}</strong>
          <div className="warung-price-tag">
            <button
              type="button"
              aria-label="Kurangi"
              disabled={qty <= 1}
              onClick={() => setQty(qty - 1)}
            >
              −
            </button>
            <output aria-live="polite">
              {qty} {item.uom}
            </output>
            <button
              type="button"
              aria-label="Tambah"
              disabled={qty >= Math.min(agen.maxQtyPerBuy, chosen.qty, left)}
              onClick={() => setQty(qty + 1)}
            >
              +
            </button>
          </div>
          <p>
            Total <b>{rupiah(chosen.bulkPrice! * qty)}</b> · di Toko Cung + truk{" "}
            {rupiah(item.wholesale * qty + deliveryFee(item.wholesale * qty))} · hemat{" "}
            <b>
              {rupiah(
                item.wholesale * qty + deliveryFee(item.wholesale * qty) - chosen.bulkPrice! * qty,
              )}
            </b>
          </p>
          <div className="warung-actions">
            <button type="button" className="warung-secondary" onClick={() => setPick(null)}>
              Batal
            </button>
            <button
              type="button"
              className="warung-cta"
              disabled={busy || mine.cash < chosen.bulkPrice! * qty}
              onClick={() =>
                void buyFromWarung(chosen.itemId, qty, chosen.bulkPrice!, true).then(() =>
                  setPick(null),
                )
              }
            >
              Beli {qty} {item.uom}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Harga grosir per dus/bal for the owner's own Agen/Grosir (Harga tab). */
export function AgenPricing() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const agen = data?.agen;
  const w = data?.warung;
  if (!agen || !w || w.level < agen.minLevel) return null;
  const rows = w.stock
    .map((s) => ({ s, item: data.catalog.find((c) => c.id === s.itemId) }))
    .filter((r) => isBulk(r.item, agen));
  const set = (itemId: string, bulkPrice: number | null) =>
    void warungCommand("agen_price", { itemId, bulkPrice });
  return (
    <div className="warung-list agen-pricing">
      <h4>Harga grosir ke warung pemain lain</h4>
      <p className="warung-hint">
        Maksimal harga Toko Cung, minimal {agen.floorPercent}%. Modal kulakanmu sudah diskon{" "}
        {agen.discountPercent}%. Penjualan partai tidak dihitung omzet papan juara.
      </p>
      {!rows.length && (
        <p className="warung-hint">Kulakan barang dus/bal di Toko Cung untuk mulai jadi pemasok.</p>
      )}
      {rows.map(({ s, item }) => {
        if (!item) return null;
        const [min, max] = bulkRange(item, agen);
        const step = 500;
        return (
          <article key={s.itemId} className="warung-price-row">
            <ProductArt id={item.id} size={40} />
            <div className="warung-price-row-info">
              <strong>{item.name}</strong>
              <small>
                Modal {rupiah(kulakanPrice(item, agen))} · Toko Cung {rupiah(max)} · Gudang {s.qty}
                {s.bulkPrice
                  ? ` · untung ${rupiah(s.bulkPrice - kulakanPrice(item, agen))}/${item.uom}`
                  : ""}
              </small>
            </div>
            <div className="warung-price-row-ctrl">
              {s.bulkPrice ? (
                <>
                  <div className="warung-price-tag">
                    <button
                      type="button"
                      aria-label={`Turunkan harga grosir ${item.name}`}
                      disabled={busy || s.bulkPrice <= min}
                      onClick={() => set(item.id, Math.max(min, s.bulkPrice! - step))}
                    >
                      −
                    </button>
                    <output aria-live="polite">{rupiah(s.bulkPrice)}</output>
                    <button
                      type="button"
                      aria-label={`Naikkan harga grosir ${item.name}`}
                      disabled={busy || s.bulkPrice >= max}
                      onClick={() => set(item.id, Math.min(max, s.bulkPrice! + step))}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="warung-reset-link"
                    disabled={busy}
                    onClick={() => set(item.id, null)}
                  >
                    Berhenti jual partai
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="warung-secondary"
                  disabled={busy}
                  onClick={() => set(item.id, max)}
                >
                  Jual partai
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
