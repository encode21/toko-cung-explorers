import { useEffect, useMemo, useRef, useState } from "react";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import {
  answerEvent,
  atTokoCung,
  buyFromWarung,
  ensureWarungData,
  openWarungPanel,
  customerArrived,
  customerTick,
  enterWarung,
  exitWarung,
  isOwnWarung,
  leaveCustomer,
  resetWarung,
  serveOrder,
  startOrder,
  pollWarung,
  useWarung,
  workOrder,
} from "@/game/warung/store";
import {
  rupiah,
  stockAlerts,
  type OrderLine,
  type WarungEvent,
  type WarungItem,
  type WarungStock,
} from "@/game/warung/model";
import { ProductArt } from "@/game/warung/ProductArt";
import { WARUNG_LOTS, lotFront } from "@/game/warung/lots";
import "./warung-panel.css";

const ORDER_SECONDS = 12;
const POLL_MS = 20_000;

const useCatalog = () => {
  const catalog = useWarung((s) => s.data?.catalog);
  return useMemo(() => new Map((catalog ?? []).map((i) => [i.id, i])), [catalog]);
};
const itemList = (lines: OrderLine[], catalog: Map<string, WarungItem>) =>
  lines.map((l) => `${catalog.get(l.itemId)?.name ?? l.itemId} ×${l.qty}`).join(", ");

