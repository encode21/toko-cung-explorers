import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowRight,
  Bike,
  Check,
  Clock3,
  Fish,
  Hammer,
  Info,
  Mountain,
  PackageOpen,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { useWarung, warungCommand, openWarungPanel } from "@/game/warung/store";
import {
  renovationMinutesLeft,
  rupiah,
  type MyWarung,
  type UpgradePreview,
  type WarungRenovation,
} from "@/game/warung/model";
import { useGang } from "@/game/gang/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import type { WaypointId } from "@/game/navigation/map-destinations";
import { PhoneAppArtwork } from "./PhoneAppArtwork";
import { WarungRenovationConfirm } from "./WarungRenovationConfirm";
import "./warung-upgrade.css";

const UpgradeBuildingPreview = lazy(() => import("@/game/warung/UpgradeBuildingPreview"));

const GROUPS = [
  { id: "laku", title: "Peluang jualan", Icon: TrendingUp },
  { id: "buka", title: "Yang terbuka", Icon: PackageOpen },
  { id: "tampilan", title: "Bangunan baru", Icon: Store },
  { id: "biaya", title: "Perubahan biaya", Icon: Wallet },
] satisfies { id: UpgradePreview["lines"][number]["group"]; title: string; Icon: typeof Store }[];

function guide(id: WaypointId) {
  useGame.getState().setWaypoint(id);
  useHud.getState().setSheet(null);
}

/** Things to do while the warung is closed for works. */
export function RenovationMeanwhile({ withIcons = false }: { withIcons?: boolean }) {
  const text = useWarung((s) => s.data?.warung?.renovationText?.["meanwhile"]);
  return (
    <div className="warung-upgrade-meanwhile">
      {(text || withIcons) && <p>{text || "Sambil menunggu"}</p>}
      <div>
        <button type="button" className="warung-secondary" onClick={() => guide("venue-fishing")}>
          {withIcons && <Fish size={16} aria-hidden />}
          Mancing
        </button>
        <button
          type="button"
          className="warung-secondary"
          onClick={() => guide("venue-helicopter")}
        >
          {withIcons && <Mountain size={16} aria-hidden />}
          Naik gunung
        </button>
        <button
          type="button"
          className="warung-secondary"
          onClick={() => useHud.getState().setSheet("ojek")}
        >
          {withIcons && <Bike size={16} aria-hidden />}
          Narik ojek
        </button>
      </div>
    </div>
  );
}

