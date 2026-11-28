import * as Tabs from "@radix-ui/react-tabs";
import { Fragment, useState, type CSSProperties } from "react";
import {
  BookOpen,
  ChevronRight,
  Clock3,
  Coins,
  Hammer,
  MessageCircle,
  Package,
  Share2,
  Star,
  Store,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { visitGangShop } from "@/game/gang/store";
import {
  renovationMinutesLeft,
  REVIEW_TEXT,
  rupiah,
  stockAlerts,
  type MyWarung,
  type WarungRating,
  type WarungSnapshot,
} from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { useHud } from "@/state/hud-store";
import { PhoneAppArtwork } from "./PhoneAppArtwork";
import { ShareResultModal } from "./ShareResultCard";
import { StoryCard } from "./WarungLifeCards";
import { WarungRenovationConfirm } from "./WarungRenovationConfirm";
import { RenovationMeanwhile } from "./WarungUpgradeSection";
import { isBurning } from "@/game/warung/disaster-alert";
import "./disaster-alert.css";

interface OverviewProps {
  snapshot: WarungSnapshot;
  warung: MyWarung;
  onStock: () => void;
  onOperations: () => void;
}

const homeTabs = [
  { id: "summary", label: "Ringkasan", Icon: Store },
  { id: "reviews", label: "Ulasan", Icon: Star },
  { id: "life", label: "Kehidupan Warung", Icon: BookOpen },
] as const;

export function WarungHome(props: OverviewProps) {
  const { snapshot, warung } = props;
  return (
    <Tabs.Root className="warung-home-tabs" defaultValue="summary">
      <Tabs.List className="warung-home-tablist" aria-label="Ringkasan Warungku">
        {homeTabs.map(({ id, label, Icon }) => (
          <Tabs.Trigger key={id} value={id}>
            <Icon aria-hidden />
            <span>{label}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content className="warung-manager-body warung-home-tab-content" value="summary">
        <WarungOverview {...props} />
      </Tabs.Content>
      <Tabs.Content className="warung-manager-body warung-home-tab-content" value="reviews">
        <WarungReviews rating={warung.rating} />
      </Tabs.Content>
      <Tabs.Content className="warung-manager-body warung-home-tab-content" value="life">
        <WarungLife snapshot={snapshot} warung={warung} />
      </Tabs.Content>
    </Tabs.Root>
  );
}

function WarungOverview({ snapshot, warung, onStock, onOperations }: OverviewProps) {
  const busy = useWarung((s) => s.busy);
  const inside = useWarung((s) => s.inside?.id === warung.id);
  const [sharing, setSharing] = useState(false);
  const { rent } = snapshot;
  const stocked = warung.stock.filter((item) => item.qty > 0).length;
  const { empty, low } = stockAlerts(warung.stock, warung.maxStock);
  const stockNotices = [
    { status: "empty", label: "Habis", ids: empty },
    { status: "low", label: "Menipis", ids: low },
  ].filter(({ ids }) => ids.length > 0);
  const catalogNames = new Map(snapshot.catalog.map(({ id, name }) => [id, name]));
  const status = warung.damage
    ? warung.damage.status === "repairing"
      ? "Diperbaiki"
      : "Rusak"
    : warung.renovation
      ? "Renovasi"
      : rent?.sealed
        ? "Disegel"
        : warung.isOpen
          ? "Buka"
          : "Tutup";
  const statusTone = status === "Buka" ? "open" : status === "Tutup" ? "closed" : "warning";
  const hh = (hour: number) => `${String(hour).padStart(2, "0")}.00`;

  return (
    <div className="warung-overview">
      <div className="warung-overview-identity">
        <span className="warung-overview-art">
          <PhoneAppArtwork kind="warung" />
        </span>
        <div className="warung-overview-heading">
          <h3>{warung.name}</h3>
          <div className="warung-overview-meta">
            <span className="warung-overview-level">
              Lv. {warung.level} · {warung.levelName}
            </span>
            <span className="warung-overview-status" data-status={statusTone}>
              {status}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="warung-cta warung-overview-enter"
          disabled={busy}
          onClick={() => {
            useHud.getState().setSheet(null);
            if (!inside) void visitGangShop(warung.id);
          }}
        >
          {inside ? "Kembali melayani" : "Masuk warung"}
        </button>
        <button
          type="button"
          className="warung-share"
          aria-label="Bagikan warung"
          onClick={() => setSharing(true)}
        >
          <Share2 size={16} aria-hidden />
        </button>
      </div>

      {warung.damage && (
        <WarungDamageNotice warung={warung} catalog={snapshot.catalog} busy={busy} />
      )}

      <dl className="warung-overview-facts">
        <div className="warung-overview-fact">
          <Package aria-hidden />
          <div>
            <dt>Barang di rak</dt>
            <dd>{stocked} jenis</dd>
          </div>
        </div>
        <div className="warung-overview-fact">
          <Coins aria-hidden />
          <div>
            <dt>Total penjualan</dt>
            <dd>{rupiah(warung.totalSales)}</dd>
          </div>
        </div>
        <div className="warung-overview-fact">
          <Clock3 aria-hidden />
          <div>
            <dt>Jadwal buka</dt>
            <dd>
              {warung.openHour === warung.closeHour
                ? "24 jam"
                : `${hh(warung.openHour)}–${hh(warung.closeHour)}`}
            </dd>
          </div>
        </div>
      </dl>

      {(stocked === 0 || stockNotices.length > 0) && (
        <div className="warung-overview-notice">
          <TriangleAlert size={19} aria-hidden />
          {stockNotices.length > 0 ? (
            <dl className="warung-overview-stock-list">
              {stockNotices.map(({ status, label, ids }) => (
                <Fragment key={status}>
                  <dt data-status={status}>{label}</dt>
                  <dd>{ids.map((id) => catalogNames.get(id) ?? id).join(", ")}</dd>
                </Fragment>
              ))}
            </dl>
          ) : (
            <div className="warung-overview-stock-empty">
              <strong>Rak masih kosong</strong>
              <p>Isi rak supaya warung bisa mulai jualan.</p>
            </div>
          )}
          <button
            type="button"
            className="warung-secondary"
            onClick={() => useHud.getState().setSheet("tokocung")}
          >
            Grosir
            <ChevronRight size={14} aria-hidden />
          </button>
        </div>
      )}

      {rent && rent.owedDays > 0 && (
        <button type="button" className="warung-overview-link" onClick={onOperations}>
          <span>
            <strong>
              {rent.sealed
                ? (rent.text?.["sealed"] ?? "Warung disegel")
                : (rent.text?.["due"] ?? "Sewa belum lunas")}
            </strong>
            <small>Tagihan {rupiah(rent.owed)}</small>
          </span>
          <ChevronRight size={18} aria-hidden />
        </button>
      )}

      {sharing && <ShareResultModal onClose={() => setSharing(false)} />}
    </div>
  );
}

function WarungDamageNotice({
  warung: w,
  catalog,
  busy,
}: {
  warung: MyWarung;
  catalog: WarungSnapshot["catalog"];
  busy: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!w.damage) return null;
  return (
    <section
      className={`warung-card warung-damage${isBurning(w.damage) ? " disaster-fire" : ""}`}
      aria-label="Kerusakan warung"
    >
      <div className="warung-card-head">
        <strong>Warung terkena {w.damage.name}</strong>
        <span className="warung-level-pill">
          {w.damage.status === "repairing" ? "Diperbaiki" : "Rusak"}
        </span>
      </div>
      <p className="warung-hint">{w.damage.text}</p>
      <p className="warung-hint">
        {Object.keys(w.damage.stockLost).length
          ? `Stok rusak: ${Object.entries(w.damage.stockLost)
              .map(([id, qty]) => `${catalog.find((item) => item.id === id)?.name ?? id} ×${qty}`)
              .join(", ")}.`
          : "Stok aman. Bangunan tetap harus diperbaiki sebelum berjualan."}
      </p>
      <dl className="warung-damage-costs">
        <div>
          <dt>Biaya penuh</dt>
          <dd>{rupiah(w.damage.repairCost)}</dd>
        </div>
        <div>
          <dt>Subsidi Walikota ({w.damage.subsidyPercent}%)</dt>
          <dd>−{rupiah(w.damage.subsidyAmount)}</dd>
        </div>
        <div>
          <dt>Bayar dari Kas</dt>
          <dd>{rupiah(w.damage.netCost)}</dd>
        </div>
      </dl>
      <p className="warung-hint">Pak RT: “{w.damage.reason}”</p>
      <p className="warung-hint">
        Subsidi berupa potongan biaya. Tagihan tetap berjalan selama warung rusak.
      </p>
      {w.renovation ? (
        <>
          <p className="warung-hint">
            {(
              w.renovationText?.["repair_card"] ?? "Perbaikan warung · selesai ±:minutes menit lagi"
            ).replace(":minutes", String(renovationMinutesLeft(w.renovation)))}
          </p>
          <p className="warung-hint">{w.renovationText?.["rules"]}</p>
          <RenovationMeanwhile />
        </>
      ) : (
        <>
          <button
            type="button"
            className="warung-cta"
            aria-haspopup="dialog"
            disabled={busy || w.damage.status !== "damaged" || w.cash < w.damage.netCost}
            onClick={(event) => {
              event.currentTarget.focus();
              setConfirming(true);
            }}
          >
            Renovasi · {rupiah(w.damage.netCost)}
          </button>
          {w.cash < w.damage.netCost && (
            <p className="warung-hint">
              Kas kurang {rupiah(w.damage.netCost - w.cash)} untuk perbaikan.
            </p>
          )}
          {confirming && (
            <WarungRenovationConfirm
              warung={w}
              action="repair"
              onClose={() => setConfirming(false)}
            />
          )}
        </>
      )}
    </section>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="warung-review-stars" role="img" aria-label={`${rating} dari 5 bintang`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, rating - index)) * 100;
        return (
          <span
            key={index}
            className="warung-review-star"
            style={{ "--star-fill": `${fill}%` } as CSSProperties}
            aria-hidden
          >
            <Star />
            {fill > 0 && <Star className="warung-review-star-fill" />}
          </span>
        );
      })}
    </span>
  );
}

