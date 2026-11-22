import { useEffect } from "react";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { lotFront } from "@/game/warung/lots";
import { rupiah } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { USAHA_LOTS, bahanOf, type UsahaKind, type UsahaSnapshot } from "@/game/usaha/model";
import {
  enterUsaha,
  exitUsaha,
  openUsahaPanel,
  resetUsahaRoom,
  usahaCommand,
  useUsaha,
} from "@/game/usaha/store";
import "./warung-panel.css";
import "./usaha-panel.css";

const PROMPT_RADIUS = 2.6;
const TITLE: Record<UsahaKind, string> = { warteg: "🍛 Warteg", kos: "🏠 Kos-kosan" };

function nearKind([px, , pz]: [number, number, number]): UsahaKind | null {
  for (const kind of ["warteg", "kos"] as const) {
    const lot = USAHA_LOTS[kind];
    if (!lot) continue;
    const [x, z] = lotFront(lot);
    if (Math.hypot(px - x, pz - z) < PROMPT_RADIUS) return kind;
  }
  return null;
}

function BuyCard({ kind, data }: { kind: UsahaKind; data: UsahaSnapshot }) {
  const busy = useUsaha((s) => s.busy);
  const price = kind === "warteg" ? data.catalog.wartegPrice : data.catalog.kosPrice;
  if (data.kas === null)
    return <p className="warung-hint">Buka warung dulu: Kas usaha disimpan di warungmu.</p>;
  return (
    <div className="warung-row">
      <div>
        <strong>Beli {kind === "warteg" ? "warteg" : "kos-kosan"}</strong>
        <span>
          Harga {rupiah(price)} · Kas usaha {rupiah(data.kas)}
        </span>
      </div>
      <button
        type="button"
        className="warung-cta"
        disabled={busy || data.kas < price}
        onClick={() => void usahaCommand("buy", { business: kind })}
      >
        Beli
      </button>
    </div>
  );
}

