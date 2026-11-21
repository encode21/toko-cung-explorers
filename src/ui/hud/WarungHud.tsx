import { useEffect, useMemo, useRef, useState } from "react";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import {
  buyFromWarung,
  exitWarung,
  isOwnWarung,
  resetWarung,
  serveOrder,
  useWarung,
} from "@/game/warung/store";
import { makeOrder, rupiah } from "@/game/warung/model";
import "./warung-panel.css";

const ORDER_SECONDS = 12;

/** Walk-in customer mini-game: tap the requested items before patience runs out. */
function ServeGame() {
  const order = useWarung((s) => s.order);
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [left, setLeft] = useState(ORDER_SECONDS);
  const done = useRef(false);
  const stock = data?.warung?.stock ?? [];
  const name = (id: string) => data?.catalog.find((i) => i.id === id)?.name ?? id;
  // Requested items plus decoys from the rack, in a stable shuffled order per customer.
  const choices = useMemo(() => {
    if (!order) return [];
    const ids = new Set(order.map((l) => l.itemId));
    for (const s of stock) if (ids.size < 6 && s.qty > 0) ids.add(s.itemId);
    return [...ids].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  useEffect(() => {
    setPicked({});
    setLeft(ORDER_SECONDS);
    done.current = false;
  }, [order]);
  useEffect(() => {
    if (!order) return;
    const t = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [order]);
  useEffect(() => {
    if (order && left <= 0 && !done.current) {
      done.current = true;
      useWarung.setState({ order: null });
      useGame.getState().setToast("Pembeli kelamaan menunggu dan pergi.");
    }
  }, [left, order]);

  if (!order) return null;
  const tap = (id: string) => {
    if (done.current || busy) return;
    const want = order.find((l) => l.itemId === id);
    if (!want || (picked[id] ?? 0) >= want.qty) {
      done.current = true;
      useWarung.setState({ order: null });
      useGame.getState().setToast("Salah ambil barang, pembeli batal beli.");
      return;
    }
    const next = { ...picked, [id]: (picked[id] ?? 0) + 1 };
    setPicked(next);
    if (order.every((l) => (next[l.itemId] ?? 0) >= l.qty)) {
      done.current = true;
      const before = useWarung.getState().data?.warung?.cash ?? 0;
      void serveOrder(order).then((s) => {
        useWarung.setState({ order: null });
        if (s?.warung)
          useGame.getState().setToast(`Terima kasih! Kas +${rupiah(s.warung.cash - before)}`);
      });
    }
  };
  return (
    <section className="warung-serve" aria-label="Layani pembeli">
      <header>
        <strong>Pembeli: “Mau beli…”</strong>
        <span aria-label={`Sisa waktu ${left} detik`}>{left}s</span>
      </header>
      <ul>
        {order.map((l) => (
          <li key={l.itemId} data-done={(picked[l.itemId] ?? 0) >= l.qty || undefined}>
            {name(l.itemId)} ×{l.qty}{" "}
            <small>
              ({picked[l.itemId] ?? 0}/{l.qty})
            </small>
          </li>
        ))}
      </ul>
      <div className="warung-choices">
        {choices.map((id) => (
          <button key={id} type="button" disabled={busy} onClick={() => tap(id)}>
            <i style={{ background: data?.catalog.find((i) => i.id === id)?.color }} aria-hidden />
            {name(id)}
          </button>
        ))}
      </div>
    </section>
  );
}

function VisitorShop() {
  const inside = useWarung((s) => s.inside);
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  if (!inside) return null;
  const items = inside.stock.filter((s) => s.qty > 0);
  return (
    <section className="warung-serve" aria-label={`Belanja di ${inside.name}`}>
      <header>
        <strong>Belanja stok di {inside.name}</strong>
        <span>{data?.warung ? `Kas ${rupiah(data.warung.cash)}` : ""}</span>
      </header>
      {!data?.warung && (
        <p className="warung-hint">
          Buka warungmu sendiri dulu (HP → Warungku) untuk bisa belanja stok.
        </p>
      )}
      {items.length === 0 && <p className="warung-hint">Rak warung ini sedang kosong.</p>}
      <div className="warung-list">
        {items.map((s) => (
          <div key={s.itemId} className="warung-row">
            <i
              style={{ background: data?.catalog.find((i) => i.id === s.itemId)?.color }}
              aria-hidden
            />
            <div>
              <strong>{data?.catalog.find((i) => i.id === s.itemId)?.name ?? s.itemId}</strong>
              <span>Sisa {s.qty}</span>
            </div>
            <button
              type="button"
              className="warung-secondary"
              disabled={busy || !data?.warung || data.warung.cash < s.price}
              onClick={() => void buyFromWarung(s.itemId, 1)}
            >
              Beli {rupiah(s.price)}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/** In-room controls; the room itself is WarungScene. */
export function WarungHud() {
  const room = useChannels((s) => s.lease?.channel);
  const inside = useWarung((s) => s.inside);
  const order = useWarung((s) => s.order);
  const busy = useWarung((s) => s.busy);
  const error = useWarung((s) => s.error);
  const cash = useWarung((s) => s.data?.warung?.cash);
  const stocked = useWarung((s) => (s.data?.warung?.stock ?? []).some((x) => x.qty > 0));
  const [shopping, setShopping] = useState(false);

  useEffect(() => {
    resetWarung();
    return resetWarung;
  }, [room]);
  useEffect(() => setShopping(false), [inside?.id]);

  if (!inside) return null;
  const own = isOwnWarung();
  return (
    <div className="warung-hud pointer-events-auto" data-warung-hud>
      <div className="warung-hud-bar">
        <div>
          <strong>{inside.name}</strong>
          <span>
            {inside.levelName}
            {own && cash !== undefined
              ? ` · Kas ${rupiah(cash)}`
              : inside.ownerName
                ? ` · milik ${inside.ownerName}`
                : ""}
          </span>
        </div>
        {own ? (
          <button
            type="button"
            className="warung-cta"
            disabled={busy || !!order || !stocked}
            title={stocked ? undefined : "Rak kosong, kulakan dulu"}
            onClick={() => {
              const stock = useWarung.getState().data?.warung?.stock ?? [];
              useWarung.setState({ order: makeOrder(stock) });
            }}
          >
            Layani pembeli
          </button>
        ) : (
          <button
            type="button"
            className="warung-cta"
            onClick={() => setShopping((v) => !v)}
            aria-pressed={shopping}
          >
            Belanja
          </button>
        )}
        <button type="button" className="warung-secondary" onClick={exitWarung}>
          Keluar
        </button>
      </div>
      {error && (
        <p className="warung-error" role="alert">
          {error}
        </p>
      )}
      {own ? <ServeGame /> : shopping && <VisitorShop />}
    </div>
  );
}
