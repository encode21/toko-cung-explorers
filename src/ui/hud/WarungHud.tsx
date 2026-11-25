import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Flame, Minus, ShoppingBag } from "lucide-react";
import { WarungStoryShell } from "./WarungStoryShell";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import {
  answerEvent,
  callGuard,
  guardTarget,
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
  recordServeSpeed,
  registerMistake,
  reportWalkout,
  pickRandom,
  ANGRY_WRONG_ITEM,
  GRUMBLE_WRONG_ITEM,
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
  PRICEY_REACTION,
  debtorSpot,
  warungOpenNow,
  patienceEmoji,
  REVIEW_TEXT,
  orderTotal,
  receiptText,
  rupiah,
  starText,
  wrongItemHint,
  stockAlerts,
  type OrderLine,
  type WarungDebt,
  type WarungEvent,
  type WarungItem,
  type WarungStock,
} from "@/game/warung/model";
import { useSceneTime } from "@/game/time/scene-time";
import { ProductArt } from "@/game/warung/ProductArt";
import { WARUNG_LOTS, lotFront } from "@/game/warung/lots";
import { HudBalance } from "./HudBalance";
import { HudMenuArtwork } from "./HudMenuArtwork";
import "./side-menus.css";
import "./warung-panel.css";
import "./warung-service.css";
import { DeliveryPrompt } from "./KulakanDelivery";
import { AgenOffers } from "./agen/AgenUi";
import { basketTotal } from "@/game/warung/agen";
import { WarungCustomerAnchor } from "./WarungCustomerAnchor";
import { QuestTrackerButton } from "./QuestTrackerCard";
import { gameDateLabel } from "@/game/time/calendar";

function GuardHelp() {
  const quota = useWarung((s) => s.data?.guardAssist);
  const busy = useWarung((s) => s.busy);
  const action = useWarung((s) => s.guardAction);
  useWarung((s) => s.customers);
  useSceneTime((s) => s.minutes);
  if (!isOwnWarung() || !quota?.active) return null;
  const remaining = Date.now() >= quota.resetsAt ? quota.limit : quota.remaining;
  const next = guardTarget();
  return (
    <div className="warung-guard-help quest-tracker">
      <QuestTrackerButton
        disabled={busy || !!action || !next || remaining <= 0}
        onClick={() => void callGuard()}
      >
        Panggil penjaga · {remaining}/{quota.limit}
      </QuestTrackerButton>
      <span>
        {remaining <= 0
          ? "Bantuan habis. Tersedia lagi besok dalam game."
          : next
            ? `Bantu ${next.name}, pembeli berikutnya · per hari game`
            : "Menunggu pembeli berikutnya di antrean."}
      </span>
    </div>
  );
}

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

