import { KasbonCard } from "@/game/gang/GangEconomyCards";
import { canFundWholesale, isCashMovement } from "@/game/gang/economy";
import { useStaff } from "@/game/staff/store";
import { worldRequest } from "@/services/world/client";
import { visitGangShop, useGang } from "@/game/gang/store";
import { useEffect, useRef, useState } from "react";
import { Store, Package, Settings2, NotebookPen, ChevronRight, Share2, X } from "lucide-react";
import { SHELVES } from "@/game/world/layout";
import {
  addToBasket,
  atTokoCung,
  clearRecommendedRestock,
  collectDebt,
  openNpcContact,
  exitWarungToTokoCung,
  restockRecommended,
  trackDebtor,
  useWarung,
  warungCommand,
  payBasket,
  deliveryFee,
} from "@/game/warung/store";
import {
  SHELF_ITEMS,
  buyChance,
  fairPrice,
  debtorSpot,
  REVIEW_TEXT,
  rupiah,
  starText,
  stockAlerts,
  type WarungDebt,
  type WarungItem,
  type WarungSnapshot,
  renovationMinutesLeft,
} from "@/game/warung/model";
import { ProductArt } from "@/game/warung/ProductArt";
import { basketTotal as agenBasketTotal, kulakanPrice } from "@/game/warung/agen";
import { AgenPricing } from "./agen/AgenUi";
import { ShareResultModal } from "./ShareResultCard";
import { StoryCard } from "./WarungLifeCards";
import { WarungOperations } from "./WarungOperations";
import { RenovationMeanwhile } from "./WarungUpgradeSection";
import { WarungDebtHistory } from "./WarungDebtHistory";
import { formatDue } from "./GameCalendar";
import { DeliveryPrompt } from "./KulakanDelivery";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useNet } from "@/net/net-store";
import { connectionId } from "@/net/channel-store";
import { KIOSK } from "@/game/interactions/kiosk";
import { kioskLine, leaveKioskQueue, useKioskQueue } from "@/game/warung/kiosk-queue";
import "./warung-panel.css";
import "./warung-management.css";

type Tab = "home" | "kulakan" | "harga" | "operasional" | "catatan";
const TABS = [
  { id: "home", label: "Ringkasan", icon: Store },
  { id: "harga", label: "Stok & harga", icon: Package },
  { id: "operasional", label: "Operasional", icon: Settings2 },
  { id: "catatan", label: "Catatan kas", icon: NotebookPen },
] as const;
const TAB_TITLES: Record<Tab, string> = {
  home: "Warungmu hari ini",
  harga: "Stok & harga",
  operasional: "Operasional warung",
  catatan: "Catatan kas",
  kulakan: "Grosir Toko Cung",
};
const isTab = (value: string | null): value is Tab =>
  value !== null && Object.hasOwn(TAB_TITLES, value);

export const JOURNAL_LABEL: Record<string, string> = {
  MODAL_AWAL: "Modal awal",
  RESTOCK: "Grosir",
  NPC_SALE: "Laku ke warga",
  SERVE: "Layani langsung",
  GUARD_ASSIST: "Panggil penjaga",
  GUARD_SALE: "Dilayani penjaga",
  PLAYER_SALE: "Dibeli pemain",
  PLAYER_BUY: "Beli dari warung lain",
  AGEN_SALE: "Jual partai ke warung lain",
  AGEN_BUY: "Beli partai dari Agen",
  WORK_SALE: "Dilayani part-time",
  WAGE: "Upah part-time",
  OJOL: "Orderan ojol",
  UTANG_LUNAS: "Utang dilunasi",
  NPC_CHAT_REWARD: "Terima kasih pelanggan",
  NPC_LOAN_OUT: "Pinjaman uang pelanggan",
  NPC_LOAN_REPAID: "Pengembalian pinjaman pelanggan",
  IURAN: "Iuran Pak RT",
  PALAK: "Uang palak / preman",
  SULTAN: "Rezeki Sultan",
  THEFT: "Kemalingan",
  UPGRADE: "Upgrade warung",
  SEWA: "Sewa Koko Cung",
  CERITA: "Hadiah cerita",
  LOT: "Beli kavling",
  DEKOR: "Dekor warung",
  LOGIN: "Kas harian",
  MOTOR: "Beli motor",
  KIRIM: "Ongkir grosir",
  LISTRIK: "Listrik",
  STAFF_RESTOCK: "Kulakan oleh kurir",
  STAFF_SALARY: "Gaji karyawan",
  STAFF_LATE: "Gaji tertunda",
  STAFF_LEFT: "Karyawan pamit",
};

type JournalRow = WarungSnapshot["journal"][number];
const journalTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});
export type JournalFilter = "all" | "out" | "in";

/**
 * Cash journal list. The snapshot only carries the newest 30 rows, where a busy guard's sales bury salaries and
 * bills, so a filter or "Muat lagi" reads the full journal from the server instead.
 */
