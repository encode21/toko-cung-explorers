import { useEffect, useRef, useState } from "react";
import {
  Store,
  Package,
  Paintbrush,
  Settings2,
  NotebookPen,
  Users,
  ChevronRight,
  Share2,
} from "lucide-react";
import { SHELVES } from "@/game/world/layout";
import {
  addToBasket,
  atTokoCung,
  clearRecommendedRestock,
  collectDebt,
  enterWarung,
  exitWarungToTokoCung,
  loadDirectory,
  loadLeaderboard,
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
  debtorSpot,
  rupiah,
  rupiahShort,
  stockAlerts,
  type LeaderboardRow,
  type WarungCard,
  type WarungDebt,
  type WarungItem,
} from "@/game/warung/model";
import { ProductArt } from "@/game/warung/ProductArt";
import { ShareResultModal } from "./ShareResultCard";
import { StoryCard } from "./WarungLifeCards";
import { WarungOperations } from "./WarungOperations";
import { WarungLotPicker } from "./WarungLotPicker";
import { WarungDecorTab } from "./WarungDecorTab";
import { WarungDebtHistory } from "./WarungDebtHistory";
import { DeliveryPrompt } from "./KulakanDelivery";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useNet } from "@/net/net-store";
import { connectionId } from "@/net/channel-store";
import { KIOSK } from "@/game/interactions/kiosk";
import { kioskLine, leaveKioskQueue, useKioskQueue } from "@/game/warung/kiosk-queue";
import "./warung-panel.css";
import "./warung-management.css";

type Tab = "home" | "kulakan" | "dekor" | "harga" | "operasional" | "catatan" | "mampir" | "juara";
const TABS = [
  { id: "home", label: "Ringkasan", icon: Store },
  { id: "harga", label: "Stok & harga", icon: Package },
  { id: "dekor", label: "Dekorasi", icon: Paintbrush },
  { id: "operasional", label: "Operasional", icon: Settings2 },
  { id: "catatan", label: "Catatan kas", icon: NotebookPen },
  { id: "mampir", label: "Komunitas", icon: Users },
] as const;
const TAB_TITLES: Record<Tab, string> = {
  home: "Warungmu hari ini",
  harga: "Stok & harga",
  dekor: "Dekorasi warung",
  operasional: "Operasional warung",
  catatan: "Catatan kas",
  mampir: "Komunitas",
  juara: "Komunitas",
  kulakan: "Grosir Toko Cung",
};
const isTab = (value: string | null): value is Tab =>
  value !== null && Object.hasOwn(TAB_TITLES, value);

export const JOURNAL_LABEL: Record<string, string> = {
  MODAL_AWAL: "Modal awal",
  RESTOCK: "Grosir",
  NPC_SALE: "Laku ke warga",
  SERVE: "Layani langsung",
  PLAYER_SALE: "Dibeli pemain",
  PLAYER_BUY: "Beli dari warung lain",
  WORK_SALE: "Dilayani part-time",
  WAGE: "Upah part-time",
  OJOL: "Orderan ojol",
  UTANG_LUNAS: "Utang dilunasi",
  IURAN: "Iuran Pak RT",
  PALAK: "Uang palak / preman",
  SULTAN: "💎 Rezeki Sultan",
  THEFT: "🚨 Kemalingan",
  UPGRADE: "Upgrade warung",
  SEWA: "🧧 Sewa Koko Cung",
  CERITA: "📖 Hadiah cerita",
  LOT: "🏡 Beli kavling",
  DEKOR: "🎨 Dekor warung",
  LOGIN: "🎁 Kas harian",
  MOTOR: "🛵 Beli motor",
  KIRIM: "🚚 Ongkir grosir",
};
const itemName = (catalog: WarungItem[], id: string) => {
  const item = catalog.find((i) => i.id === id);
  // Grosir units read as such: "Mi Goreng (dus)".
  return item ? `${item.name}${item.uom && item.uom !== "pcs" ? ` (${item.uom})` : ""}` : id;
};

