import { useEffect, useMemo, useRef, useState } from "react";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import {
  ANGRY_WRONG_ITEM,
  answerEvent,
  askCustomerToWait,
  buyFromWarung,
  collectDebt,
  ensureWarungData,
  exitWarungToTokoCung,
  openWarungPanel,
  customerArrived,
  customerTick,
  enterWarung,
  exitWarung,
  isOwnWarung,
  leaveCustomer,
  pickRandom,
  recordServeSpeed,
  resetWarung,
  serveOrder,
  setWarungLocked,
  startOrder,
  thiefTick,
  pollWarung,
  useWarung,
  workOrder,
  type WarungCustomer,
} from "@/game/warung/store";
import {
  CUSTOMER_WALK_MS,
  debtorSpot,
  patienceEmoji,
  rupiah,
  stockAlerts,
  type OrderLine,
  type WarungDebt,
  type WarungEvent,
  type WarungItem,
  type WarungStock,
} from "@/game/warung/model";
import { ProductArt } from "@/game/warung/ProductArt";
import { WARUNG_LOTS, lotFront } from "@/game/warung/lots";
import "./warung-panel.css";

const ORDER_SECONDS = 12;
const FAST_LEFT_THRESHOLD = 7; // Finished in <= 5s => Cekatan!
const SLOW_LEFT_THRESHOLD = 3; // <= 3s left => Agak lama
const POLL_MS = 20_000;
const LOT_PROMPT_RADIUS = 3.5;
const DEBTOR_PROMPT_RADIUS = 3.8;

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
            <ProductArt id={l.itemId} size={26} />
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
 * Rewards fast service ("Cekatan!") and flags slow service ("Agak lama").
 */
