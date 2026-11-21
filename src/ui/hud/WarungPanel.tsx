import { useEffect, useState } from "react";
import { enterWarung, loadDirectory, useWarung, warungCommand } from "@/game/warung/store";
import { rupiah, type WarungCard, type WarungItem } from "@/game/warung/model";
import { useHud } from "@/state/hud-store";
import "./warung-panel.css";

type Tab = "home" | "kulakan" | "harga" | "mampir";
const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Warungku" },
  { id: "kulakan", label: "Kulakan" },
  { id: "harga", label: "Harga" },
  { id: "mampir", label: "Mampir" },
];

function OpenForm() {
  const [name, setName] = useState("");
  const busy = useWarung((s) => s.busy);
  return (
    <form
      className="warung-open"
      onSubmit={(e) => {
        e.preventDefault();
        void warungCommand("open", { name: name.trim() });
      }}
    >
      <h3>Buka warungmu sendiri</h3>
      <p>Mulai dari gerobak dengan modal Kas Rp50.000. Semua uang di sini hanya simulasi.</p>
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
      <button type="submit" className="warung-cta" disabled={busy || name.trim().length < 3}>
        Buka warung
      </button>
    </form>
  );
}

function Home() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const w = data?.warung;
  if (!w) return <OpenForm />;
  const stocked = w.stock.filter((s) => s.qty > 0).length;
  return (
    <div className="warung-home">
      <div className="warung-card">
        <div>
          <strong>{w.name}</strong>
          <span>
            Level {w.level} · {w.levelName}
          </span>
        </div>
        <dl>
          <div>
            <dt>Kas</dt>
            <dd>{rupiah(w.cash)}</dd>
          </div>
          <div>
            <dt>Total jualan</dt>
            <dd>{rupiah(w.totalSales)}</dd>
          </div>
          <div>
            <dt>Barang di rak</dt>
            <dd>{stocked} jenis</dd>
          </div>
        </dl>
      </div>
      {stocked === 0 && <p className="warung-hint">Rak masih kosong. Kulakan dulu di Toko Cung.</p>}
      <div className="warung-actions">
        <button
          type="button"
          className="warung-cta"
          disabled={busy}
          onClick={() => {
            useHud.getState().setSheet(null);
            void enterWarung(w.id);
          }}
        >
          Masuk warung
        </button>
        <button
          type="button"
          className="warung-secondary"
          disabled={busy || w.nextUpgradeCost === null || w.cash < (w.nextUpgradeCost ?? 0)}
          onClick={() => void warungCommand("upgrade")}
        >
          {w.nextUpgradeCost === null
            ? "Level tertinggi"
            : `Upgrade ke ${data.levels[String(w.level + 1)]?.name} · ${rupiah(w.nextUpgradeCost)}`}
        </button>
      </div>
      {data.journal.length > 0 && (
        <section className="warung-journal" aria-label="Buku kas">
          <h4>Buku kas</h4>
          <ul>
            {data.journal.map((j, i) => (
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
        </section>
      )}
    </div>
  );
}

const JOURNAL_LABEL: Record<string, string> = {
  MODAL_AWAL: "Modal awal",
  RESTOCK: "Kulakan",
  NPC_SALE: "Laku ke warga",
  SERVE: "Layani langsung",
  PLAYER_SALE: "Dibeli pemain",
  PLAYER_BUY: "Beli dari warung lain",
  UPGRADE: "Upgrade",
};
const itemName = (catalog: WarungItem[], id: string) =>
  catalog.find((i) => i.id === id)?.name ?? id;

function Kulakan() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const [qty, setQty] = useState(5);
  const w = data?.warung;
  if (!data || !w) return <OpenForm />;
  return (
    <div className="warung-list">
      <div className="warung-qty" role="group" aria-label="Jumlah kulakan">
        {[1, 5, 10].map((n) => (
          <button key={n} type="button" aria-pressed={qty === n} onClick={() => setQty(n)}>
            ×{n}
          </button>
        ))}
        <span>Kas {rupiah(w.cash)}</span>
      </div>
      {data.catalog.map((item) => {
        const have = w.stock.find((s) => s.itemId === item.id)?.qty ?? 0;
        const locked = item.level > w.level;
        const cost = item.wholesale * qty;
        return (
          <div key={item.id} className="warung-row" data-locked={locked || undefined}>
            <i style={{ background: item.color }} aria-hidden />
            <div>
              <strong>{item.name}</strong>
              <span>
                {locked
                  ? `Buka di level ${item.level}`
                  : `Grosir ${rupiah(item.wholesale)} · pasar ${rupiah(item.market)} · stok ${have}/${w.maxStock}`}
              </span>
            </div>
            <button
              type="button"
              className="warung-secondary"
              disabled={busy || locked || w.cash < cost || have + qty > w.maxStock}
              onClick={() => void warungCommand("restock", { itemId: item.id, qty })}
            >
              {rupiah(cost)}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Harga() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const w = data?.warung;
  if (!data || !w) return <OpenForm />;
  const rows = w.stock;
  if (!rows.length)
    return <p className="warung-hint">Kulakan barang dulu untuk mengatur harga jualnya.</p>;
  return (
    <div className="warung-list">
      <p className="warung-hint">
        Harga di atas harga pasar membuat pembeli jarang mampir. Di bawah pasar, makin laris.
      </p>
      {rows.map((s) => {
        const item = data.catalog.find((i) => i.id === s.itemId);
        if (!item) return null;
        const step = item.market >= 5000 ? 500 : 100;
        const set = (price: number) =>
          void warungCommand("price", {
            itemId: item.id,
            price: Math.max(item.wholesale, Math.min(item.market * 2, price)),
          });
        return (
          <div key={s.itemId} className="warung-row">
            <i style={{ background: item.color }} aria-hidden />
            <div>
              <strong>{item.name}</strong>
              <span>
                Pasar {rupiah(item.market)} · stok {s.qty}
              </span>
            </div>
            <div className="warung-stepper">
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
          </div>
        );
      })}
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

/** Phone app "Warungku": own shop, wholesale restock, prices and visiting other players. */
export function WarungPanel() {
  const [tab, setTab] = useState<Tab>("home");
  const data = useWarung((s) => s.data);
  const error = useWarung((s) => s.error);
  useEffect(() => {
    void warungCommand("read");
  }, []);
  return (
    <div className="warung-panel">
      <nav className="warung-tabs" role="tablist" aria-label="Menu warung">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {error && (
        <p className="warung-error" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p className="warung-hint">Membuka warung…</p>
      ) : tab === "home" ? (
        <Home />
      ) : tab === "kulakan" ? (
        <Kulakan />
      ) : tab === "harga" ? (
        <Harga />
      ) : (
        <Mampir />
      )}
    </div>
  );
}