function OpenForm() {
  const [name, setName] = useState("");
  const [lot, setLot] = useState<number | null>(() => useWarung.getState().openLot);
  const busy = useWarung((s) => s.busy);
  const savings = useWarung((s) => s.data?.savings ?? 0);
  const lots = useWarung((s) => s.data?.lotMarket);
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
        Mulai dari gerobak dengan modal Kas Rp50.000
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
      {lots && (
        <>
          <p className="warung-hint">
            Pilih kavling. Makin dekat Toko Cung makin mahal dan butuh level lebih tinggi — kavling
            pinggir gratis untuk mulai. Tanpa pilihan, kamu dapat kavling pinggir.
          </p>
          <WarungLotPicker
            lots={lots}
            cash={50000 + savings}
            selected={lot}
            busy={busy}
            actionLabel={(l) => (lot === l.lot ? "✓ Dipilih" : "Pilih")}
            onPick={(l) => setLot(lot === l.lot ? null : l.lot)}
          />
        </>
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
      </dl>
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
            <strong>{data.rent.sealed ? "Warung disegel" : "Sewa belum lunas"}</strong>
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
            if (!inside || inside.id !== w.id) void enterWarung(w.id);
          }}
        >
          {inside?.id === w.id ? "Kembali melayani" : "Masuk warung"}
        </button>
        <button type="button" className="warung-secondary" onClick={() => onTab("harga")}>
          Atur stok & harga
        </button>
      </div>
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
            <span>⭐ {rec.customerName} menunggu pesanan:</span>
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
        <strong>🧾 Antri kiosk · urutan ke-{myPlace + 1}</strong>
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
    return { req, item, have, need, cost: (item?.wholesale ?? 0) * need };
  });
  const recTotalCost = recRows.reduce((a, r) => a + r.cost, 0);
  const recNeedsAny = recRows.some((r) => r.need > 0);
  const shelfItems = shelf && !app ? SHELF_ITEMS[shelf] : undefined;
  const orderedCatalog = data.catalog
    .filter((i) => !shelfItems || shelfItems.includes(i.id) || i.shelf === shelf)
    .sort((a, b) => Number(recMap.has(b.id)) - Number(recMap.has(a.id)));
  const inBasket = (id: string) => basket.find((l) => l.itemId === id)?.qty ?? 0;
  const wholesale = (id: string) => data.catalog.find((c) => c.id === id)?.wholesale ?? 0;
  const basketTotal = basket.reduce((a, l) => a + wholesale(l.itemId) * l.qty, 0);

  return (
    <div className="warung-list">
      {rec && recRows.length > 0 && (
        <section className="warung-rec-box" aria-label="Rekomendasi pesanan pembeli">
          <header className="warung-rec-head">
            <div>
              <strong>⭐ Pesanan {rec.customerName}</strong>
              <span>Pembeli sedang menunggu di warungmu</span>
            </div>
            <button
              type="button"
              className="warung-rec-dismiss"
              aria-label="Tutup rekomendasi"
              onClick={clearRecommendedRestock}
            >
              ✕
            </button>
          </header>
          <ul className="warung-rec-items">
            {recRows.map(({ req, item, need }) => (
              <li key={req.itemId} data-done={need === 0 || undefined}>
                <ProductArt id={req.itemId} size={26} />
                <span>{item?.name ?? req.itemId}</span>
                <b>{need === 0 ? "✓ Siap" : `Butuh ×${need}`}</b>
              </li>
            ))}
          </ul>
          {recNeedsAny ? (
            <button
              type="button"
              className="warung-cta"
              disabled={busy || w.cash < recTotalCost + basketTotal}
              onClick={() => void restockRecommended()}
            >
              {w.cash < recTotalCost + basketTotal
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
                void enterWarung(w.id);
              }}
            >
              Masuk Warung & Layani {rec.customerName}
            </button>
          )}
        </section>
      )}
      {shelf && (
        <div className="warung-card-head">
          <strong>🛒 {SHELVES.find((z) => z.id === shelf)?.label ?? "Rak"}</strong>
          <button
            type="button"
            className="warung-secondary"
            onClick={() => useWarung.setState({ shelfFilter: null })}
          >
            Semua barang
          </button>
        </div>
      )}
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
          const cost = item.wholesale * qty;
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
              {wantedQty && <span className="warung-rec-badge">⭐ Dipesan ×{wantedQty}</span>}
              <ProductArt id={item.id} size={46} />
              <strong>{item.name}</strong>
              <p className="warung-product-price">
                {rupiah(item.wholesale)}
                <small>/pcs</small>
              </p>
              <span className="warung-product-meta">Jual pasar ±{rupiah(item.market)}</span>
              <div className="warung-meter" aria-label={`Stok ${have} dari ${w.maxStock}`}>
                <span style={{ width: `${(have / w.maxStock) * 100}%` }} />
              </div>
              <small>
                {locked
                  ? `Terbuka di Lv.${item.level}`
                  : `Stok ${have}/${w.maxStock}${picked ? ` · 🧺 ${picked}` : ""}`}
              </small>
              <button
                type="button"
                className="warung-cta"
                disabled={busy || locked || w.cash < basketTotal + cost || full}
                onClick={() => addToBasket(item.id, qty)}
              >
                {locked
                  ? "Terkunci"
                  : full
                    ? "Rak penuh"
                    : w.cash < basketTotal + cost
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
            <strong>🧺 Keranjang</strong>
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
              disabled={busy || w.cash < basketTotal + deliveryFee(basketTotal)}
              onClick={() => void payBasket("antar")}
            >
              🚚 Pesan & antar · {rupiah(basketTotal + deliveryFee(basketTotal))}
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
  return chance >= 0.6
    ? { label: "Laris", tone: "good" }
    : chance >= 0.3
      ? { label: "Normal", tone: "ok" }
      : { label: "Sepi", tone: "bad" };
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
        Harga di bawah/pas pasar bikin laris (+bonus 10% saat layani langsung).
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
                  Untung <b>{rupiah(s.price - item.wholesale)}</b> · Pasar {rupiah(item.market)} ·
                  Stok {s.qty}
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
          + Grosir di Toko Cung App
        </button>
      </div>
    </div>
  );
}