export function JournalList({
  filter,
  withItems = true,
  withTime = false,
  limit,
}: {
  filter: JournalFilter;
  withItems?: boolean;
  withTime?: boolean;
  limit?: number;
}) {
  const staffData = useStaff((s) => s.data);
  const data = useWarung((s) => s.data);
  const newest = data?.journal[0]?.id;
  // Server pages are tagged with their filter, so a late reply for another filter is ignored.
  const [page, setPage] = useState<{
    filter: JournalFilter;
    rows: JournalRow[];
    more: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const current = useRef(filter);
  current.current = filter;
  const fetchPage = async (group: JournalFilter, before: JournalRow[]) => {
    const beforeId = before[before.length - 1]?.id;
    setLoading(true);
    try {
      const r = await worldRequest<{ journal: JournalRow[]; more: boolean }>("warung", {
        action: "journal",
        group,
        ...(beforeId ? { beforeId } : {}),
      });
      if (current.current === group)
        setPage({ filter: group, rows: [...before, ...r.journal], more: r.more });
    } catch {
      // Keep what is on screen; the snapshot list is still a valid first page.
    } finally {
      setLoading(false);
    }
  };
  const paged = page?.filter === filter && page.rows.length > 30;
  useEffect(() => {
    // "Semua" page one is the fresh snapshot; filters refetch on new cash activity unless the player paged further.
    if (filter === "all" || paged) return;
    void fetchPage(filter, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on filter change or new cash activity
  }, [filter, newest]);
  if (!data) return null;
  const own = page?.filter === filter && (filter !== "all" || paged) ? page : null;
  const entries =
    own?.rows ??
    data.journal.filter((j) =>
      filter === "out"
        ? isCashMovement(j) && j.amount < 0
        : filter === "in"
          ? isCashMovement(j) && j.amount > 0
          : true,
    );
  const more = own ? own.more : filter === "all" && data.journal.length >= 30;
  if (entries.length === 0)
    return <p className="warung-hint">Belum ada catatan untuk filter ini.</p>;
  return (
    <>
      <ul>
        {entries.slice(0, limit).map((j, i) => (
          <li key={j.id ?? i}>
            <span>
              {(j.type.startsWith("STAFF_")
                ? staffData?.text[`journal_${j.type.slice(6).toLowerCase()}`]
                : null) ??
                j.label ??
                JOURNAL_LABEL[j.type] ??
                j.type}
              {withItems && j.itemId
                ? ` · ${staffData?.staff.find((e) => e.kind === j.itemId)?.name ?? itemName(data.catalog, j.itemId)} ×${j.qty}`
                : ""}
              {withTime && Number.isFinite(Date.parse(j.at)) && (
                <time dateTime={j.at}>{journalTime.format(Date.parse(j.at))} WIB</time>
              )}
            </span>
            <b data-negative={j.amount < 0 || undefined}>
              {isCashMovement(j) ? (j.amount < 0 ? "−" : "+") : ""}
              {rupiah(Math.abs(j.amount))}
              {!isCashMovement(j) && <small>{data.rent?.text?.["non_cash"] ?? "Nonkas"}</small>}
            </b>
          </li>
        ))}
      </ul>
      {limit === undefined && more && (
        <button
          type="button"
          className="warung-secondary"
          disabled={loading}
          onClick={() => void fetchPage(filter, entries)}
        >
          {loading ? "Memuat…" : "Muat lagi"}
        </button>
      )}
    </>
  );
}

export function JournalFilterPills({
  filter,
  onChange,
}: {
  filter: JournalFilter;
  onChange: (f: JournalFilter) => void;
}) {
  return (
    <div className="warung-filter-pills" role="group" aria-label="Filter catatan">
      {(
        [
          ["all", "Semua"],
          ["out", "Pengeluaran"],
          ["in", "Pemasukan"],
        ] as const
      ).map(([id, label]) => (
        <button key={id} type="button" aria-pressed={filter === id} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}
const itemName = (catalog: WarungItem[], id: string) => {
  const item = catalog.find((i) => i.id === id);
  // Grosir units read as such: "Mi Goreng (dus)".
  return item ? `${item.name}${item.uom && item.uom !== "pcs" ? ` (${item.uom})` : ""}` : id;
};

function OpenForm() {
  const openHint = useGang((s) => s.data?.text["open_hint"]);
  const [name, setName] = useState("");
  const lot = useWarung((s) => s.openLot);
  const offer = useWarung((s) => s.data?.lotMarket?.find((entry) => entry.lot === lot));
  const busy = useWarung((s) => s.busy);
  const savings = useWarung((s) => s.data?.savings ?? 0);
  return (
    <form
      className="warung-open"
      onSubmit={(e) => {
        e.preventDefault();
        void warungCommand("open", { name: name.trim(), ...(lot !== null ? { lot } : {}) });
      }}
    >
      <h3>Buka warungmu sendiri</h3>
      <p>
        Mulai dari Warung Teras dengan modal Kas Rp50.000
        {savings > 0 ? ` + tabungan part-time ${rupiah(savings)}` : ""}. Semua uang di sini hanya
        simulasi.
      </p>
      <label>
        Nama warung
        <input
          value={name}
          maxLength={24}
          minLength={3}
          required
          placeholder="Warung Bu Sari"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {lot !== null ? (
        <div className="warung-card-actions items-center">
          <p className="warung-hint">
            Kavling #{lot + 1} dari peta
            {offer ? ` · ${offer.price ? rupiah(offer.price) : "Gratis"}` : ""}
          </p>
          <button
            type="button"
            className="warung-secondary"
            disabled={busy}
            onClick={() => useWarung.setState({ openLot: null })}
          >
            Gunakan lokasi awal
          </button>
        </div>
      ) : (
        openHint && <p className="warung-hint">{openHint}</p>
      )}
      <button type="submit" className="warung-cta" disabled={busy || name.trim().length < 3}>
        Buka warung
      </button>
    </form>
  );
}

function Home({ onTab }: { onTab: (tab: Tab) => void }) {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const inside = useWarung((s) => s.inside);
  const [sharing, setSharing] = useState(false);
  const w = data?.warung;
  if (!w) return <OpenForm />;
  const stocked = w.stock.filter((s) => s.qty > 0).length;
  const alerts = stockAlerts(w.stock, w.maxStock);
  const needsStock = alerts.empty.length + alerts.low.length;
  return (
    <div className="warung-overview">
      <div className="warung-overview-identity">
        <span className="warung-overview-art">
          <Store size={38} aria-hidden />
        </span>
        <div>
          <h4>{w.name}</h4>
          <p>
            Lv.{w.level} · {w.levelName}
          </p>
        </div>
        <button
          type="button"
          className="warung-share"
          aria-label="Bagikan warung"
          onClick={() => setSharing(true)}
        >
          <Share2 size={18} aria-hidden />
        </button>
      </div>
      <dl className="warung-overview-facts">
        <div>
          <dt>Terisi di rak</dt>
          <dd>{stocked} jenis</dd>
        </div>
        <div>
          <dt>Total penjualan</dt>
          <dd>{rupiah(w.totalSales)}</dd>
        </div>
        <div>
          <dt>Jam buka</dt>
          <dd>
            {String(w.openHour).padStart(2, "0")}.00–{String(w.closeHour).padStart(2, "0")}.00
          </dd>
        </div>
        <div>
          <dt>Rating pembeli</dt>
          <dd>
            {w.rating?.avg != null
              ? `⭐ ${w.rating.avg.toFixed(1)} (${w.rating.count} ulasan)`
              : "Belum ada ulasan"}
          </dd>
        </div>
      </dl>
      {!!w.rating?.recent.length && (
        <ul className="warung-reviews" aria-label="Ulasan terbaru">
          {w.rating.recent.map((r) => (
            <li key={r.at + r.npc}>
              <span aria-label={`${r.stars} bintang`}>{starText(r.stars)}</span>
              <b>{r.npc || "Pembeli"}</b> “{REVIEW_TEXT[r.reason]}”
            </li>
          ))}
        </ul>
      )}
      {(stocked === 0 || needsStock > 0) && (
        <div className="warung-overview-notice">
          <Package size={24} aria-hidden />
          <div>
            <strong>
              {stocked === 0 ? "Rak masih kosong" : `${needsStock} jenis stok perlu diisi`}
            </strong>
            <p>
              {stocked === 0
                ? "Isi barang dari Grosir sebelum mulai jualan."
                : `${alerts.empty.length} habis · ${alerts.low.length} menipis`}
            </p>
          </div>
          <button
            type="button"
            className="warung-cta"
            onClick={() => useHud.getState().setSheet("tokocung")}
          >
            Grosir
          </button>
        </div>
      )}
      {data.rent && data.rent.owedDays > 0 && (
        <button type="button" className="warung-overview-link" onClick={() => onTab("operasional")}>
          <span>
            <strong>
              {data.rent.sealed
                ? (data.rent.text?.["sealed"] ?? "Warung disegel")
                : (data.rent.text?.["due"] ?? "Sewa belum lunas")}
            </strong>
            <small>Tagihan {rupiah(data.rent.owed)} · buka Operasional</small>
          </span>
          <ChevronRight size={18} aria-hidden />
        </button>
      )}
      <div className="warung-overview-actions">
        <button
          type="button"
          className="warung-cta"
          disabled={busy}
          onClick={() => {
            useHud.getState().setSheet(null);
            if (!inside || inside.id !== w.id) void visitGangShop(w.id);
          }}
        >
          {inside?.id === w.id ? "Kembali melayani" : "Masuk warung"}
        </button>
        <button type="button" className="warung-secondary" onClick={() => onTab("harga")}>
          Atur stok & harga
        </button>
      </div>
      {w.renovation && (
        <section className="warung-card warung-life" data-tone="warn">
          <div className="warung-card-head">
            <strong>🚧 Sedang renovasi jadi {w.renovation.levelName}</strong>
            <span className="warung-level-pill">±{renovationMinutesLeft(w.renovation)} menit</span>
          </div>
          <p className="warung-hint">{w.renovationText?.["rules"]}</p>
          <RenovationMeanwhile />
        </section>
      )}
      <StoryCard />
      {sharing && <ShareResultModal onClose={() => setSharing(false)} />}
    </div>
  );
}

/** Kulakan list. `app` = Toko Cung App: order from anywhere, delivered by truck (antar). */
export function Kulakan({ app = false }: { app?: boolean }) {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const rec = useWarung((s) => s.recommendedRestock);
  const shelf = useWarung((s) => s.shelfFilter);
  const basket = useWarung((s) => s.basket);
  const [qty, setQty] = useState(5);
  const [atStore, setHere] = useState(atTokoCung);
  const here = app || atStore;
  useEffect(() => {
    const t = setInterval(() => setHere(atTokoCung()), 1000);
    return () => clearInterval(t);
  }, []);
  const kioskSince = useKioskQueue((k) => k.since);
  const roster = useNet((n) => n.roster);
  // Walking away from the kiosk gives up your place in line.
  useEffect(() => {
    if (kioskSince === null) return;
    const t = setInterval(() => {
      const [x, , z] = useGame.getState().playerPos;
      if (Math.hypot(x - KIOSK.position[0], z - KIOSK.position[2]) > KIOSK.radius + 2)
        leaveKioskQueue();
    }, 1000);
    return () => clearInterval(t);
  }, [kioskSince]);
  const w = data?.warung;
  if (!data || !w) return <OpenForm />;
  const credit = data.kasbon?.available ?? 0;
  const recMap = new Map((rec?.items ?? []).map((l) => [l.itemId, l.qty]));

  if (!here)
    return (
      <div className="warung-away">
        <strong>Grosir di gedung Toko Cung</strong>
        <p>
          Datang ke Toko Cung untuk belanja stok grosir. Tab ini aktif begitu kamu sampai di toko.
        </p>
        {rec && rec.items.length > 0 && (
          <div className="warung-rec-preview">
            <span>{rec.customerName} menunggu pesanan:</span>
            <ul>
              {rec.items.map((l) => (
                <li key={l.itemId}>
                  {itemName(data.catalog, l.itemId)} ×{l.qty}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="button"
          className="warung-cta"
          onClick={() => {
            useHud.getState().setSheet(null);
            if (useWarung.getState().inside) exitWarungToTokoCung();
            else useGame.getState().setWaypoint("map-store");
          }}
        >
          Tunjukkan jalan ke Toko Cung
        </button>
      </div>
    );

  const line = kioskSince === null ? [] : kioskLine(roster, connectionId, kioskSince);
  const atKiosk = kioskSince !== null;
  const myPlace = line.findIndex((p) => p.id === connectionId);
  if (atKiosk && myPlace > 0)
    return (
      <div className="warung-away" aria-live="polite">
        <strong>Antri kiosk · urutan ke-{myPlace + 1}</strong>
        <p>
          {line[0]!.name} sedang pakai kiosk. Giliranmu otomatis begitu dia selesai — atau ambil
          barang langsung di rak.
        </p>
        <button type="button" className="warung-secondary" onClick={leaveKioskQueue}>
          Keluar antrian
        </button>
      </div>
    );

  // Calculate missing items & cost for the waiting customer's recommendation.
  const recRows = (rec?.items ?? []).map((req) => {
    const item = data.catalog.find((c) => c.id === req.itemId);
    const have = w.stock.find((s) => s.itemId === req.itemId)?.qty ?? 0;
    const need = Math.max(0, req.qty - have);
    return { req, item, have, need, cost: (item ? kulakanPrice(item, data.agen) : 0) * need };
  });
  const recTotalCost = recRows.reduce((a, r) => a + r.cost, 0);
  const recNeedsAny = recRows.some((r) => r.need > 0);
  const shelfItems = shelf && !app ? SHELF_ITEMS[shelf] : undefined;
  const orderedCatalog = data.catalog
    .filter((i) => !shelfItems || shelfItems.includes(i.id) || i.shelf === shelf)
    .sort((a, b) => Number(recMap.has(b.id)) - Number(recMap.has(a.id)));
  const inBasket = (id: string) => basket.find((l) => l.itemId === id)?.qty ?? 0;
  const basketTotal = agenBasketTotal(basket, data);

  return (
    <div className="warung-list">
      {rec && recRows.length > 0 && (
        <section className="warung-rec-box" aria-label="Rekomendasi pesanan pembeli">
          <header className="warung-rec-head">
            <div>
              <strong>Pesanan {rec.customerName}</strong>
              <span>Pembeli sedang menunggu di warungmu</span>
            </div>
            <button
              type="button"
              className="warung-rec-dismiss"
              aria-label="Tutup rekomendasi"
              onClick={clearRecommendedRestock}
            >
              <X size={16} aria-hidden />
            </button>
          </header>
          <ul className="warung-rec-items">
            {recRows.map(({ req, item, need }) => (
              <li key={req.itemId} data-done={need === 0 || undefined}>
                <ProductArt id={req.itemId} size={26} />
                <span>{item?.name ?? req.itemId}</span>
                <b>{need === 0 ? "Siap" : `Butuh ×${need}`}</b>
              </li>
            ))}
          </ul>
          {recNeedsAny ? (
            <button
              type="button"
              className="warung-cta"
              disabled={busy || !canFundWholesale(w.cash, credit, recTotalCost + basketTotal)}
              onClick={() => void restockRecommended()}
            >
              {!canFundWholesale(w.cash, credit, recTotalCost + basketTotal)
                ? `Kas kurang (${rupiah(recTotalCost)})`
                : `Masukkan pesanan ke keranjang · ${rupiah(recTotalCost)}`}
            </button>
          ) : (
            <button
              type="button"
              className="warung-cta"
              disabled={busy}
              onClick={() => {
                useHud.getState().setSheet(null);
                void visitGangShop(w.id);
              }}
            >
              Masuk Warung & Layani {rec.customerName}
            </button>
          )}
        </section>
      )}
      {shelf && (
        <div className="warung-card-head">
          <strong>{SHELVES.find((z) => z.id === shelf)?.label ?? "Rak"}</strong>
          <button
            type="button"
            className="warung-secondary"
            onClick={() => useWarung.setState({ shelfFilter: null })}
          >
            Semua barang
          </button>
        </div>
      )}
      <KasbonCard />
      <div className="warung-qty" role="group" aria-label="Jumlah belanja grosir">
        {[1, 5, 10].map((n) => (
          <button key={n} type="button" aria-pressed={qty === n} onClick={() => setQty(n)}>
            ×{n}
          </button>
        ))}
        <span>Kas {rupiah(w.cash)}</span>
      </div>
      <div className="warung-product-grid">
        {orderedCatalog.map((item) => {
          const have = w.stock.find((s) => s.itemId === item.id)?.qty ?? 0;
          const locked = item.level > w.level;
          const cost = kulakanPrice(item, data.agen) * qty;
          const picked = inBasket(item.id);
          const full = have + picked + qty > w.maxStock;
          const wantedQty = recMap.get(item.id);
          return (
            <article
              key={item.id}
              className="warung-product"
              data-locked={locked || undefined}
              data-recommended={wantedQty ? "true" : undefined}
            >
              {wantedQty && <span className="warung-rec-badge">Dipesan ×{wantedQty}</span>}
              <ProductArt id={item.id} size={46} />
              <strong>{item.name}</strong>
              <p className="warung-product-price">
                {rupiah(kulakanPrice(item, data.agen))}
                <small>/{item.uom ?? "pcs"}</small>
              </p>
              {!!data.agen?.discountPercent && (
                <span className="warung-product-meta">
                  Harga {w.levelName} −{data.agen.discountPercent}% (normal {rupiah(item.wholesale)}
                  )
                </span>
              )}
              <span className="warung-product-meta">Jual pasar ±{rupiah(item.market)}</span>
              <div className="warung-meter" aria-label={`Stok ${have} dari ${w.maxStock}`}>
                <span style={{ width: `${(have / w.maxStock) * 100}%` }} />
              </div>
              <small>
                {locked
                  ? `Terbuka di Lv.${item.level}`
                  : `Stok ${have}/${w.maxStock}${picked ? ` · Keranjang ${picked}` : ""}`}
              </small>
              <button
                type="button"
                className="warung-cta"
                disabled={
                  busy || locked || !canFundWholesale(w.cash, credit, basketTotal + cost) || full
                }
                onClick={() => addToBasket(item.id, qty)}
              >
                {locked
                  ? "Terkunci"
                  : full
                    ? "Rak penuh"
                    : !canFundWholesale(w.cash, credit, basketTotal + cost)
                      ? "Kas kurang"
                      : `+${qty} keranjang · ${rupiah(cost)}`}
              </button>
            </article>
          );
        })}
      </div>
      {basket.length > 0 && (
        <section className="warung-card" aria-label="Keranjang grosir">
          <div className="warung-card-head">
            <strong>Keranjang</strong>
            <span className="warung-level-pill">{rupiah(basketTotal)}</span>
          </div>
          <ul className="warung-rec-items">
            {basket.map((l) => (
              <li key={l.itemId}>
                <ProductArt id={l.itemId} size={26} />
                <span>
                  {itemName(data.catalog, l.itemId)} ×{l.qty}
                </span>
                <button
                  type="button"
                  className="warung-secondary"
                  aria-label={`Kurangi ${itemName(data.catalog, l.itemId)}`}
                  onClick={() => addToBasket(l.itemId, -1)}
                >
                  −
                </button>
              </li>
            ))}
          </ul>
          {atKiosk && <DeliveryPrompt inline />}
          {app ? (
            <button
              type="button"
              className="warung-cta"
              disabled={
                busy || !canFundWholesale(w.cash, credit, basketTotal, deliveryFee(basketTotal))
              }
              onClick={() => void payBasket("antar")}
            >
              Pesan & antar · {rupiah(basketTotal + deliveryFee(basketTotal))}
            </button>
          ) : atKiosk ? (
            <button
              type="button"
              className="warung-cta"
              disabled={busy}
              onClick={() => void payBasket()}
            >
              Bayar di kiosk · {rupiah(basketTotal)}
            </button>
          ) : (
            <p className="warung-hint">Bawa ke kasir Toko Cung dan tekan Bayar.</p>
          )}
        </section>
      )}
    </div>
  );
}

function demand(price: number, market: number) {
  const chance = buyChance(price, market);
  return fairPrice(price, market)
    ? { label: "Laris", tone: "good" }
    : chance > 0
      ? { label: "Mahal", tone: "ok" } // some buy, others grumble or walk away
      : { label: "Sepi", tone: "bad" }; // ≥1.3× market: nobody buys
}

function Harga() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const w = data?.warung;
  if (!data || !w) return <OpenForm />;
  const rows = w.stock;
  if (!rows.length)
    return (
      <div className="warung-empty-banner">
        <div>
          <strong>Belum ada barang di rak</strong>
          <p>Belanja grosir dulu di Toko Cung supaya bisa atur harga jualmu.</p>
        </div>
        <button
          type="button"
          className="warung-cta"
          onClick={() => useHud.getState().setSheet("tokocung")}
        >
          Grosir di Toko Cung App
        </button>
      </div>
    );
  return (
    <div className="warung-list">
      <p className="warung-hint">
        Harga sampai 5% di atas pasar tetap Laris (+bonus 10% saat layani langsung).
      </p>
      <div className="warung-price-list">
        {rows.map((s) => {
          const item = data.catalog.find((i) => i.id === s.itemId);
          if (!item) return null;
          const step = item.market >= 5000 ? 500 : 100;
          const set = (price: number) =>
            void warungCommand("price", {
              itemId: item.id,
              price: Math.max(item.wholesale, Math.min(item.market * 2, price)),
            });
          const d = demand(s.price, item.market);
          return (
            <article key={s.itemId} className="warung-price-row">
              <ProductArt id={item.id} size={40} />
              <div className="warung-price-row-info">
                <div className="warung-price-row-head">
                  <strong>{item.name}</strong>
                  <span className="warung-demand" data-tone={d.tone}>
                    {d.label}
                  </span>
                </div>
                <small>
                  Untung <b>{rupiah(s.price - kulakanPrice(item, data.agen))}</b> · Pasar{" "}
                  {rupiah(item.market)} · Stok {s.qty}
                </small>
              </div>
              <div className="warung-price-row-ctrl">
                <div className="warung-price-tag">
                  <button
                    type="button"
                    aria-label={`Turunkan harga ${item.name}`}
                    disabled={busy || s.price <= item.wholesale}
                    onClick={() => set(s.price - step)}
                  >
                    −
                  </button>
                  <output aria-live="polite">{rupiah(s.price)}</output>
                  <button
                    type="button"
                    aria-label={`Naikkan harga ${item.name}`}
                    disabled={busy || s.price >= item.market * 2}
                    onClick={() => set(s.price + step)}
                  >
                    +
                  </button>
                </div>
                {s.price !== item.market && (
                  <button
                    type="button"
                    className="warung-reset-link"
                    disabled={busy}
                    onClick={() => set(item.market)}
                  >
                    Pasar
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="warung-actions">
        <button
          type="button"
          className="warung-secondary"
          onClick={() => useHud.getState().setSheet("tokocung")}
        >
          Grosir di Toko Cung App
        </button>
      </div>
      <AgenPricing />
    </div>
  );
}

interface ChatMsg {
  from: "npc" | "me" | "sys";
  text: string;
}

/** Interactive 2-step branching debt-collection chat with selectable reply bubbles. */
export function DebtChat({
  debt,
  onBack,
  embedded = false,
}: {
  debt: WarungDebt;
  onBack: () => void;
  embedded?: boolean;
}) {
  const busy = useWarung((s) => s.busy);
  const spot = debtorSpot(debt.id);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paid, setPaid] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      from: "npc",
      text: `Eh halo bos warung! Maaf baru bales ya lagi repot banget nih… ada apa?`,
    },
  ]);

  useEffect(() => {
    if (embedded && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [embedded, messages]);

  const finishWithTone = async (
    myText: string,
    tone: "good" | "soft" | "harsh",
    npcFallback: string,
  ) => {
    setMessages((m) => [...m, { from: "me", text: myText }]);
    const res = await collectDebt(debt.id, "chat", tone);
    if (!res) {
      setMessages((m) => [
        ...m,
        {
          from: "sys",
          text: "Baru saja menagih lewat chat. Tunggu sebentar atau samperin di jalan.",
        },
      ]);
      setStep(3);
      return;
    }
    const news = res.news?.find((n) => n.npc === debt.npc);
    if (news?.kind === "debt_collected_chat") {
      setPaid(true);
      setMessages((m) => [
        ...m,
        {
          from: "npc",
          text: `Oke siap bos! Ini langsung aku transfer ke Kas Warung ya (${rupiah(news.amount)}). Makasih udah sabar!`,
        },
        { from: "sys", text: `Utang lunas +${rupiah(news.amount)} masuk Kas Warung.` },
      ]);
    } else if (news?.kind === "debt_extended_chat") {
      setMessages((m) => [
        ...m,
        { from: "npc", text: npcFallback },
        {
          from: "sys",
          text: `Salah pendekatan! ${debt.npc} mengulur waktu bayar +${news.extendMinutes ?? 15} menit.`,
        },
      ]);
    } else {
      setMessages((m) => [
        ...m,
        {
          from: "npc",
          text: `Aduh maaf banget bos, dompet ketinggalan di rumah… nanti agak sorean aku mampir ya`,
        },
        {
          from: "sys",
          text: `Belum dibayar sekarang. Kamu bisa samperin ${debt.npc} di ${spot.area}.`,
        },
      ]);
    }
    setStep(3);
  };

  const pickStep1 = (choice: "polite" | "joke" | "harsh") => {
    if (busy) return;
    if (choice === "harsh") {
      void finishWithTone(
        `Woi bayar utang ${rupiah(debt.amount)} dong! Jangan kabur terus!`,
        "harsh",
        `Ih kok ngegas gitu sih?! Lagi pusing malah dimarahin, tunggu aja kapan-kapan!`,
      );
      return;
    }
    if (choice === "polite") {
      setMessages((m) => [
        ...m,
        {
          from: "me",
          text: `Halo ${debt.npc}, mau ingetin bon ${rupiah(debt.amount)} kemarin ya. Hari ini bisa lunas?`,
        },
        {
          from: "npc",
          text: `Oh iya beneran inget kok! Tadi mau mampir ke warung tapi lagi di sekitar ${spot.area}…`,
        },
      ]);
    } else {
      setMessages((m) => [
        ...m,
        {
          from: "me",
          text: `Buku utang warung udah kangen sama nama ${debt.npc} nih yuk diberesin ${rupiah(debt.amount)}`,
        },
        {
          from: "npc",
          text: `Hahaha bisa aja nih bos! Iya deh, aku juga nggak enak kelamaan ngutang…`,
        },
      ]);
    }
    setStep(2);
  };

  return (
    <section className="warung-chat" aria-label={`Chat penagihan ${debt.npc}`}>
      {!embedded && (
        <header className="warung-chat-head">
          <button type="button" className="warung-reset-link" onClick={onBack}>
            Kembali
          </button>
          <div>
            <strong>{debt.npc}</strong>
            <small>
              Utang {rupiah(debt.amount)} · {spot.area}
            </small>
          </div>
        </header>
      )}

      <div ref={logRef} className="warung-chat-log" role="log" aria-label="Pesan penagihan">
        {messages.map((m, i) => (
          <div key={i} className="warung-chat-bubble" data-from={m.from}>
            {m.text}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="warung-chat-options" role="group" aria-label="Pilih balasan chat">
          <small>Pilih gaya chat kamu:</small>
          <button type="button" disabled={busy} onClick={() => pickStep1("polite")}>
            {embedded
              ? "Tagih baik-baik"
              : `“Halo ${debt.npc}, ingetin bon ${rupiah(debt.amount)} ya. Hari ini bisa lunas?”`}
          </button>
          <button type="button" disabled={busy} onClick={() => pickStep1("joke")}>
            {embedded
              ? "Bercanda dulu"
              : `“Buku utang udah kangen nih, yuk diberesin ${rupiah(debt.amount)}!”`}
          </button>
          <button
            type="button"
            className="warung-chat-risky"
            disabled={busy}
            onClick={() => pickStep1("harsh")}
          >
            {embedded
              ? "Tagih dengan tegas"
              : `“Woi bayar utang ${rupiah(debt.amount)} dong! Jangan kabur!”`}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="warung-chat-options" role="group" aria-label="Pilih jawaban lanjutan">
          <small>Pilih balasan lanjutan (hati-hati salah jawab):</small>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void finishWithTone(
                `Bisa kirim ke Kas Warung sekarang aja kok, biar nanti gampang kalau mau belanja lagi.`,
                "good",
                "",
              )
            }
          >
            {embedded
              ? "Minta bayar sekarang"
              : "“Kirim ke Kas Warung sekarang aja, biar nanti gampang kalau mau belanja lagi.”"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void finishWithTone(
                `Ya udah deh santai aja, bayarnya kapan-kapan sebisanya aja ya.`,
                "soft",
                `Wah makasih banget pengertiannya bos! Nanti agak sorean lagi ya aku bayarnya`,
              )
            }
          >
            {embedded
              ? "Boleh bayar nanti"
              : "“Ya udah santai aja, bayarnya kapan-kapan sebisanya aja.”"}
          </button>
          <button
            type="button"
            className="warung-chat-risky"
            disabled={busy}
            onClick={() =>
              void finishWithTone(
                `Banyak alasan! Kalau nggak bayar sekarang awas ya saya samperin!`,
                "harsh",
                `Dih galak amat! Yaudah tunggu aja kapan-kapan, males ah!`,
              )
            }
          >
            {embedded
              ? "Beri peringatan"
              : "“Banyak alasan! Kalau nggak bayar sekarang saya samperin!”"}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="warung-actions">
          {!paid && (
            <button type="button" className="warung-cta" onClick={() => trackDebtor(debt)}>
              {embedded ? "Cari di peta" : "Cari & Samperin di Jalan"}
            </button>
          )}
          <button type="button" className="warung-secondary" onClick={onBack}>
            {embedded ? "Kembali ke daftar" : "Tutup Chat"}
          </button>
        </div>
      )}
    </section>
  );
}

/** Dedicated ledger tab: Buku Utang (with interactive Chat collect + GPS street tracking) & Catatan Pengeluaran/Kas. */
export function Catatan({ section = "all" }: { section?: "all" | "ledger" | "debts" }) {
  const staffData = useStaff((s) => s.data);
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const [filter, setFilter] = useState<JournalFilter>("all");
  const [chatDebt, setChatDebt] = useState<WarungDebt | null>(null);
  const w = data?.warung;
  if (!data || !w) return <OpenForm />;

  if (chatDebt) {
    return <DebtChat debt={chatDebt} onBack={() => setChatDebt(null)} />;
  }

  const totalOut = data.journal
    .filter((j) => isCashMovement(j) && j.amount < 0)
    .reduce((a, j) => a + Math.abs(j.amount), 0);
  const totalIn = data.journal
    .filter((j) => isCashMovement(j) && j.amount > 0)
    .reduce((a, j) => a + j.amount, 0);

  return (
    <div className="warung-list">
      {section !== "ledger" && (
        <>
          <section className="warung-journal" aria-label="Buku utang pelanggan">
            <div className="warung-journal-head">
              <h4>Buku Utang Pelanggan ({data.debts.length})</h4>
            </div>
            {data.debts.length === 0 ? (
              <p className="warung-hint">
                Belum ada pelanggan yang berutang. Kalau ada warga ngutang, catatannya muncul di
                sini.
              </p>
            ) : (
              <ul className="warung-debt-list">
                {data.debts.map((d) => {
                  const spot = debtorSpot(d.id);
                  return (
                    <li key={d.id} className="warung-debt-item">
                      <div>
                        <strong>
                          {d.npc} · <b>{rupiah(d.amount)}</b>
                        </strong>
                        <small>
                          Jatuh tempo {formatDue(d.dueAt)} ·{" "}
                          {d.kind === "pinjam_uang"
                            ? "Pinjaman uang melalui Chat"
                            : `terlihat di ${spot.area}`}
                        </small>
                      </div>
                      <div className="warung-debt-actions">
                        <button
                          type="button"
                          className="warung-cta"
                          disabled={busy}
                          onClick={() =>
                            d.npcKey && d.kind === "pinjam_uang"
                              ? openNpcContact(d.npcKey)
                              : setChatDebt(d)
                          }
                        >
                          Tagih Chat
                        </button>
                        {d.kind !== "pinjam_uang" && (
                          <button
                            type="button"
                            className="warung-secondary"
                            onClick={() => trackDebtor(d)}
                          >
                            Cari
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <WarungDebtHistory debts={data.debtHistory ?? []} />
        </>
      )}

      {section !== "debts" && (
        <section className="warung-journal" aria-label="Catatan pengeluaran dan kas">
          <div className="warung-journal-head">
            <h4>Catatan Kas & Pengeluaran</h4>
            <JournalFilterPills filter={filter} onChange={setFilter} />
          </div>
          <div className="warung-ledger-summary">
            <span>
              Masuk: <b className="pos">+{rupiah(totalIn)}</b>
            </span>
            <span>
              Keluar (grosir, iuran RT, palak): <b className="neg">−{rupiah(totalOut)}</b>
            </span>
          </div>
          <JournalList filter={filter} />
        </section>
      )}
    </div>
  );
}

/** Focused management workspace; the active task owns the right pane. */
export function WarungPanel() {
  const requestedTab = useWarung((s) => s.panelTab);
  const [selectedTab, setTab] = useState<Tab>(() => (isTab(requestedTab) ? requestedTab : "home"));
  const [ledgerSection, setLedgerSection] = useState<"ledger" | "debts">("ledger");
  const bodyRef = useRef<HTMLDivElement>(null);
  const data = useWarung((s) => s.data);
  const error = useWarung((s) => s.error);
  const busy = useWarung((s) => s.busy);
  const ownsWarung = !!data?.warung;
  const tab = ownsWarung ? selectedTab : "home";
  const tabs = TABS.filter(({ id }) => ownsWarung || id === "home");
  const debtCount = data?.debts?.length ?? 0;
  useEffect(() => {
    if (isTab(requestedTab)) {
      setTab(requestedTab);
      useWarung.setState({ panelTab: null });
    }
  }, [requestedTab]);
  useEffect(() => {
    void warungCommand("read");
  }, []);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [tab, ledgerSection]);
  return (
    <div className="warung-panel warung-manager" data-warung-panel>
      <div className="warung-manager-layout">
        <nav className="warung-manager-nav" aria-label="Menu warung">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? "page" : undefined}
                aria-controls="warung-management-content"
                onClick={() => setTab(id)}
              >
                <Icon size={19} aria-hidden />
                <span>{label}</span>
                {id === "catatan" && debtCount > 0 && (
                  <b aria-label={`${debtCount} utang`}>{debtCount}</b>
                )}
                {active && <ChevronRight className="warung-nav-arrow" size={14} aria-hidden />}
              </button>
            );
          })}
          {tab === "kulakan" && (
            <button type="button" aria-current="page" onClick={() => setTab("kulakan")}>
              <Package size={19} aria-hidden />
              <span>Grosir</span>
            </button>
          )}
        </nav>
        <section
          className="warung-manager-content"
          id="warung-management-content"
          aria-label={TAB_TITLES[tab]}
        >
          {tab === "catatan" && (
            <div className="warung-manager-switch" role="group" aria-label="Jenis catatan">
              <button
                type="button"
                aria-pressed={ledgerSection === "ledger"}
                onClick={() => setLedgerSection("ledger")}
              >
                Transaksi
              </button>
              <button
                type="button"
                aria-pressed={ledgerSection === "debts"}
                onClick={() => setLedgerSection("debts")}
              >
                Utang pelanggan{debtCount > 0 ? ` (${debtCount})` : ""}
              </button>
            </div>
          )}
          {tab === "operasional" && data?.warung ? (
            <WarungOperations />
          ) : (
            <div ref={bodyRef} className="warung-manager-body" data-task={tab}>
              {error && (
                <p className="warung-error" role="alert">
                  {error}
                </p>
              )}
              {!data ? (
                error ? (
                  <button
                    type="button"
                    className="warung-secondary"
                    disabled={busy}
                    onClick={() => void warungCommand("read")}
                  >
                    Coba lagi
                  </button>
                ) : (
                  <p className="warung-hint" role="status">
                    Membuka warung…
                  </p>
                )
              ) : tab === "home" ? (
                <Home onTab={setTab} />
              ) : tab === "kulakan" ? (
                <Kulakan />
              ) : tab === "harga" ? (
                <Harga />
              ) : (
                <Catatan key={ledgerSection} section={ledgerSection} />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