/** Build a bag from the stocked shelves; only an exact request earns a sale. */
function ServeGame({
  stock,
  onServe,
}: {
  stock: WarungStock[];
  onServe: (order: OrderLine[], review: ServeReview) => Promise<string | null>;
}) {
  const order = useWarung((s) => s.order);
  const customer = useWarung((s) => s.customers.find((c) => c.leavingAt === null) ?? null);
  const busy = useWarung((s) => s.busy);
  const insideId = useWarung((s) => s.inside?.id);
  const catalog = useCatalog();
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [left, setLeft] = useState(ORDER_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  /** Item the customer pointed at after a wrong bag ("yang ini loh"). */
  const [wanted, setWanted] = useState<string | null>(null);
  const done = useRef(false);
  const mounted = useRef(true);
  const shelfRef = useRef<HTMLDivElement>(null);
  const shelfId = useId();
  const [shelfScroll, setShelfScroll] = useState({ previous: false, next: false });
  const stockMap = useMemo(() => new Map(stock.map((s) => [s.itemId, s.qty])), [stock]);
  const shelfIds = useMemo(
    () => [
      ...new Set([
        ...stock.filter((item) => item.qty > 0).map((item) => item.itemId),
        // If stock changes while serving, keep picked items reachable for correction.
        ...Object.keys(picked).filter((id) => (picked[id] ?? 0) > 0),
      ]),
    ],
    [stock, picked],
  );
  const hasOrder = !!order;

  useEffect(() => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const update = () => {
      const previous = shelf.scrollLeft > 2;
      const next = shelf.scrollLeft + shelf.clientWidth < shelf.scrollWidth - 2;
      setShelfScroll((current) =>
        current.previous === previous && current.next === next ? current : { previous, next },
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(shelf);
    shelf.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      shelf.removeEventListener("scroll", update);
    };
  }, [hasOrder, shelfIds.length]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!order) return;
    const t = setInterval(() => {
      if (!done.current && !useWarung.getState().busy) setLeft((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [order]);

  useEffect(() => {
    if (order && left <= 0 && !done.current) {
      done.current = true;
      leaveCustomer(`😞${reportWalkout("timeout", customer?.name ?? "")}`);
      useWarung.setState({ serveStreak: 0, lastServeFeedback: null });
      useGame
        .getState()
        .setToast(`${customer?.name ?? "Pembeli"} menunggu terlalu lama dan pergi.`);
    }
  }, [left, order, customer?.name]);

  if (!order) return null;
  const ratio = Math.max(0, left / ORDER_SECONDS);
  const selected = Object.entries(picked).filter(([, qty]) => qty > 0);
  const got = selected.reduce((sum, [, qty]) => sum + qty, 0);
  const enoughStock = order.every((line) => (stockMap.get(line.itemId) ?? 0) >= line.qty);
  const locked = busy || submitting || left <= 0;

  const takeOne = (id: string) => {
    if (done.current || locked) return;
    setSubmitError("");
    setPicked((current) => ({
      ...current,
      [id]: Math.min(stockMap.get(id) ?? 0, (current[id] ?? 0) + 1),
    }));
  };
  const putBackOne = (id: string) => {
    if (done.current || locked) return;
    setSubmitError("");
    setPicked((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) - 1) }));
  };
  const scrollShelf = (direction: number) => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    shelf.scrollBy({
      left: direction * shelf.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };
  const handOver = async () => {
    if (done.current || locked || got === 0) return;
    const matchesOrder =
      selected.length === order.length && order.every((line) => picked[line.itemId] === line.qty);
    if (!matchesOrder) {
      const who = customer?.name ?? "Pembeli";
      const mistakes = registerMistake();
      if (mistakes >= 3) {
        done.current = true;
        leaveCustomer(`😡${reportWalkout("wrong", who)}`);
        useWarung.setState({ serveStreak: 0, lastServeFeedback: null });
        useGame.getState().setToast(`😡 ${who}: “${pickRandom(ANGRY_WRONG_ITEM)}”`);
        return;
      }
      if (mistakes === 2) {
        setWanted(null);
        setSubmitError(`😤 ${who}: “${pickRandom(GRUMBLE_WRONG_ITEM)}”`);
        return;
      }
      const hint = wrongItemHint(order, picked);
      const hintName = hint ? (catalog.get(hint)?.name ?? hint) : "";
      setWanted(hint);
      setSubmitError(
        hint && (picked[hint] ?? 0) > 0
          ? `${who}: “Jumlah ${hintName}-nya belum pas, aku pesan ${order.find((l) => l.itemId === hint)?.qty}.”`
          : `${who}: “Bukan itu… yang ini loh 👉 ${hintName}.”`,
      );
      return;
    }
    if (!enoughStock) {
      setSubmitError("Stok berubah. Barang belum cukup untuk diserahkan.");
      return;
    }
    done.current = true;
    setSubmitting(true);
    setSubmitError("");
    const speed =
      left >= FAST_LEFT_THRESHOLD ? "fast" : left <= SLOW_LEFT_THRESHOLD ? "slow" : "normal";
    const isCurrent = () =>
      mounted.current &&
      useWarung.getState().inside?.id === insideId &&
      useWarung.getState().customers.find((c) => c.leavingAt === null)?.id === customer?.id;
    try {
      const text = await onServe(order, {
        speed,
        mistakes: Math.min(2, customer?.mistakes ?? 0),
        npc: customer?.name ?? "",
        ...(customer?.personaId ? { persona: customer.personaId } : {}),
      });
      if (!isCurrent()) return;
      if (text === null) {
        done.current = false;
        setSubmitError("Pesanan belum berhasil diserahkan. Coba lagi.");
        return;
      }
      const review = useWarung.getState().lastReview;
      leaveCustomer(
        `${speed === "fast" ? "🤩" : speed === "slow" ? "😅" : "😊"}${review ? starText(review.stars) : ""}`,
      );
      recordServeSpeed(speed, speed === "fast" ? "+10% tip cekatan" : "");
      useGame.getState().setToast(text);
    } catch {
      if (isCurrent()) {
        done.current = false;
        setSubmitError("Pesanan belum berhasil diserahkan. Coba lagi.");
      }
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  };

  return (
    <section className="warung-service" aria-label="Layani pembeli">
      {customer && (
        <WarungCustomerAnchor customerId={customer.id} variant="order">
          <div className="warung-order-receipt" aria-label={`Pesanan ${customer.name}`}>
            <header>
              <strong>{customer.name}</strong>
              {customer.complaint && (
                <p className="warung-bubble-complaint" role="status">
                  😒 “{customer.complaint}”
                </p>
              )}
            </header>
            <div className="warung-bubble-order">
              <div
                className="warung-order-patience"
                data-urgent={left <= 4 || undefined}
                aria-hidden
              >
                <span style={{ transform: `scaleY(${ratio})` }} />
              </div>
              <ul className="warung-bubble-items">
                {order.map((line) => {
                  const name = catalog.get(line.itemId)?.name ?? line.itemId;
                  return (
                    <li key={line.itemId} aria-label={`${name}: ${line.qty}`} title={name}>
                      <ProductArt id={line.itemId} size={42} />
                      <b>×{line.qty}</b>
                      <span>{name}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <span className="warung-bubble-total">Total {rupiah(orderTotal(order, stock))}</span>
            <span
              className="warung-bubble-time"
              data-urgent={left <= 4 || undefined}
              aria-label={`Sisa waktu ${left} detik`}
            >
              <Clock3 size={13} aria-hidden /> {left} dtk
            </span>
          </div>
        </WarungCustomerAnchor>
      )}
      <div className="warung-serving-tray">
        <GuardHelp />
        <div className="warung-pick-header">
          <p className="warung-pick-hint">
            {!enoughStock
              ? "Stok berubah. Barang belum cukup untuk pesanan ini."
              : "Cocokkan barang dan jumlahnya dengan pesanan pelanggan."}
          </p>
          {(shelfScroll.previous || shelfScroll.next) && (
            <div className="warung-shelf-controls">
              <span>{shelfIds.length} jenis barang</span>
              <button
                type="button"
                className="warung-shelf-scroll-button"
                aria-label="Barang sebelumnya"
                aria-controls={shelfId}
                disabled={!shelfScroll.previous}
                onClick={() => scrollShelf(-1)}
              >
                <ChevronLeft size={19} aria-hidden />
              </button>
              <button
                type="button"
                className="warung-shelf-scroll-button"
                aria-label="Barang berikutnya"
                aria-controls={shelfId}
                disabled={!shelfScroll.next}
                onClick={() => scrollShelf(1)}
              >
                <ChevronRight size={19} aria-hidden />
              </button>
            </div>
          )}
        </div>
        <div className="warung-serving-body">
          <div
            className="warung-product-shelf"
            ref={shelfRef}
            id={shelfId}
            role="group"
            aria-label="Barang di rak warung"
          >
            {shelfIds.map((id) => {
              const name = catalog.get(id)?.name ?? id;
              const count = picked[id] ?? 0;
              const available = stockMap.get(id) ?? 0;
              return (
                <article
                  key={id}
                  className="warung-pick-slot"
                  data-selected={count > 0 || undefined}
                  data-wanted={wanted === id || undefined}
                >
                  <button
                    type="button"
                    className="warung-pick-product"
                    disabled={locked || count >= available}
                    onClick={() => takeOne(id)}
                    aria-label={`Ambil satu ${name}. Di kantong ${count}. Stok ${available}.`}
                  >
                    <ProductArt id={id} size={56} />
                    <strong>{name}</strong>
                    <span className="warung-pick-stock">
                      {available === 0 ? "Stok habis" : `Stok ${available}`}
                    </span>
                    <span className="warung-pick-count">Kantong {count}</span>
                  </button>
                  <button
                    type="button"
                    className="warung-pick-undo"
                    aria-label={`Kembalikan satu ${name}`}
                    disabled={locked || count === 0}
                    onClick={() => putBackOne(id)}
                  >
                    <Minus size={18} aria-hidden />
                  </button>
                </article>
              );
            })}
          </div>
          <div className="warung-handover">
            <span className="warung-bag-count" aria-live="polite" aria-atomic="true">
              <ShoppingBag size={21} aria-hidden /> Kantong {got} barang
            </span>
            {!enoughStock && (
              <p className="warung-short-stock" role="status">
                Stok belum cukup untuk pesanan ini.
              </p>
            )}
            {submitError && (
              <p className="warung-short-stock" role="alert">
                {submitError}
              </p>
            )}
            <button
              type="button"
              className="warung-cta warung-handover-button"
              disabled={locked || got === 0}
              onClick={() => void handOver()}
            >
              {submitting ? "Menyerahkan…" : "Serahkan pesanan"}
            </button>
          </div>
        </div>
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
    <WarungStoryShell
      key={event.id}
      kind={event.kind}
      label={`Tamu: ${event.npc}`}
      header={
        <>
          <span className="warung-story-badge">{story.badge}</span>
          <strong>{event.npc}</strong>
        </>
      }
      actions={
        <>
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
        </>
      }
    >
      <p>{story.line(event, itemList(event.items, catalog))}</p>
      {event.items.length > 0 && <OrderChips lines={event.items} />}
      {story.note && <small>{story.note}</small>}
    </WarungStoryShell>
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
        <WarungStoryShell
          key={`${front.id}-wait`}
          className="warung-empty-ask"
          reply="wait"
          label="Pembeli menunggu belanja grosir"
          header={
            <>
              <span className="warung-story-badge">Kerja Sambilan</span>
              <strong>{front.name}</strong>
            </>
          }
          actions={
            <button
              type="button"
              className="warung-cta"
              onClick={() => {
                exitWarungToTokoCung();
                useGame
                  .getState()
                  .setToast(`Pesanan ${front.name} tersimpan di rekomendasi Grosir Toko Cung!`);
              }}
            >
              Belanjain di Toko Grosir
            </button>
          }
        >
          <p>“{front.line}”</p>
          {!!front.wantedItems?.length && <OrderChips lines={front.wantedItems} />}
          <small>
            Kerja sambilan: belanjakan pesanannya di Toko Grosir, dia tunggu dan borong pas
            barangnya datang.
          </small>
        </WarungStoryShell>
      );
    }
    if (front.emptyReply === "refuse") {
      return (
        <WarungStoryShell
          key={`${front.id}-refuse`}
          className="warung-empty-ask"
          reply="refuse"
          label="Pembeli tidak menunggu"
          header={
            <>
              <span className="warung-story-badge">Buru-buru</span>
              <strong>{front.name}</strong>
            </>
          }
          actions={
            <button type="button" className="warung-cta" onClick={exitWarungToTokoCung}>
              Ke Grosir
            </button>
          }
        >
          <p>“{front.line}”</p>
        </WarungStoryShell>
      );
    }
    return (
      <WarungStoryShell
        key={`${front.id}-ask`}
        className="warung-empty-ask"
        label="Rak kosong saat pembeli masuk"
        header={
          <>
            <strong>{front.name}</strong>
            <span className="warung-trait-pill" data-trait={front.personality}>
              {front.traitLabel}
            </span>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="warung-cta"
              onClick={() => askCustomerToWait(front.id)}
            >
              Tunggu sebentar
            </button>
            <button type="button" className="warung-secondary" onClick={() => leaveCustomer("😞")}>
              Maaf, kosong
            </button>
          </>
        }
      >
        <p>“{front.line}”</p>
        {!!front.wantedItems?.length && <OrderChips lines={front.wantedItems} />}
      </WarungStoryShell>
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
            Grosir
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

type ServeReview = {
  speed: "fast" | "normal" | "slow";
  mistakes: number;
  npc: string;
  persona?: string;
};
const ownerServe = async (order: OrderLine[], review: ServeReview) => {
  const before = useWarung.getState().data?.warung?.cash ?? 0;
  useWarung.setState({ lastReview: null });
  const fast = review.speed === "fast";
  const s = await serveOrder(order, fast, review);
  if (!s?.warung) return null;
  const r = useWarung.getState().lastReview;
  const rated = r ? ` · ${starText(r.stars)} “${REVIEW_TEXT[r.reason]}”` : "";
  // Older backends send no receipt: fall back to the Kas difference.
  const paid = s.served ? receiptText(s.served) : `Kas +${rupiah(s.warung.cash - before)}`;
  return `${fast ? "⚡ Cekatan! " : "Terima kasih! "}${paid}${rated}`;
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
      <AgenOffers />
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
    if (debt.kind === "pinjam_uang") continue;
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
      <span>
        Kejar & pukul 2× sebelum lolos ({secs}s) · {thief.hits ?? 0}/2
      </span>
    </div>
  );
}

/** Info only (no CTA): kulakan happens at the shelves; the keranjang is paid at the cashier. */
function KulakanHint() {
  const count = useWarung((s) => s.basket.reduce((a, l) => a + l.qty, 0));
  const total = useWarung((s) => basketTotal(s.basket, s.data));
  return (
    <div className="warung-world-prompt" data-warung-kulakan-prompt>
      <div className="warung-hud-bar">
        <div>
          <strong>{count ? `🧺 ${count} barang · ${rupiah(total)}` : "Grosir di Toko Cung"}</strong>
          <span>{count ? "Bayar di kasir" : "Ambil barang di rak, lalu bayar di kasir"}</span>
        </div>
      </div>
    </div>
  );
}

// Stable fallback: zustand v5 re-renders forever (React #185) if a selector returns a new [] each call.
const NO_DEBTS: WarungDebt[] = [];

/** Unified world prompt: Kulakan at Toko Cung, Tagih utang on street, or Masuk warung at a lot. */
function WorldWarungPrompt() {
  const lots = useWarung((s) => s.lots);
  const debts = useWarung((s) => s.data?.debts ?? NO_DEBTS);
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

  if (promptKey === "kulakan") return <KulakanHint />;

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
/** Today's game date and clock under the warung card ("Sabtu, 31 Januari 2026 · 07.53"). */
function GameDateLine() {
  const time = useSceneTime((s) => s.currentTime);
  return (
    <span className="warung-hud-date">
      {gameDateLabel(Date.now())} · {time.replace(":", ".")}
    </span>
  );
}

export function WarungHud() {
  const room = useChannels((s) => s.lease?.channel);
  const inside = useWarung((s) => s.inside);
  const error = useWarung((s) => s.error);
  const cash = useWarung((s) => s.data?.warung?.cash);
  const billingText = useWarung((s) => s.data?.rent?.text);
  const myStock = useWarung((s) => s.data?.warung?.stock);
  const maxStock = useWarung((s) => s.data?.warung?.maxStock ?? 20);
  const serveStreak = useWarung((s) => s.serveStreak);
  const feedback = useWarung((s) => s.lastServeFeedback);
  const activeToast = useGame((s) => s.toast);
  const [mode, setMode] = useState<"none" | "shop" | "work">("none");
  const order = useWarung((s) => s.order);
  const { front, queueCount, arrived } = useFrontCustomer();
  const customers = useWarung((s) => s.customers);
  const customerKey = front?.id ?? "none";
  const own = !!inside && isOwnWarung();
  // Closed or sealed by Koko Cung: no walk-in customers (the server would reject the sale anyway).
  // Game hours tick every 2 real minutes; evaluate locally instead of waiting for the next poll.
  const gameHour = useSceneTime((s) => s.hour);
  const closedReason = useWarung((s) =>
    s.data?.rent?.sealed
      ? "sealed"
      : s.data?.warung?.renovation
        ? "renovation"
        : s.data?.warung && !warungOpenNow(s.data.warung, gameHour)
          ? "closed"
          : null,
  );
  const onShift = (own && !closedReason) || mode === "work";
  const insideId = inside?.id;
  useEffect(() => {
    useWarung.setState({ serviceView: insideId !== undefined && (own || mode === "work") });
    return () => {
      useWarung.setState({ serviceView: false });
    };
  }, [insideId, own, mode]);
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

  // Closing time (or oversleeping): buyers already inside go home; no one new comes.
  useEffect(() => {
    if (own && closedReason) useWarung.setState({ customers: [], order: null });
  }, [own, closedReason]);

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
          }. Belanja grosir di Toko Cung ya.`,
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [own, inside?.id]);

  if (!inside)
    return (
      <>
        <WorldWarungPrompt />
        <DeliveryPrompt />
      </>
    );

  const hasStock = shiftStock.some((x) => x.qty > 0);
  const isWalkingIn = onShift && !!front && !order && front.leavingAt === null && !arrived;
  const hasCustomerCard = onShift && (!!order || (!!front && front.leavingAt === null && arrived));
  const showEmptyCta = own && !hasStock && !hasCustomerCard;
  const hasDock = mode === "shop" || showEmptyCta;

  return (
    <div
      className="warung-hud warung-counter-hud"
      data-warung-hud
      data-serving={onShift || undefined}
    >
      <div className="warung-hud-top">
        <div className="warung-hud-bar warung-hud-bar--glass">
          <div className="warung-counter-identity">
            <span className="warung-hud-icon" aria-hidden>
              <HudMenuArtwork kind="shop" />
            </span>
            <div className="warung-hud-id">
              <div className="warung-hud-title">
                <strong>{inside.name}</strong>
              </div>
              <span className="warung-hud-sub" aria-label={`Level warung ${inside.level}`}>
                <b className="warung-counter-level">Lv. {inside.level}</b>
              </span>
              <GameDateLine />
            </div>
          </div>
          <div className="warung-counter-tools">
            <div className="warung-counter-balances">
              {own && serveStreak >= 2 && (
                <span className="warung-streak-pill" title="Combo pelayanan cepat">
                  <Flame size={17} aria-hidden /> ×{serveStreak}
                </span>
              )}
              {own && cash !== undefined && <HudBalance kind="kas" value={cash} />}
            </div>
            <div className="warung-hud-pills" role="group" aria-label="Aksi warung">
              {own && closedReason && (
                <button
                  type="button"
                  className="mmo-side-button warung-toolbar-button"
                  data-tone="danger"
                  title={billingText?.["title"] ?? "Atur jam buka / bayar sewa"}
                  onClick={() => openWarungPanel("home")}
                >
                  <HudMenuArtwork
                    kind={closedReason === "sealed" ? "warung-sealed" : "warung-closed"}
                  />
                  <span className="mmo-side-label">
                    {closedReason === "sealed"
                      ? (billingText?.["sealed"] ?? "Disegel")
                      : closedReason === "renovation"
                        ? "Renovasi"
                        : "Tutup"}
                  </span>
                </button>
              )}
              {own && (
                <button
                  type="button"
                  className="mmo-side-button warung-toolbar-button"
                  aria-label="Atur warung"
                  onClick={() => openWarungPanel("home")}
                  title="Atur harga, stok, dan jam buka"
                >
                  <HudMenuArtwork kind="warung-manage" />
                  <span className="mmo-side-label">Atur warung</span>
                </button>
              )}
              {own && (
                <button
                  type="button"
                  className="mmo-side-button warung-toolbar-button"
                  data-warung-decor
                  aria-label="Dekorasi"
                  onClick={() => useHud.getState().setSheet("warung-decor")}
                >
                  <HudMenuArtwork kind="warung-decor" />
                  <span className="mmo-side-label">Dekorasi</span>
                </button>
              )}
              <button
                type="button"
                className="mmo-side-button warung-toolbar-button"
                data-warung-community
                aria-label="Komunitas"
                title="Lihat dan kunjungi warung pemain lain"
                onClick={() => openWarungPanel("mampir")}
              >
                <HudMenuArtwork kind="warung-community" />
                <span className="mmo-side-label">Komunitas</span>
              </button>
              {!own && inside.hiring && (
                <button
                  type="button"
                  className="mmo-side-button warung-toolbar-button"
                  data-tone={mode === "work" ? "ok" : undefined}
                  aria-pressed={mode === "work"}
                  disabled={mode !== "work" && !inside.stock.some((x) => x.qty > 0)}
                  onClick={() => {
                    leaveCustomer();
                    setMode((m) => (m === "work" ? "none" : "work"));
                  }}
                >
                  <HudMenuArtwork kind="warung-work" />
                  <span className="mmo-side-label">
                    {mode === "work" ? "Selesai" : "Part-time"}
                  </span>
                </button>
              )}
              {!own && (
                <button
                  type="button"
                  className="mmo-side-button warung-toolbar-button"
                  aria-pressed={mode === "shop"}
                  onClick={() => {
                    leaveCustomer();
                    setMode((m) => (m === "shop" ? "none" : "shop"));
                  }}
                >
                  <HudMenuArtwork kind="warung-shop" />
                  <span className="mmo-side-label">Belanja</span>
                </button>
              )}
              {own && (
                <button
                  type="button"
                  className="mmo-side-button warung-toolbar-button"
                  data-tone="ok"
                  aria-label="Kunci warung dan keluar"
                  title="Kunci warung dan keluar agar aman dari maling"
                  onClick={() => exitWarung(true)}
                >
                  <HudMenuArtwork kind="warung-lock" />
                  <span className="mmo-side-label">Kunci &amp; keluar</span>
                </button>
              )}
              <button
                type="button"
                className="mmo-side-button warung-toolbar-button"
                aria-label="Keluar warung"
                onClick={() => exitWarung(false)}
              >
                <HudMenuArtwork kind="warung-exit" />
                <span className="mmo-side-label">Keluar</span>
              </button>
              <button
                type="button"
                className="mmo-side-button warung-toolbar-button"
                data-side-action="phone"
                data-warung-phone
                aria-label="Handphone"
                aria-haspopup="dialog"
                onClick={() => useHud.getState().setSheet("phone")}
              >
                <HudMenuArtwork kind="phone" />
                <span className="mmo-side-label">Handphone</span>
              </button>
            </div>
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
        {own && <DeliveryPrompt inline compact />}
        {!error && !activeToast && !showFeedback && isWalkingIn && (
          <p className="warung-status-chip">
            {front.name} masuk ke warung…
            {queueCount > 1 ? ` (${queueCount} orang di warung)` : ""}
          </p>
        )}
      </div>
      {onShift && front && arrived && !order && !front.guardReply && (
        <WarungCustomerAnchor
          customerId={front.id}
          variant={front.eventId !== undefined || front.emptyStockAsk ? "story" : "waiting"}
        >
          <CounterCard
            front={front}
            queueCount={queueCount}
            stock={shiftStock}
            own={own}
            arrived={arrived}
          />
        </WarungCustomerAnchor>
      )}
      {onShift && order && (
        <ServeGame key={customerKey} stock={shiftStock} onServe={own ? ownerServe : workerServe} />
      )}
      {onShift &&
        customers.map((customer) =>
          customer.guardReply ||
          (customer.leavingAt !== null &&
            customer.complaint &&
            customer.reaction?.startsWith(PRICEY_REACTION)) ? (
            <WarungCustomerAnchor key={customer.id} customerId={customer.id}>
              <div
                className={`warung-order-receipt${customer.eventKind === "palak" ? " warung-guard-dialogue" : ""}`}
                aria-label={`${customer.complaint ? "Keluhan" : "Tanggapan"} ${customer.name}`}
              >
                <header>
                  <strong>{customer.name}</strong>
                  <p className="warung-bubble-complaint" role="status">
                    {customer.complaint ? `😒 “${customer.complaint}”` : customer.guardReply}
                  </p>
                </header>
              </div>
            </WarungCustomerAnchor>
          ) : null,
        )}
      {hasDock && (
        <div className="warung-hud-dock pointer-events-auto">
          {showEmptyCta && (
            <section className="warung-arrived warung-arrived-empty" aria-label="Rak kosong">
              <div className="warung-arrived-copy">
                <strong>Stok habis</strong>
                <span>Isi rak dulu sebelum melayani pembeli.</span>
              </div>
              <button type="button" className="warung-cta" onClick={exitWarungToTokoCung}>
                <ShoppingBag size={19} aria-hidden /> Grosir
              </button>
            </section>
          )}
          {mode === "shop" && <VisitorShop />}
        </div>
      )}
    </div>
  );
}