interface ChatMsg {
  from: "npc" | "me" | "sys";
  text: string;
}

/** Interactive 2-step branching debt-collection chat with selectable reply bubbles. */
export function DebtChat({ debt, onBack }: { debt: WarungDebt; onBack: () => void }) {
  const busy = useWarung((s) => s.busy);
  const spot = debtorSpot(debt.id);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paid, setPaid] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      from: "npc",
      text: `Eh halo bos warung! Maaf baru bales ya 😅 lagi repot banget nih… ada apa?`,
    },
  ]);

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
          text: `Oke siap bos! Ini langsung aku transfer ke Kas Warung ya (${rupiah(news.amount)}). Makasih udah sabar! 🙏`,
        },
        { from: "sys", text: `✅ Utang lunas +${rupiah(news.amount)} masuk Kas Warung.` },
      ]);
    } else if (news?.kind === "debt_extended_chat") {
      setMessages((m) => [
        ...m,
        { from: "npc", text: npcFallback },
        {
          from: "sys",
          text: `⏳ Salah pendekatan! ${debt.npc} mengulur waktu bayar +${news.extendMinutes ?? 15} menit.`,
        },
      ]);
    } else {
      setMessages((m) => [
        ...m,
        {
          from: "npc",
          text: `Aduh maaf banget bos, dompet ketinggalan di rumah… nanti agak sorean aku mampir ya 😅`,
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
        `Ih kok ngegas gitu sih?! Lagi pusing malah dimarahin, tunggu aja kapan-kapan! 😤`,
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
          text: `Buku utang warung udah kangen sama nama ${debt.npc} nih 😄 yuk diberesin ${rupiah(debt.amount)}`,
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
      <header className="warung-chat-head">
        <button type="button" className="warung-reset-link" onClick={onBack}>
          ← Kembali
        </button>
        <div>
          <strong>💬 {debt.npc}</strong>
          <small>
            Utang {rupiah(debt.amount)} · {spot.area}
          </small>
        </div>
      </header>

      <div className="warung-chat-log">
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
            😊 “Halo {debt.npc}, ingetin bon {rupiah(debt.amount)} ya. Hari ini bisa lunas?”
          </button>
          <button type="button" disabled={busy} onClick={() => pickStep1("joke")}>
            😄 “Buku utang udah kangen nih, yuk diberesin {rupiah(debt.amount)}!”
          </button>
          <button
            type="button"
            className="warung-chat-risky"
            disabled={busy}
            onClick={() => pickStep1("harsh")}
          >
            😠 “Woi bayar utang {rupiah(debt.amount)} dong! Jangan kabur!”
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
            👍 “Kirim ke Kas Warung sekarang aja, biar nanti gampang kalau mau belanja lagi.”
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void finishWithTone(
                `Ya udah deh santai aja, bayarnya kapan-kapan sebisanya aja ya.`,
                "soft",
                `Wah makasih banget pengertiannya bos! Nanti agak sorean lagi ya aku bayarnya 🙏`,
              )
            }
          >
            😅 “Ya udah santai aja, bayarnya kapan-kapan sebisanya aja.”
          </button>
          <button
            type="button"
            className="warung-chat-risky"
            disabled={busy}
            onClick={() =>
              void finishWithTone(
                `Banyak alasan! Kalau nggak bayar sekarang awas ya saya samperin!`,
                "harsh",
                `Dih galak amat! Yaudah tunggu aja kapan-kapan, males ah! 😤`,
              )
            }
          >
            😡 “Banyak alasan! Kalau nggak bayar sekarang saya samperin!”
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="warung-actions">
          {!paid && (
            <button type="button" className="warung-cta" onClick={() => trackDebtor(debt)}>
              📍 Cari & Samperin di Jalan
            </button>
          )}
          <button type="button" className="warung-secondary" onClick={onBack}>
            Tutup Chat
          </button>
        </div>
      )}
    </section>
  );
}