function ServeGame({
  stock,
  onServe,
}: {
  stock: WarungStock[];
  onServe: (order: OrderLine[], fast: boolean) => Promise<string | null>;
}) {
  const order = useWarung((s) => s.order);
  const customer = useWarung((s) => s.customers.find((c) => c.leavingAt === null) ?? null);
  const busy = useWarung((s) => s.busy);
  const level = useWarung((s) => s.inside?.level ?? s.data?.warung?.level ?? 1);
  const catalogList = useWarung((s) => s.data?.catalog);
  const catalog = useCatalog();
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [left, setLeft] = useState(ORDER_SECONDS);
  const done = useRef(false);

  const stockMap = useMemo(() => new Map(stock.map((s) => [s.itemId, s.qty])), [stock]);

  // Show ALL unlocked items (including out-of-stock ones, disabled) so picking stays challenging!
  const choices = useMemo(() => {
    if (!order) return [];
    const ids = new Set(order.map((l) => l.itemId));
    for (const item of catalogList ?? []) {
      if (item.level <= level) ids.add(item.id);
    }
    for (const s of stock) ids.add(s.itemId);
    return [...ids].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  useEffect(() => {
    if (!order) return;
    const t = setInterval(() => {
      if (!done.current) setLeft((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [order]);

  useEffect(() => {
    if (order && left <= 0 && !done.current) {
      done.current = true;
      leaveCustomer("🤬");
      useWarung.setState({ serveStreak: 0, lastServeFeedback: null });
      useGame
        .getState()
        .setToast(
          `🤬 ${customer?.name ?? "Pembeli"}: “Anj*r kelamaan bungkusnya! B*go amat, batal beli!”`,
        );
    }
  }, [left, order, customer?.name]);

  if (!order) return null;
  const ratio = Math.max(0, left / ORDER_SECONDS);
  const emoji = patienceEmoji(ratio);

  const tap = (id: string) => {
    if (done.current || busy) return;
    const want = order.find((l) => l.itemId === id);
    if (!want || (picked[id] ?? 0) >= want.qty) {
      done.current = true;
      leaveCustomer("🤬");
      useWarung.setState({ serveStreak: 0, lastServeFeedback: null });
      useGame
        .getState()
        .setToast(`🤬 ${customer?.name ?? "Pembeli"}: “${pickRandom(ANGRY_WRONG_ITEM)}”`);
      return;
    }
    const next = { ...picked, [id]: (picked[id] ?? 0) + 1 };
    setPicked(next);
    if (order.every((l) => (next[l.itemId] ?? 0) >= l.qty)) {
      done.current = true;
      const speed: "fast" | "normal" | "slow" =
        left >= FAST_LEFT_THRESHOLD ? "fast" : left <= SLOW_LEFT_THRESHOLD ? "slow" : "normal";
      void onServe(order, speed === "fast").then((text) => {
        leaveCustomer(speed === "fast" ? "🤩" : speed === "slow" ? "😅" : "😊");
        recordServeSpeed(speed, speed === "fast" ? "+10% tip cekatan" : "");
        if (text) useGame.getState().setToast(text);
      });
    }
  };

  const total = order.reduce((a, l) => a + l.qty, 0);
  const got = Object.values(picked).reduce((a, b) => a + b, 0);
  return (
    <section className="warung-serve" aria-label="Layani pembeli">
      <div className="warung-bubble">
        <header>
          <strong>
            {emoji} {customer?.name ?? "Pembeli"}: “Beli ini ya…”
          </strong>
          <span
            className="warung-timer"
            data-urgent={left <= 4 || undefined}
            aria-label={`Sisa waktu ${left} detik`}
          >
            {left}s
          </span>
        </header>
        <div className="warung-patience-bar" data-urgent={left <= 4 || undefined}>
          <span style={{ width: `${ratio * 100}%` }} />
        </div>
        <OrderChips lines={order} picked={picked} />
      </div>
      <div className="warung-kresek-row">
        <span className="warung-kresek-label">
          Kresek {got}/{total}
        </span>
        <div className="warung-kresek" aria-label={`Kresek ${got} dari ${total} barang`}>
          <span style={{ width: `${(got / total) * 100}%` }} />
        </div>
      </div>
      <div className="warung-choices" role="group" aria-label="Ambil dari rak">
        {choices.map((id) => {
          const oos = (stockMap.get(id) ?? 0) <= 0;
          return (
            <button
              key={id}
              type="button"
              disabled={busy || oos}
              data-oos={oos || undefined}
              onClick={() => tap(id)}
            >
              <ProductArt id={id} size={32} />
              <span>{catalog.get(id)?.name ?? id}</span>
              {oos && <em className="warung-oos-tag">Habis</em>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

const STORY: Record<
  WarungEvent["kind"],
  {
    badge: string;
    line: (e: WarungEvent, items: string) => string;
    yes: string;
    no: string;
    note?: string;
  }
> = {
  ngutang: {
    badge: "Ngutang",
    line: (_e, items) => `“Ngutang dulu ya… ${items}. Catat aja di Buku Utang, nanti saya bayar!”`,
    yes: "Kasih utang",
    no: "Belum bisa",
    note: "Dicatat di tab Catatan → bisa ditagih via chat atau ketemu di jalan.",
  },
  iuran: {
    badge: "Pak RT",
    line: (e) => `“Permisi, iuran kebersihan & keamanan RT bulan ini ${rupiah(e.amount)} ya.”`,
    yes: "Bayar iuran",
    no: "Nanti saja",
    note: "Tercatat di Catatan Pengeluaran. Kalau ditunda, tagihan berikutnya lebih besar.",
  },
  ojol: {
    badge: "Ojol",
    line: (_e, items) => `“Ada orderan antar nih! ${items}. Dibayar harga pasar + ongkir 15%.”`,
    yes: "Siapkan",
    no: "Tolak",
  },
  palak: {
    badge: "Preman",
    line: (e) =>
      `“Woi bos, bagi uang keamanan ${rupiah(e.amount)} dong! Biar warungmu aman tentram…”`,
    yes: "Kasih uang",
    no: "Usir!",
    note: "Tercatat di Catatan Pengeluaran. Mengusir bisa bikin pembeli yang antre kaget.",
  },
  sultan: {
    badge: "💎 Sultan",
    line: (e) =>
      `“Wah warungmu kelihatan berkah nih! Ini ada rezeki ${rupiah(e.amount)} buat tambahan modal, diterima ya!”`,
    yes: "Terima rezeki!",
    no: "Nggak usah",
    note: "Rezeki cuma-cuma dari Sultan yang mampir naik Alphard. Langsung masuk Kas warung!",
  },
};

function StoryCard({ event }: { event: WarungEvent }) {
  const busy = useWarung((s) => s.busy);
  const catalog = useCatalog();
  const story = STORY[event.kind];
  return (
    <section className="warung-story" data-kind={event.kind} aria-label={`Tamu: ${event.npc}`}>
      <header>
        <span className="warung-story-badge">{story.badge}</span>
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

/** Customer arrival watcher for the front active customer. */
function useFrontCustomer() {
  const front = useWarung((s) => s.customers.find((c) => c.leavingAt === null) ?? null);
  const queueCount = useWarung((s) => s.customers.filter((c) => c.leavingAt === null).length);
  const [arrived, setArrived] = useState(() => customerArrived(front));

  useEffect(() => {
    if (!front || front.leavingAt !== null) {
      setArrived(false);
      return;
    }
    const remaining = CUSTOMER_WALK_MS - (Date.now() - front.arrivedAt);
    if (remaining <= 0) {
      setArrived(true);
      return;
    }
    setArrived(false);
    const t = setTimeout(() => setArrived(true), remaining + 20);
    return () => clearTimeout(t);
  }, [front]);

  return { front, queueCount, arrived };
}

/** Live patience countdown while waiting at the counter before tapping Layani. */
function WaitMeter({ customer }: { customer: WarungCustomer }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [customer.id]);
  const waited = Math.max(0, now - customer.arrivedAt - CUSTOMER_WALK_MS);
  const leftMs = Math.max(0, customer.waitMs - waited);
  const ratio = Math.max(0, Math.min(1, leftMs / customer.waitMs));
  const secs = Math.ceil(leftMs / 1000);
  return (
    <div className="warung-wait-wrap">
      <div className="warung-patience-bar" data-urgent={ratio <= 0.28 || undefined}>
        <span style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="warung-wait-meta">
        {patienceEmoji(ratio)} {secs}s
      </span>
    </div>
  );
}

/** Customer at the counter: start the order, answer a story visitor, or show disappointed empty-stock visitor. */
function CounterCard({
  front,
  queueCount,
  stock,
  own,
  arrived,
}: {
  front: WarungCustomer | null;
  queueCount: number;
  stock: WarungStock[];
  own: boolean;
  arrived: boolean;
}) {
  const order = useWarung((s) => s.order);
  const event = useWarung((s) => s.data?.event);
  if (!front || order || front.leavingAt !== null || !arrived) return null;
  if (own && front.eventId !== undefined && event?.id === front.eventId)
    return <StoryCard event={event} />;
  if (front.emptyStockAsk && own) {
    if (front.emptyReply === "wait") {
      return (
        <section
          className="warung-story warung-empty-ask"
          data-reply="wait"
          aria-label="Pembeli menunggu kulakan"
        >
          <header>
            <span className="warung-story-badge">Mau Menunggu</span>
            <strong>😊 {front.name}</strong>
          </header>
          <p>“{front.line}”</p>
          {front.wantedItems && front.wantedItems.length > 0 && (
            <OrderChips lines={front.wantedItems} />
          )}
          <small>
            Pesanan ini otomatis masuk rekomendasi saat kamu buka tab Kulakan di Toko Cung.
          </small>
          <button
            type="button"
            className="warung-cta"
            onClick={() => {
              exitWarungToTokoCung();
              useGame
                .getState()
                .setToast(`Pesanan ${front.name} tersimpan di rekomendasi Kulakan Toko Cung!`);
            }}
          >
            Berangkat Kulakan ke Toko Cung
          </button>
        </section>
      );
    }
    if (front.emptyReply === "refuse") {
      return (
        <section
          className="warung-story warung-empty-ask"
          data-reply="refuse"
          aria-label="Pembeli tidak menunggu"
        >
          <header>
            <span className="warung-story-badge">Buru-buru</span>
            <strong>😤 {front.name}</strong>
          </header>
          <p>“{front.line}”</p>
          <button type="button" className="warung-cta" onClick={exitWarungToTokoCung}>
            Kulakan ke Toko Cung
          </button>
        </section>
      );
    }
    return (
      <section className="warung-story warung-empty-ask" aria-label="Rak kosong saat pembeli masuk">
        <header>
          <strong>{front.name}</strong>
          <span className="warung-trait-pill" data-trait={front.personality}>
            {front.traitLabel}
          </span>
        </header>
        <p>“{front.line}”</p>
        {front.wantedItems && front.wantedItems.length > 0 && (
          <OrderChips lines={front.wantedItems} />
        )}
        <div className="warung-actions">
          <button type="button" className="warung-cta" onClick={() => askCustomerToWait(front.id)}>
            Sebentar, kulakan dulu!
          </button>
          <button type="button" className="warung-secondary" onClick={() => leaveCustomer("😞")}>
            Maaf lagi kosong
          </button>
        </div>
      </section>
    );
  }
  if (front.personality === "kecewa") {
    return (
      <section className="warung-arrived warung-arrived-empty" aria-label="Pembeli kecewa">
        <div className="warung-arrived-copy">
          <strong>😞 {front.name} kecewa!</strong>
          <span>“{front.line}”</span>
        </div>
        {own && (
          <button type="button" className="warung-cta" onClick={exitWarungToTokoCung}>
            Kulakan
          </button>
        )}
      </section>
    );
  }
  return (
    <section className="warung-arrived" aria-label="Pembeli menunggu">
      <div className="warung-arrived-copy">
        <div className="warung-arrived-head">
          <strong>{front.name}</strong>
          <span className="warung-trait-pill" data-trait={front.personality}>
            {front.traitLabel}
          </span>
          {queueCount > 1 && <span className="warung-queue-pill">+{queueCount - 1} antre</span>}
        </div>
        <span>“{front.line}”</span>
        <WaitMeter customer={front} />
      </div>
      <button type="button" className="warung-cta" onClick={() => startOrder(stock)}>
        Layani
      </button>
    </section>
  );
}

const ownerServe = async (order: OrderLine[], fast: boolean) => {
  const before = useWarung.getState().data?.warung?.cash ?? 0;
  const s = await serveOrder(order, fast);
  if (!s?.warung) return null;
  const gain = s.warung.cash - before;
  return fast
    ? `⚡ Cekatan! Kas +${rupiah(gain)} (termasuk bonus cepat)`
    : `Terima kasih! Kas +${rupiah(gain)}`;
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
    <section className="warung-serve warung-visitor-shop" aria-label={`Belanja di ${inside.name}`}>
      <header>
        <strong>Belanja di {inside.name}</strong>
        <span>{data?.warung ? `Kas ${rupiah(data.warung.cash)}` : ""}</span>
      </header>
      {!data?.warung && (
        <p className="warung-hint">
          Buka warungmu sendiri dulu (HP → Warungku) untuk bisa belanja stok.
        </p>
      )}
      {items.length === 0 && <p className="warung-hint">Rak warung ini sedang kosong.</p>}
      <div className="warung-visitor-grid">
        {items.map((s) => (
          <article key={s.itemId} className="warung-product">
            <ProductArt id={s.itemId} size={36} />
            <strong>{catalog.get(s.itemId)?.name ?? s.itemId}</strong>
            <span>Sisa {s.qty}</span>
            <button
              type="button"
              className="warung-cta"
              disabled={busy || !data?.warung || data.warung.cash < s.price}
              onClick={() => void buyFromWarung(s.itemId, 1, s.price)}
            >
              {rupiah(s.price)}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * Single world prompt selector: returns a primitive key ("kulakan" | "lot:<id>" | "debt:<id>" | null)
 * so walking around the city never triggers per-frame React re-renders.
 */
function selectWorldPrompt(
  pos: [number, number, number],
  hasWarung: boolean,
  lots: ReturnType<typeof useWarung.getState>["lots"],
  debts: WarungDebt[],
): string | null {
  const [px, , pz] = pos;
  const inStore = px >= -11 && px <= 11 && pz >= -23 && pz <= 8;
  let bestKey: string | null = null;
  let bestDist = Infinity;

  if (inStore && hasWarung) {
    bestKey = "kulakan";
    bestDist = pz <= 3 ? 0 : Math.hypot(px, pz - 3);
  }

  for (const debt of debts) {
    const spot = debtorSpot(debt.id);
    const d = Math.hypot(px - spot.x, pz - spot.z);
    if (d < DEBTOR_PROMPT_RADIUS && d < bestDist) {
      bestDist = d;
      bestKey = `debt:${debt.id}`;
    }
  }

  for (const card of lots) {
    const lot = WARUNG_LOTS[card.lot];
    if (!lot) continue;
    const [lx, lz] = lotFront(lot);
    const d = Math.hypot(px - lx, pz - lz);
    if (d < LOT_PROMPT_RADIUS && d < bestDist) {
      bestDist = d;
      bestKey = `lot:${card.id}`;
    }
  }
  return bestKey;
}

/** Pulsing red banner while a thief is fleeing from an unlocked warung. */
function ThiefAlertBar() {
  const thief = useWarung((s) => s.thief);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!thief) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [thief]);
  if (!thief) return null;
  const secs = Math.max(0, Math.ceil((thief.deadlineAt - now) / 1000));
  return (
    <div className="warung-thief-alert pointer-events-auto" role="alert">
      <strong>🚨 {thief.name} kabur dari warungmu!</strong>
      <span>Kejar & tabrak sebelum lolos ({secs}s)</span>
      <button
        type="button"
        className="warung-hud-pill"
        data-tone="danger"
        onClick={() => useGame.getState().setWaypoint("warung-thief")}
      >
        📍 Arahkan
      </button>
    </div>
  );
}

/** Unified world prompt: Kulakan at Toko Cung, Tagih utang on street, or Masuk warung at a lot. */
function WorldWarungPrompt() {
  const lots = useWarung((s) => s.lots);
  const debts = useWarung((s) => s.data?.debts ?? []);
  const myWarungId = useWarung((s) => s.data?.warung?.id ?? null);
  const hasWarung = myWarungId !== null;
  const locked = useWarung((s) => s.locked);
  const thief = useWarung((s) => s.thief);
  const busy = useWarung((s) => s.busy);
  const sheet = useHud((h) => h.sheet);

  useEffect(() => {
    void ensureWarungData();
  }, []);

  // Watch for thieves when player is outside and left their warung unlocked.
  useEffect(() => {
    if (!hasWarung) return;
    const t = setInterval(() => thiefTick(), 1000);
    return () => clearInterval(t);
  }, [hasWarung]);

  const promptKey = useGame((g) => selectWorldPrompt(g.playerPos, hasWarung, lots, debts));

  useEffect(() => {
    if (promptKey === "kulakan" && useGame.getState().waypoint === "map-store") {
      useGame.getState().setWaypoint(null);
    }
  }, [promptKey]);

  if (sheet) return null;
  if (!promptKey) return thief ? <ThiefAlertBar /> : null;

  if (promptKey === "kulakan") {
    return (
      <div className="warung-world-prompt pointer-events-auto" data-warung-kulakan-prompt>
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

  if (promptKey.startsWith("debt:")) {
    const debtId = Number(promptKey.slice(5));
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return null;
    return (
      <div className="warung-world-prompt pointer-events-auto" data-warung-debt-prompt>
        <div className="warung-hud-bar">
          <div>
            <strong>💸 Ketemu {debt.npc}!</strong>
            <span>Utang {rupiah(debt.amount)} · tagih langsung di tempat</span>
          </div>
          <button
            type="button"
            className="warung-cta"
            disabled={busy}
            onClick={() => {
              if (useGame.getState().waypoint === `warung-debt-${debt.id}`) {
                useGame.getState().setWaypoint(null);
              }
              void collectDebt(debt.id, "street");
            }}
          >
            Tagih
          </button>
        </div>
      </div>
    );
  }

  const lotId = Number(promptKey.slice(4));
  const near = lots.find((c) => c.id === lotId);
  if (!near) return thief ? <ThiefAlertBar /> : null;
  const isMine = near.id === myWarungId;
  return (
    <>
      {thief && <ThiefAlertBar />}
      <div className="warung-world-prompt pointer-events-auto" data-warung-lot-prompt>
        <div className="warung-hud-bar">
          <div>
            <strong>{near.name}</strong>
            <span>
              {near.ownerName ?? "Pemain"} · {near.levelName}
              {isMine
                ? locked
                  ? " · 🔒 Terkunci"
                  : " · 🔓 Tidak dikunci!"
                : near.hiring
                  ? " · lowongan part-time"
                  : ""}
            </span>
          </div>
          {isMine && (
            <button
              type="button"
              className="warung-secondary"
              disabled={busy}
              onClick={() => setWarungLocked(!locked)}
            >
              {locked ? "🔓 Buka" : "🔒 Kunci"}
            </button>
          )}
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
    </>
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
  const debtCount = useWarung((s) => s.data?.debts?.length ?? 0);
  const serveStreak = useWarung((s) => s.serveStreak);
  const feedback = useWarung((s) => s.lastServeFeedback);
  const activeToast = useGame((s) => s.toast);
  const [mode, setMode] = useState<"none" | "shop" | "work">("none");
  const order = useWarung((s) => s.order);
  const { front, queueCount, arrived } = useFrontCustomer();
  const customerKey = front?.id ?? "none";
  const own = !!inside && isOwnWarung();
  // Closed or sealed by Koko Cung: no walk-in customers (the server would reject the sale anyway).
  const closedReason = useWarung((s) =>
    s.data?.rent?.sealed ? "sealed" : s.data?.warung && !s.data.warung.isOpen ? "closed" : null,
  );
  const onShift = (own && !closedReason) || mode === "work";
  const shiftStock = useMemo(
    () => (own ? (myStock ?? []) : (inside?.stock ?? [])),
    [own, myStock, inside?.stock],
  );
  const shiftStockRef = useRef(shiftStock);
  shiftStockRef.current = shiftStock;

  // Auto-hide serve speed feedback pill after 4s.
  const [showFeedback, setShowFeedback] = useState(false);
  useEffect(() => {
    if (!feedback) return;
    setShowFeedback(true);
    const t = setTimeout(() => setShowFeedback(false), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  useEffect(() => {
    resetWarung();
    return resetWarung;
  }, [room]);
  useEffect(() => setMode("none"), [inside?.id]);

  // Customer queue + story visitors while on shift.
  useEffect(() => {
    if (!onShift) return;
    const t = setInterval(() => customerTick(shiftStockRef.current, own), 500);
    return () => clearInterval(t);
  }, [onShift, own]);

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

  if (!inside) return <WorldWarungPrompt />;

  const alerts = own && myStock ? stockAlerts(myStock, maxStock) : null;
  const hasStock = shiftStock.some((x) => x.qty > 0);
  const isWalkingIn = onShift && !!front && !order && front.leavingAt === null && !arrived;
  const hasCustomerCard = onShift && (!!order || (!!front && front.leavingAt === null && arrived));
  const showEmptyCta = own && !hasStock && !hasCustomerCard;
  const hasDock = mode === "shop" || hasCustomerCard || showEmptyCta;

  return (
    <div className="warung-hud" data-warung-hud>
      <div className="warung-hud-top pointer-events-auto">
        <div className="warung-hud-bar warung-hud-bar--glass">
          <span className="warung-hud-icon" aria-hidden>
            🏪
          </span>
          <div className="warung-hud-id">
            <div className="warung-hud-title">
              <strong>{inside.name}</strong>
              <em className="warung-tier-tag">{inside.levelName}</em>
            </div>
            <span className="warung-hud-sub">
              {own && cash !== undefined ? (
                <b className="warung-cash-val">Kas {rupiah(cash)}</b>
              ) : (
                (inside.ownerName ?? "Warung")
              )}
            </span>
          </div>
          <div className="warung-hud-pills">
            {own && closedReason && (
              <button
                type="button"
                className="warung-hud-pill"
                data-tone="danger"
                title="Atur jam buka / bayar sewa"
                onClick={() => openWarungPanel("home")}
              >
                {closedReason === "sealed" ? "🔒 Disegel" : "🌙 Tutup"}
              </button>
            )}
            {own && serveStreak >= 2 && (
              <span className="warung-streak-pill" title="Combo pelayanan cepat">
                🔥 ×{serveStreak}
              </span>
            )}
            {own && debtCount > 0 && (
              <button
                type="button"
                className="warung-hud-pill"
                data-tone="debt"
                title="Lihat buku utang"
                onClick={() => openWarungPanel("catatan")}
              >
                💸 {debtCount}
              </button>
            )}
            {alerts && (alerts.empty.length > 0 || alerts.low.length > 0) && (
              <button
                type="button"
                className="warung-hud-pill"
                data-tone={alerts.empty.length > 0 ? "danger" : "warn"}
                title="Cek stok rak"
                onClick={() => openWarungPanel("home")}
              >
                {alerts.empty.length > 0
                  ? `${alerts.empty.length} habis`
                  : `${alerts.low.length} menipis`}
              </button>
            )}
            {!own && inside.hiring && (
              <button
                type="button"
                className={mode === "work" ? "warung-hud-pill" : "warung-hud-exit"}
                data-tone={mode === "work" ? "ok" : undefined}
                aria-pressed={mode === "work"}
                disabled={!inside.stock.some((x) => x.qty > 0)}
                onClick={() => {
                  leaveCustomer();
                  setMode((m) => (m === "work" ? "none" : "work"));
                }}
              >
                {mode === "work" ? "Selesai" : "Part-time"}
              </button>
            )}
            {!own && (
              <button
                type="button"
                className="warung-hud-exit"
                aria-pressed={mode === "shop"}
                onClick={() => {
                  leaveCustomer();
                  setMode((m) => (m === "shop" ? "none" : "shop"));
                }}
              >
                Belanja
              </button>
            )}
            {own && (
              <button
                type="button"
                className="warung-hud-pill"
                data-tone="ok"
                title="Kunci warung dan keluar agar aman dari maling"
                onClick={() => exitWarung(true)}
              >
                🔒 Kunci
              </button>
            )}
            <button type="button" className="warung-hud-exit" onClick={() => exitWarung(false)}>
              Keluar
            </button>
          </div>
        </div>
        {error && (
          <p className="warung-error" role="alert">
            {error}
          </p>
        )}
        {!error && !activeToast && showFeedback && feedback && (
          <p className="warung-feedback-chip" data-kind={feedback.kind}>
            {feedback.text}
          </p>
        )}
        {!error && !activeToast && !showFeedback && isWalkingIn && (
          <p className="warung-status-chip">
            {front.name} masuk ke warung…
            {queueCount > 1 ? ` (${queueCount} orang di warung)` : ""}
          </p>
        )}
      </div>

      {hasDock && (
        <div className="warung-hud-dock pointer-events-auto">
          {onShift && (
            <>
              <CounterCard
                front={front}
                queueCount={queueCount}
                stock={shiftStock}
                own={own}
                arrived={arrived}
              />
              {order && (
                <ServeGame
                  key={customerKey}
                  stock={shiftStock}
                  onServe={own ? ownerServe : workerServe}
                />
              )}
            </>
          )}
          {showEmptyCta && (
            <section className="warung-arrived warung-arrived-empty" aria-label="Rak kosong">
              <div className="warung-arrived-copy">
                <strong>Rak warung kosong!</strong>
                <span>Pembeli yang masuk bakal kecewa. Yuk kulakan dulu.</span>
              </div>
              <button type="button" className="warung-cta" onClick={exitWarungToTokoCung}>
                Kulakan ke Toko Cung
              </button>
            </section>
          )}
          {mode === "shop" && <VisitorShop />}
        </div>
      )}
    </div>
  );
}