function WartegPanel({ data }: { data: UsahaSnapshot }) {
  const busy = useUsaha((s) => s.busy);
  const t = data.warteg;
  if (!t) return <BuyCard kind="warteg" data={data} />;
  const { resep, bahan, dailyPortionCap } = data.catalog;
  return (
    <>
      <p className="warung-hint">
        Dapur hari ini {t.cookedToday}/{dailyPortionCap} porsi · sisa porsi basi jam 00.00 WIB
      </p>
      <div className="warung-list">
        {resep.map((r) => {
          const m = t.menu.find((x) => x.recipeId === r.id);
          const price = m?.price ?? r.market;
          const need = Object.entries(r.bahan)
            .map(([id, n]) => `${n} ${bahan.find((b) => b.id === id)?.name ?? id}`)
            .join(", ");
          return (
            <div className="warung-row" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <span>
                  Sisa {m?.portions ?? 0} porsi · {rupiah(price)} (pasar {rupiah(r.market)})
                </span>
                <span>
                  Masak: {need} → {r.porsi} porsi
                </span>
              </div>
              <button
                type="button"
                className="warung-secondary"
                disabled={busy || price - 500 < r.market / 2}
                aria-label={`Turunkan harga ${r.name}`}
                onClick={() => void usahaCommand("harga", { recipeId: r.id, price: price - 500 })}
              >
                −
              </button>
              <button
                type="button"
                className="warung-secondary"
                disabled={busy || price + 500 > r.market * 2}
                aria-label={`Naikkan harga ${r.name}`}
                onClick={() => void usahaCommand("harga", { recipeId: r.id, price: price + 500 })}
              >
                +
              </button>
              <button
                type="button"
                className="warung-cta"
                disabled={busy}
                onClick={() => void usahaCommand("masak", { recipeId: r.id, qty: 1 })}
              >
                Masak
              </button>
            </div>
          );
        })}
      </div>
      <p className="warung-hint">Bahan di gudang (maks {data.catalog.maxBahan})</p>
      <div className="warung-list">
        {bahan.map((b) => (
          <div className="warung-row" key={b.id}>
            <div>
              <strong>{b.name}</strong>
              <span>
                Stok {bahanOf(data, b.id)} · {rupiah(b.cost)}/satuan
              </span>
            </div>
            <button
              type="button"
              className="warung-secondary"
              disabled={busy}
              onClick={() => void usahaCommand("belanja", { itemId: b.id, qty: 5 })}
            >
              Beli 5 ({rupiah(b.cost * 5)})
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function KosPanel({ data }: { data: UsahaSnapshot }) {
  const busy = useUsaha((s) => s.busy);
  const k = data.kos;
  if (!k) return <BuyCard kind="kos" data={data} />;
  const next = data.catalog.kosQuality[String(k.quality + 1)];
  const step = 50_000;
  return (
    <>
      {k.event && (
        <div className="warung-row" data-kos-event>
          <div>
            <strong>
              {k.event.kind === "telat"
                ? `${k.event.npc} telat bayar sewa`
                : `${k.event.npc} komplain kamar rusak`}
            </strong>
            <span>
              {k.event.kind === "telat"
                ? `Tertahan ${rupiah(k.event.amount)}. Tagih (reputasi turun) atau maafkan (reputasi naik).`
                : `Perbaikan ${rupiah(k.event.amount)}. Diabaikan: reputasi turun.`}
            </span>
          </div>
          <button
            type="button"
            className="warung-cta"
            disabled={busy}
            onClick={() => void usahaCommand("kos_event", { choice: "accept" })}
          >
            {k.event.kind === "telat" ? "Tagih" : "Perbaiki"}
          </button>
          <button
            type="button"
            className="warung-secondary"
            disabled={busy}
            onClick={() => void usahaCommand("kos_event", { choice: "decline" })}
          >
            {k.event.kind === "telat" ? "Maafkan" : "Abaikan"}
          </button>
        </div>
      )}
      <div className="warung-list">
        <div className="warung-row">
          <div>
            <strong>
              {k.qualityName} · {k.tenants}/{k.rooms} kamar terisi
            </strong>
            <span>
              Reputasi {k.reputation}/100 · sewa masuk tiap hari WIB (offline maks 3 hari)
            </span>
          </div>
        </div>
        <div className="warung-row">
          <div>
            <strong>Sewa {rupiah(k.rent)}/bulan</strong>
            <span>Pasar {rupiah(k.marketRent)} · lebih murah = cepat terisi</span>
          </div>
          <button
            type="button"
            className="warung-secondary"
            disabled={busy || k.rent - step < k.marketRent / 2}
            aria-label="Turunkan sewa"
            onClick={() => void usahaCommand("sewa", { rent: k.rent - step })}
          >
            −
          </button>
          <button
            type="button"
            className="warung-secondary"
            disabled={busy || k.rent + step > k.marketRent * 2}
            aria-label="Naikkan sewa"
            onClick={() => void usahaCommand("sewa", { rent: k.rent + step })}
          >
            +
          </button>
        </div>
        <div className="warung-row">
          <div>
            <strong>Tambah kamar</strong>
            <span>
              {rupiah(data.catalog.roomCost)} · maks {data.catalog.maxRooms}
            </span>
          </div>
          <button
            type="button"
            className="warung-secondary"
            disabled={busy || k.rooms >= data.catalog.maxRooms}
            onClick={() => void usahaCommand("kamar")}
          >
            Bangun
          </button>
        </div>
        {next && (
          <div className="warung-row">
            <div>
              <strong>Renovasi: {next.name}</strong>
              <span>
                {rupiah(next.cost)} · sewa pasar {rupiah(next.market_rent)}/bulan
              </span>
            </div>
            <button
              type="button"
              className="warung-secondary"
              disabled={busy}
              onClick={() => void usahaCommand("renovasi")}
            >
              Renovasi
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function UsahaPanel({ kind }: { kind: UsahaKind }) {
  const data = useUsaha((s) => s.data);
  const error = useUsaha((s) => s.error);
  return (
    <GameModal
      title={TITLE[kind]}
      className="game-warung-sheet"
      bodyClassName="game-scroll-flush"
      onClose={() => useUsaha.setState({ panel: null })}
    >
      <div className="warung-panel" data-usaha-panel={kind}>
        <div className="warung-panel-intro">
          <p>Simulasi usaha — Kas usaha bukan uang asli.</p>
        </div>
        <div className="warung-panel-body">
          {error && (
            <p className="warung-error" role="alert">
              {error}
            </p>
          )}
          {!data ? (
            <p className="warung-hint">Memuat…</p>
          ) : kind === "warteg" ? (
            <WartegPanel data={data} />
          ) : (
            <KosPanel data={data} />
          )}
        </div>
      </div>
    </GameModal>
  );
}

/** "Layani langsung": serve one portion of a random cooked dish (server checks cooldown + cap). */
function serveOne() {
  const menu = useUsaha.getState().data?.warteg?.menu.filter((m) => m.portions > 0) ?? [];
  const pick = menu[Math.floor(Math.random() * menu.length)];
  if (!pick) {
    useGame.getState().setToast("Belum ada porsi. Masak dulu.");
    return;
  }
  void usahaCommand("layani", { recipeId: pick.recipeId, qty: 1 });
}

/** City prompt at the two lots, in-room bar, and the management panel. */
export function UsahaHud() {
  const room = useChannels((s) => s.lease?.channel);
  const inside = useUsaha((s) => s.inside);
  const panel = useUsaha((s) => s.panel);
  const busy = useUsaha((s) => s.busy);
  const owned = useUsaha((s) => s.data);
  const hasWarung = useWarung((s) => !!s.data?.warung);
  const inWarung = useWarung((s) => !!s.inside);
  const sheet = useHud((h) => h.sheet);
  const near = useGame((g) => nearKind(g.playerPos));

  useEffect(() => {
    if (room && hasWarung) void usahaCommand("read");
    return resetUsahaRoom;
  }, [room, hasWarung]);

  return (
    <>
      {panel && <UsahaPanel kind={panel} />}
      {!sheet && !panel && inside && (
        <div className="warung-world-prompt pointer-events-auto" data-usaha-hud={inside}>
          <div className="warung-hud-bar">
            <div>
              <strong>{TITLE[inside]}</strong>
              <span>
                {!owned?.[inside]
                  ? "Lihat-lihat · dijual, beli pakai Kas usaha"
                  : `Kas usaha ${owned.kas != null ? rupiah(owned.kas) : "…"}${
                      inside === "kos" && owned.kos
                        ? ` · ${owned.kos.tenants}/${owned.kos.rooms} terisi`
                        : ""
                    }`}
              </span>
            </div>
            {inside === "warteg" && owned?.[inside] && (
              <button type="button" className="warung-cta" disabled={busy} onClick={serveOne}>
                Layani
              </button>
            )}
            <button
              type="button"
              className={owned?.[inside] ? "warung-secondary" : "warung-cta"}
              onClick={() => openUsahaPanel(inside)}
            >
              {owned?.[inside] ? "Kelola" : "Beli"}
            </button>
            <button type="button" className="warung-hud-exit" onClick={exitUsaha}>
              Keluar
            </button>
          </div>
        </div>
      )}
      {!sheet && !panel && !inside && !inWarung && near && (
        <div className="warung-world-prompt pointer-events-auto" data-usaha-prompt={near}>
          <div className="warung-hud-bar">
            <div>
              <strong>{TITLE[near]}</strong>
              <span>{owned?.[near] ? "Usaha milikmu" : "Dijual — beli pakai Kas usaha"}</span>
            </div>
            {owned?.[near] ? (
              <button type="button" className="warung-cta" onClick={() => enterUsaha(near)}>
                Masuk
              </button>
            ) : (
              <>
                <button type="button" className="warung-secondary" onClick={() => enterUsaha(near)}>
                  Lihat dalam
                </button>
                <button type="button" className="warung-cta" onClick={() => openUsahaPanel(near)}>
                  Beli
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