function WarungReviews({ rating }: { rating: WarungRating | undefined }) {
  const average = rating?.avg;
  const reviews = rating?.recent ?? [];
  if (average == null && !reviews.length) {
    return (
      <section className="warung-home-empty">
        <MessageCircle aria-hidden />
        <h3>Belum ada ulasan</h3>
        <p>Layani pembeli untuk mendapat ulasan pertamamu.</p>
      </section>
    );
  }
  return (
    <section aria-label="Ulasan pembeli">
      {average != null && (
        <div className="warung-review-summary">
          <div className="warung-review-score">
            <strong>
              {average.toLocaleString("id-ID", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </strong>
            <span>/5</span>
          </div>
          <div>
            <ReviewStars rating={average} />
            <p>{rating?.count ?? reviews.length} ulasan pembeli</p>
          </div>
        </div>
      )}
      {reviews.length > 0 && (
        <ul className="warung-review-list" aria-label="Ulasan terbaru">
          {reviews.map(({ npc, stars, reason, at }, index) => {
            const name = npc?.trim() || "Pembeli";
            return (
              <li key={`${at}:${name}:${index}`} className="warung-review-row">
                <span className="warung-review-avatar" aria-hidden>
                  {Array.from(name)[0]!.toLocaleUpperCase("id-ID")}
                </span>
                <div className="warung-review-copy">
                  <strong>{name}</strong>
                  <p>{REVIEW_TEXT[reason]}</p>
                </div>
                <ReviewStars rating={stars} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function WarungLife({ snapshot, warung }: Pick<OverviewProps, "snapshot" | "warung">) {
  const { story, event } = snapshot;
  const renovation = !warung.damage && warung.renovation;
  if (!story && !event && !renovation) {
    return (
      <section className="warung-home-empty">
        <BookOpen aria-hidden />
        <h3>Belum ada cerita warung</h3>
        <p>Cerita dan kegiatan warung akan muncul di sini.</p>
      </section>
    );
  }
  return (
    <div className="warung-home-life">
      <StoryCard />
      {event && (
        <section className="warung-home-life-note">
          <UsersRound aria-hidden />
          <div>
            <h3>Tamu di warung</h3>
            <p>{event.npc} sedang mampir.</p>
          </div>
        </section>
      )}
    </div>
  );
}