function RenovationEta({ renovation }: { renovation: WarungRenovation }) {
  const [minutes, setMinutes] = useState(() => renovationMinutesLeft(renovation));
  useEffect(() => {
    const update = () => setMinutes(renovationMinutesLeft(renovation));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [renovation]);
  const estimate = Number.isFinite(minutes) ? minutes : renovation.minutesLeft;

  return (
    <div className="warung-renovation-eta">
      <Clock3 size={20} aria-hidden />
      <div>
        <small>Estimasi selesai</small>
        <strong>{estimate > 0 ? `±${estimate} menit` : "Menunggu pembaruan"}</strong>
      </div>
    </div>
  );
}

function ActiveRenovation({
  warung,
  renovation,
}: {
  warung: MyWarung;
  renovation: WarungRenovation;
}) {
  const damage = warung.damage?.status === "repairing" ? warung.damage : null;
  const rules = warung.renovationText?.["rules"];

  return (
    <section className="warung-upgrade-state warung-upgrade-state--active">
      <header className="warung-renovation-banner">
        <div className="warung-renovation-main">
          <span className="warung-renovation-building" aria-hidden>
            <PhoneAppArtwork kind="warung" />
            <span>
              <Hammer size={15} />
            </span>
          </span>
          <div>
            <h4>{damage ? "Warung sedang diperbaiki" : "Warung sedang direnovasi"}</h4>
            <div className="warung-renovation-target">
              <strong>{damage ? damage.name : renovation.levelName}</strong>
              {!damage && (
                <span
                  className="warung-upgrade-levels"
                  aria-label={`Level ${warung.level} ke level ${renovation.level}`}
                >
                  <span>Lv. {warung.level}</span>
                  <ArrowRight size={14} aria-hidden />
                  <strong>Lv. {renovation.level}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
        <RenovationEta renovation={renovation} />
      </header>
      {rules && (
        <div className="warung-renovation-policy">
          <Info size={16} aria-hidden />
          <p>{rules}</p>
        </div>
      )}
      <RenovationMeanwhile withIcons />
    </section>
  );
}

/** Operasional → Naik level: every effect of the next level, a before/after building preview, then renovation. */
export function UpgradeSection() {
  const w = useWarung((s) => s.data?.warung);
  const busy = useWarung((s) => s.busy);
  const house = useGang(
    (s) => s.data?.houses.find((h) => h.mine && h.warung?.lot === null) ?? null,
  );
  const [confirming, setConfirming] = useState(false);
  if (!w) return null;
  const t = w.renovationText ?? {};

  if (w.damage?.status === "damaged") {
    return (
      <div className="warung-operation-detail">
        <h4>Perbaiki warung dulu</h4>
        <p>
          Warung terkena {w.damage.name}. Buka Ringkasan untuk melihat bantuan Walikota dan mulai
          renovasi.
        </p>
        <button type="button" className="warung-cta" onClick={() => openWarungPanel("home")}>
          Lihat kerusakan
        </button>
      </div>
    );
  }
  if (w.renovation) {
    return <ActiveRenovation warung={w} renovation={w.renovation} />;
  }

  const p = w.upgradePreview;
  if (!p) {
    return (
      <div className="warung-operation-detail warung-upgrade warung-upgrade-state">
        <div className="warung-upgrade-state-icon">
          <TrendingUp size={30} aria-hidden />
        </div>
        <h4>{w.nextUpgradeCost === null ? "Level tertinggi" : "Rincian belum tersedia"}</h4>
        <p>
          {w.nextUpgradeCost === null
            ? "Warungmu sudah mencapai level tertinggi."
            : "Rincian upgrade belum tersedia."}
        </p>
      </div>
    );
  }

  const canUpgrade = w.cash >= p.cost;
  const needsRenovation = p.renovationMinutes > 0;
  return (
    <div className="warung-operation-detail warung-upgrade">
      <header className="warung-upgrade-heading">
        <div>
          <h4>Naik ke {p.name}</h4>
          <p>Dari {w.levelName}</p>
        </div>
        <span className="warung-upgrade-levels" aria-label={`Level ${w.level} ke level ${p.level}`}>
          <span>Lv. {w.level}</span>
          <ArrowRight size={14} aria-hidden />
          <strong>Lv. {p.level}</strong>
        </span>
      </header>

      <div className="warung-upgrade-overview">
        <figure className="warung-upgrade-building">
          <Suspense
            fallback={
              <div className="warung-upgrade-preview" aria-label="Memuat pratinjau bangunan" />
            }
          >
            <UpgradeBuildingPreview level={w.level} next={p.level} house={house} />
          </Suspense>
          <figcaption>Geser untuk memutar bangunan</figcaption>
        </figure>

        <section className="warung-upgrade-purchase" aria-label="Biaya naik level">
          <h5>{needsRenovation ? "Renovasi warung" : "Naik level warung"}</h5>
          <dl className="warung-upgrade-balance">
            <div>
              <dt>Kas warung</dt>
              <dd>{rupiah(w.cash)}</dd>
            </div>
          </dl>
          {!canUpgrade && (
            <p className="warung-upgrade-shortfall" role="status">
              Kurang <strong>{rupiah(p.cost - w.cash)}</strong>. Kumpulkan dari jualanmu.
            </p>
          )}
          {needsRenovation && (
            <p className="warung-upgrade-duration">
              <Clock3 size={16} aria-hidden />
              <span>
                Renovasi {p.renovationGameDays} hari game{" "}
                <small>±{p.renovationMinutes} menit</small>
              </span>
            </p>
          )}
          <button
            type="button"
            className="warung-cta warung-upgrade-pay"
            aria-label={
              busy
                ? "Memproses…"
                : `${needsRenovation ? "Mulai renovasi" : "Naik level sekarang"} seharga ${rupiah(p.cost)}`
            }
            aria-haspopup={needsRenovation ? "dialog" : undefined}
            disabled={busy || !canUpgrade}
            onClick={(event) => {
              if (needsRenovation) {
                event.currentTarget.focus();
                setConfirming(true);
              } else {
                const current = useWarung.getState().data?.warung;
                if (
                  current?.id === w.id &&
                  !current.renovation &&
                  current.damage?.status !== "damaged" &&
                  current.upgradePreview?.level === p.level &&
                  !(current.upgradePreview.renovationMinutes > 0) &&
                  current.upgradePreview.cost === p.cost &&
                  current.cash >= p.cost
                ) {
                  void warungCommand("upgrade");
                }
              }
            }}
          >
            {busy ? (
              "Memproses…"
            ) : (
              <>
                <KasMoneyIcon />
                <span>{rupiah(p.cost)}</span>
              </>
            )}
          </button>
        </section>
      </div>

      {needsRenovation && t["rules"] && (
        <p className="warung-upgrade-rules">
          <Hammer size={16} aria-hidden />
          <span>{t["rules"]}</span>
        </p>
      )}

      <div className="warung-upgrade-benefits">
        <h5>Setelah naik level</h5>
        <div className="warung-upgrade-groups">
          {GROUPS.map(({ id, title, Icon }) => {
            const lines = p.lines.filter((l) => l.group === id);
            if (!lines.length) return null;
            return (
              <section key={id} data-group={id}>
                <h6>
                  <Icon size={17} aria-hidden />
                  {title}
                </h6>
                <ul>
                  {lines.map((l, index) => (
                    <li key={`${id}-${index}`}>
                      {id === "biaya" ? (
                        <ArrowRight size={13} aria-hidden />
                      ) : (
                        <Check size={13} aria-hidden />
                      )}
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      {confirming && needsRenovation && (
        <WarungRenovationConfirm warung={w} action="upgrade" onClose={() => setConfirming(false)} />
      )}
    </div>
  );
}