/** Dedicated ledger tab: Buku Utang (with interactive Chat collect + GPS street tracking) & Catatan Pengeluaran/Kas. */
export function Catatan({ section = "all" }: { section?: "all" | "ledger" | "debts" }) {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const [filter, setFilter] = useState<"all" | "out" | "in">("all");
  const [chatDebt, setChatDebt] = useState<WarungDebt | null>(null);
  const w = data?.warung;
  if (!data || !w) return <OpenForm />;

  if (chatDebt) {
    return <DebtChat debt={chatDebt} onBack={() => setChatDebt(null)} />;
  }

  const entries = data.journal.filter((j) =>
    filter === "out" ? j.amount < 0 : filter === "in" ? j.amount > 0 : true,
  );
  const totalOut = data.journal
    .filter((j) => j.amount < 0)
    .reduce((a, j) => a + Math.abs(j.amount), 0);
  const totalIn = data.journal.filter((j) => j.amount > 0).reduce((a, j) => a + j.amount, 0);

  return (
    <div className="warung-list">
      {section !== "ledger" && (
        <>
          <section className="warung-journal" aria-label="Buku utang pelanggan">
            <div className="warung-journal-head">
              <h4>💸 Buku Utang Pelanggan ({data.debts.length})</h4>
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
                        <small>📍 Terlihat di {spot.area}</small>
                      </div>
                      <div className="warung-debt-actions">
                        <button
                          type="button"
                          className="warung-cta"
                          disabled={busy}
                          onClick={() => setChatDebt(d)}
                        >
                          💬 Tagih Chat
                        </button>
                        <button
                          type="button"
                          className="warung-secondary"
                          onClick={() => trackDebtor(d)}
                        >
                          📍 Cari
                        </button>
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
            <h4>📒 Catatan Kas & Pengeluaran</h4>
            <div className="warung-filter-pills" role="group" aria-label="Filter catatan">
              {(
                [
                  ["all", "Semua"],
                  ["out", "Pengeluaran"],
                  ["in", "Pemasukan"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="warung-ledger-summary">
            <span>
              Masuk: <b className="pos">+{rupiah(totalIn)}</b>
            </span>
            <span>
              Keluar (grosir, iuran RT, palak): <b className="neg">−{rupiah(totalOut)}</b>
            </span>
          </div>
          {entries.length === 0 ? (
            <p className="warung-hint">Belum ada catatan untuk filter ini.</p>
          ) : (
            <ul>
              {entries.map((j, i) => (
                <li key={i}>
                  <span>
                    {JOURNAL_LABEL[j.type] ?? j.type}
                    {j.itemId ? ` · ${itemName(data.catalog, j.itemId)} ×${j.qty}` : ""}
                  </span>
                  <b data-negative={j.amount < 0 || undefined}>
                    {j.amount < 0 ? "−" : "+"}
                    {rupiah(Math.abs(j.amount))}
                  </b>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function CardRow({ w }: { w: WarungCard }) {
  const busy = useWarung((s) => s.busy);
  return (
    <div className="warung-row">
      <i className="warung-badge" aria-hidden>
        {w.level}
      </i>
      <div>
        <strong>{w.name}</strong>
        <span>
          {w.ownerName ?? "Pemain"} · {w.levelName}
          {w.online ? " · online" : ""}
          {w.hiring ? " · lowongan" : ""}
        </span>
      </div>
      <button
        type="button"
        className="warung-secondary"
        disabled={busy}
        onClick={() => {
          useHud.getState().setSheet(null);
          void enterWarung(w.id);
        }}
      >
        Mampir
      </button>
    </div>
  );
}

function Mampir() {
  const directory = useWarung((s) => s.directory);
  useEffect(() => {
    void loadDirectory();
  }, []);
  if (!directory) return <p className="warung-hint">Memuat daftar warung…</p>;
  const mine = directory.mineId;
  const top = directory.top.filter((w) => w.id !== mine);
  return (
    <div className="warung-list">
      <h4>Teman online di channel ini</h4>
      {directory.online.length ? (
        directory.online.map((w) => <CardRow key={w.id} w={w} />)
      ) : (
        <p className="warung-hint">Belum ada pemain lain di channel ini yang punya warung.</p>
      )}
      <h4>Warung terlaris</h4>
      {top.length ? (
        top.map((w) => <CardRow key={w.id} w={w} />)
      ) : (
        <p className="warung-hint">Belum ada warung lain.</p>
      )}
    </div>
  );
}

function Juara() {
  const board = useWarung((s) => s.leaderboard);
  useEffect(() => {
    void loadLeaderboard();
  }, []);
  if (!board) return <p className="warung-hint">Memuat papan juara…</p>;
  const row = (r: LeaderboardRow, mine = false) => (
    <div
      key={`${mine ? "me" : "top"}-${r.id}`}
      className="warung-rank"
      data-mine={mine || undefined}
    >
      <b className="warung-rank-no" data-podium={r.rank <= 3 ? r.rank : undefined}>
        {r.rank}
      </b>
      <div>
        <strong>{r.name}</strong>
        <span>
          {r.ownerName ?? "Pemain"} · {r.levelName}
        </span>
      </div>
      <div className="warung-rank-total">
        <strong>{rupiah(r.total)}</strong>
        <span>
          NPC {rupiahShort(r.npc)} · Pemain {rupiahShort(r.player)}
        </span>
      </div>
    </div>
  );
  return (
    <div className="warung-list">
      <p className="warung-hint">
        Omzet minggu ini (sejak Senin 00.00 WIB), gabungan pembeli NPC dan pemain. Papan juga ada di
        Alun-alun Cung.
      </p>
      {board.top.length ? (
        board.top.map((r) => row(r))
      ) : (
        <p className="warung-hint">Belum ada penjualan minggu ini.</p>
      )}
      {board.me && !board.top.some((r) => r.id === board.me!.id) && (
        <>
          <h4>Warungmu</h4>
          {row(board.me, true)}
        </>
      )}
    </div>
  );
}

/** Focused management workspace; the active task owns the right pane. */
export function WarungPanel() {
  const requestedTab = useWarung((s) => s.panelTab);
  const [tab, setTab] = useState<Tab>(() => (isTab(requestedTab) ? requestedTab : "home"));
  const [ledgerSection, setLedgerSection] = useState<"ledger" | "debts">("ledger");
  const bodyRef = useRef<HTMLDivElement>(null);
  const data = useWarung((s) => s.data);
  const error = useWarung((s) => s.error);
  const busy = useWarung((s) => s.busy);
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
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id || (id === "mampir" && tab === "juara");
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
          {(tab === "mampir" || tab === "juara") && (
            <div className="warung-manager-switch" role="group" aria-label="Komunitas warung">
              <button
                type="button"
                aria-pressed={tab === "mampir"}
                onClick={() => setTab("mampir")}
              >
                Kunjungi warung
              </button>
              <button type="button" aria-pressed={tab === "juara"} onClick={() => setTab("juara")}>
                Papan juara
              </button>
            </div>
          )}
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
            ) : !data.warung && (tab === "dekor" || tab === "operasional") ? (
              <OpenForm />
            ) : tab === "home" ? (
              <Home onTab={setTab} />
            ) : tab === "kulakan" ? (
              <Kulakan />
            ) : tab === "dekor" ? (
              <WarungDecorTab />
            ) : tab === "harga" ? (
              <Harga />
            ) : tab === "operasional" ? (
              <WarungOperations />
            ) : tab === "catatan" ? (
              <Catatan key={ledgerSection} section={ledgerSection} />
            ) : tab === "mampir" ? (
              <Mampir />
            ) : (
              <Juara />
            )}
          </div>
        </section>
      </div>
      <p className="warung-manager-footnote">Kas Warung adalah uang simulasi dalam game.</p>
    </div>
  );
}