/** Order lines as product chips (used by walk-in orders and story visitors). */
function OrderChips({ lines, picked }: { lines: OrderLine[]; picked?: Record<string, number> }) {
  const catalog = useCatalog();
  return (
    <ul className="warung-order-chips">
      {lines.map((l) => {
        const got = picked?.[l.itemId] ?? 0;
        return (
          <li key={l.itemId} data-done={(picked && got >= l.qty) || undefined}>
            <ProductArt id={l.itemId} size={34} />
            <span>
              {catalog.get(l.itemId)?.name ?? l.itemId}
              <b>
                ×{l.qty}
                {picked ? ` (${got}/${l.qty})` : ""}
              </b>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Walk-in mini-game: pick the requested items from the rack before patience runs out.
 * `onServe` resolves to the toast text (owner sale or part-time wage), or null on failure.
 */
function ServeGame({
  stock,
  onServe,
}: {
  stock: WarungStock[];
  onServe: (order: OrderLine[]) => Promise<string | null>;
}) {
  const order = useWarung((s) => s.order);
  const customer = useWarung((s) => s.customer);
  const busy = useWarung((s) => s.busy);
  const catalog = useCatalog();
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [left, setLeft] = useState(ORDER_SECONDS);
  const done = useRef(false);
  // Requested items plus decoys from the rack, shuffled once per customer.
  const choices = useMemo(() => {
    if (!order) return [];
    const ids = new Set(order.map((l) => l.itemId));
    for (const s of stock) if (ids.size < 6 && s.qty > 0) ids.add(s.itemId);
    return [...ids].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  useEffect(() => {
    if (!order) return;
    const t = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [order]);
  useEffect(() => {
    if (order && left <= 0 && !done.current) {
      done.current = true;
      leaveCustomer();
      useGame.getState().setToast(`${customer?.name ?? "Pembeli"} kelamaan menunggu dan pergi.`);
    }
  }, [left, order, customer?.name]);

  if (!order) return null;
  const tap = (id: string) => {
    if (done.current || busy) return;
    const want = order.find((l) => l.itemId === id);
    if (!want || (picked[id] ?? 0) >= want.qty) {
      done.current = true;
      leaveCustomer();
      useGame.getState().setToast("Salah ambil barang, pembeli batal beli.");
      return;
    }
    const next = { ...picked, [id]: (picked[id] ?? 0) + 1 };
    setPicked(next);
    if (order.every((l) => (next[l.itemId] ?? 0) >= l.qty)) {
      done.current = true;
      void onServe(order).then((text) => {
        leaveCustomer();
        if (text) useGame.getState().setToast(text);
      });
    }
  };
  const total = order.reduce((a, l) => a + l.qty, 0);
  const got = Object.values(picked).reduce((a, b) => a + b, 0);
  return (
    <section className="warung-serve" aria-label="Layani pembeli">
      <header>
        <strong>{customer?.name ?? "Pembeli"}: “Mau beli ini ya…”</strong>
        <span
          className="warung-timer"
          data-urgent={left <= 4 || undefined}
          aria-label={`Sisa waktu ${left} detik`}
        >
          {left}s
        </span>
      </header>
      <OrderChips lines={order} picked={picked} />
      <div className="warung-kresek" aria-label={`Kresek ${got} dari ${total} barang`}>
        <span style={{ width: `${(got / total) * 100}%` }} />
      </div>
      <div className="warung-choices" role="group" aria-label="Ambil dari rak">
        {choices.map((id) => (
          <button key={id} type="button" disabled={busy} onClick={() => tap(id)}>
            <ProductArt id={id} size={44} />
            <span>{catalog.get(id)?.name ?? id}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const STORY: Record<
  WarungEvent["kind"],
  { line: (e: WarungEvent, items: string) => string; yes: string; no: string; note?: string }
> = {
  ngutang: {
    line: (_e, items) => `“Ngutang dulu ya… ${items}. Nanti sore saya bayar, janji deh!”`,
    yes: "Kasih utang",
    no: "Maaf, belum bisa",
    note: "Barang keluar sekarang, uangnya nyusul (kalau dia ingat).",
  },
  iuran: {
    line: (e) => `“Permisi, iuran kebersihan & keamanan RT bulan ini ${rupiah(e.amount)} ya.”`,
    yes: "Bayar iuran",
    no: "Nanti saja",
    note: "Kalau ditunda, tagihan berikutnya lebih besar.",
  },
  ojol: {
    line: (_e, items) => `“Ada orderan antar nih! ${items}. Dibayar harga pasar + ongkir 15%.”`,
    yes: "Siapkan pesanan",
    no: "Tolak orderan",
  },
};

function StoryCard({ event }: { event: WarungEvent }) {
  const busy = useWarung((s) => s.busy);
  const catalog = useCatalog();
  const story = STORY[event.kind];
  return (
    <section className="warung-story" data-kind={event.kind} aria-label={`Tamu: ${event.npc}`}>
      <header>
        <span className="warung-story-badge">
          {event.kind === "ngutang" ? "Pelanggan" : event.kind === "iuran" ? "Petugas RT" : "Ojol"}
        </span>
        <strong>{event.npc}</strong>
      </header>
      <p>{story.line(event, itemList(event.items, catalog))}</p>
      {event.items.length > 0 && <OrderChips lines={event.items} />}
      {story.note && <small>{story.note}</small>}
      <div className="warung-actions">
        <button
          type="button"
          className="warung-cta"
          disabled={busy}
          onClick={() => void answerEvent(event.id, "accept")}
        >
          {story.yes}
        </button>
        <button
          type="button"
          className="warung-secondary"
          disabled={busy}
          onClick={() => void answerEvent(event.id, "decline")}
        >
          {story.no}
        </button>
      </div>
    </section>
  );
}

/** Customer at the counter: start the order, or answer a story visitor. */
function CounterCard({ stock, own }: { stock: WarungStock[]; own: boolean }) {
  const customer = useWarung((s) => s.customer);
  const order = useWarung((s) => s.order);
  const event = useWarung((s) => s.data?.event);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);
  if (!customer || order || customer.leavingAt !== null) return null;
  if (!customerArrived(customer))
    return <p className="warung-arriving">{customer.name} sedang berjalan ke etalase…</p>;
  if (own && customer.eventId !== undefined && event?.id === customer.eventId)
    return <StoryCard event={event} />;
  return (
    <section className="warung-arrived" aria-label="Pembeli menunggu">
      <span>
        <strong>{customer.name}</strong> menunggu di etalase.
      </span>
      <button type="button" className="warung-cta" onClick={() => startOrder(stock)}>
        Layani
      </button>
    </section>
  );
}

const ownerServe = async (order: OrderLine[]) => {
  const before = useWarung.getState().data?.warung?.cash ?? 0;
  const s = await serveOrder(order);
  return s?.warung ? `Terima kasih! Kas +${rupiah(s.warung.cash - before)}` : null;
};
const workerServe = async (order: OrderLine[]) => {
  const wage = await workOrder(order);
  if (wage === null) return null;
  return useWarung.getState().data?.warung
    ? `Upah part-time +${rupiah(wage)} masuk Kas warungmu.`
    : `Upah part-time +${rupiah(wage)} ditabung untuk modal warungmu.`;
};

function VisitorShop() {
  const inside = useWarung((s) => s.inside);
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const catalog = useCatalog();
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
      <div className="warung-product-grid">
        {items.map((s) => (
          <article key={s.itemId} className="warung-product">
            <ProductArt id={s.itemId} size={52} />
            <strong>{catalog.get(s.itemId)?.name ?? s.itemId}</strong>
            <span>Sisa {s.qty}</span>
            <button
              type="button"
              className="warung-cta"
              disabled={busy || !data?.warung || data.warung.cash < s.price}
              onClick={() => void buyFromWarung(s.itemId, 1, s.price)}
            >
              Beli {rupiah(s.price)}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Prompt to enter a warung when standing in front of its city lot. */
function LotPrompt() {
  const lots = useWarung((s) => s.lots);
  const busy = useWarung((s) => s.busy);
  const pos = useGame((g) => g.playerPos);
  const sheet = useHud((h) => h.sheet);
  if (sheet) return null;
  const near = lots.find((card) => {
    const lot = WARUNG_LOTS[card.lot];
    if (!lot) return false;
    const [x, z] = lotFront(lot);
    return Math.hypot(pos[0] - x, pos[2] - z) < 3.5;
  });
  if (!near) return null;
  return (
    <div className="warung-hud pointer-events-auto" data-warung-lot-prompt>
      <div className="warung-hud-bar">
        <div>
          <strong>{near.name}</strong>
          <span>
            {near.ownerName ?? "Pemain"} · {near.levelName}
            {near.hiring ? " · lowongan part-time" : ""}
          </span>
        </div>
        <button
          type="button"
          className="warung-cta"
          disabled={busy}
          onClick={() => void enterWarung(near.id)}
        >
          Masuk warung
        </button>
      </div>
    </div>
  );
}

/** At Toko Cung: open Kulakan directly and clear the "Tunjukkan jalan" waypoint on arrival. */
function KulakanPrompt() {
  const hasWarung = useWarung((s) => !!s.data?.warung);
  const sheet = useHud((h) => h.sheet);
  const pos = useGame((g) => g.playerPos);
  const here = atTokoCung();
  useEffect(() => {
    void ensureWarungData();
  }, []);
  useEffect(() => {
    if (here && useGame.getState().waypoint === "map-store") useGame.getState().setWaypoint(null);
  }, [here, pos]);
  if (!here || !hasWarung || sheet) return null;
  return (
    <div className="warung-hud pointer-events-auto" data-warung-kulakan-prompt>
      <div className="warung-hud-bar">
        <div>
          <strong>Kulakan grosir</strong>
          <span>Belanja stok warungmu di Toko Cung</span>
        </div>
        <button type="button" className="warung-cta" onClick={() => openWarungPanel("kulakan")}>
          Kulakan
        </button>
      </div>
    </div>
  );
}

/** In-room controls; the room itself is WarungScene. */
export function WarungHud() {
  const room = useChannels((s) => s.lease?.channel);
  const inside = useWarung((s) => s.inside);
  const error = useWarung((s) => s.error);
  const cash = useWarung((s) => s.data?.warung?.cash);
  const myStock = useWarung((s) => s.data?.warung?.stock);
  const maxStock = useWarung((s) => s.data?.warung?.maxStock ?? 20);
  const [mode, setMode] = useState<"none" | "shop" | "work">("none");
  const order = useWarung((s) => s.order);
  const customerKey = useWarung((s) => s.customer?.arrivedAt ?? 0);
  const own = !!inside && isOwnWarung();
  const onShift = own || mode === "work";
  const shiftStock = useMemo(
    () => (own ? (myStock ?? []) : (inside?.stock ?? [])),
    [own, myStock, inside?.stock],
  );

  useEffect(() => {
    resetWarung();
    return resetWarung;
  }, [room]);
  useEffect(() => setMode("none"), [inside?.id]);

  // Customer queue + story visitors while on shift.
  useEffect(() => {
    if (!onShift) return;
    const t = setInterval(() => customerTick(shiftStock, own), 500);
    return () => clearInterval(t);
  }, [onShift, own, shiftStock]);
  // Owner: poll so story visitors and debt repayments show up while tending the warung.
  useEffect(() => {
    if (!own) return;
    void pollWarung();
    const t = setInterval(() => void pollWarung(), POLL_MS);
    return () => clearInterval(t);
  }, [own]);
  // Stock warnings when the owner walks in.
  useEffect(() => {
    if (!own || !myStock) return;
    const { empty, low } = stockAlerts(myStock, maxStock);
    if (empty.length || low.length)
      useGame
        .getState()
        .setToast(
          `${empty.length ? `${empty.length} barang habis` : ""}${empty.length && low.length ? " · " : ""}${
            low.length ? `${low.length} menipis` : ""
          }. Kulakan di Toko Cung ya.`,
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [own, inside?.id]);

  if (!inside)
    return (
      <>
        <LotPrompt />
        <KulakanPrompt />
      </>
    );
  const alerts = own && myStock ? stockAlerts(myStock, maxStock) : null;
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
        {alerts && (alerts.empty.length > 0 || alerts.low.length > 0) && (
          <button
            type="button"
            className="warung-stock-alert"
            data-empty={alerts.empty.length > 0 || undefined}
            onClick={() => useHud.getState().setSheet("warung")}
          >
            {alerts.empty.length > 0
              ? `${alerts.empty.length} habis`
              : `${alerts.low.length} menipis`}
          </button>
        )}
        {!own && inside.hiring && (
          <button
            type="button"
            className={mode === "work" ? "warung-cta" : "warung-secondary"}
            aria-pressed={mode === "work"}
            disabled={!inside.stock.some((x) => x.qty > 0)}
            onClick={() => {
              leaveCustomer();
              setMode((m) => (m === "work" ? "none" : "work"));
            }}
          >
            {mode === "work" ? "Selesai shift" : "Kerja part-time"}
          </button>
        )}
        {!own && (
          <button
            type="button"
            className="warung-secondary"
            aria-pressed={mode === "shop"}
            onClick={() => {
              leaveCustomer();
              setMode((m) => (m === "shop" ? "none" : "shop"));
            }}
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
      {onShift && (
        <>
          <CounterCard stock={shiftStock} own={own} />
          {/* Fresh instance per order: timer/picks never carry over from a timed-out customer. */}
          {order && (
            <ServeGame
              key={customerKey}
              stock={shiftStock}
              onServe={own ? ownerServe : workerServe}
            />
          )}
          {own && !shiftStock.some((x) => x.qty > 0) && (
            <p className="warung-hint warung-hint-card">Rak kosong · kulakan di Toko Cung</p>
          )}
        </>
      )}
      {mode === "shop" && <VisitorShop />}
    </div>
  );
}
