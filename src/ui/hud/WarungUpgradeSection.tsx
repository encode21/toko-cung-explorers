import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Hammer,
  PackageOpen,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { useWarung, warungCommand, openWarungPanel } from "@/game/warung/store";
import { renovationMinutesLeft, rupiah, type UpgradePreview } from "@/game/warung/model";
import { useGang } from "@/game/gang/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import type { WaypointId } from "@/game/navigation/map-destinations";
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
export function RenovationMeanwhile() {
  const text = useWarung((s) => s.data?.warung?.renovationText);
  return (
    <div className="warung-upgrade-meanwhile">
      <p>{text?.["meanwhile"]}</p>
      <div>
        <button type="button" className="warung-secondary" onClick={() => guide("venue-fishing")}>
          Mancing
        </button>
        <button
          type="button"
          className="warung-secondary"
          onClick={() => guide("venue-helicopter")}
        >
          Naik gunung
        </button>
        <button
          type="button"
          className="warung-secondary"
          onClick={() => useHud.getState().setSheet("ojek")}
        >
          Narik ojek
        </button>
      </div>
    </div>
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
  const confirmButton = useRef<HTMLButtonElement>(null);
  const upgradeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
  }, [confirming]);
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
    return (
      <div className="warung-operation-detail warung-upgrade warung-upgrade-state">
        <div className="warung-upgrade-state-icon">
          <Hammer size={30} aria-hidden />
        </div>
        <h4>Warung sedang direnovasi</h4>
        <p className="warung-upgrade-state-detail">
          {(
            (w.damage?.status === "repairing" ? t["repair_card"] : t["card"]) ??
            "Renovasi ke :level · selesai ±:minutes menit lagi"
          )
            .replace(":level", w.renovation.levelName)
            .replace(":minutes", String(renovationMinutesLeft(w.renovation)))}
        </p>
        {t["rules"] && <p>{t["rules"]}</p>}
        <RenovationMeanwhile />
      </div>
    );
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
  const pay = async () => {
    // Cash can change while the confirmation is open.
    const latest = useWarung.getState();
    const current = latest.data?.warung;
    if (
      latest.busy ||
      !current?.upgradePreview ||
      current.renovation ||
      current.cash < current.upgradePreview.cost
    )
      return;
    setConfirming(false);
    await warungCommand("upgrade");
  };
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

        <section className="warung-upgrade-purchase" aria-label="Biaya dan konfirmasi upgrade">
          <h5>{p.renovationMinutes > 0 ? "Renovasi warung" : "Naik level warung"}</h5>
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
          {p.renovationMinutes > 0 && (
            <p className="warung-upgrade-duration">
              <Clock3 size={16} aria-hidden />
              <span>
                Renovasi {p.renovationGameDays} hari game{" "}
                <small>±{p.renovationMinutes} menit</small>
              </span>
            </p>
          )}
          {confirming ? (
            <div className="warung-upgrade-confirm" role="group" aria-label="Konfirmasi upgrade">
              <p>
                {(t["confirm"] ?? "Bayar :cost dan renovasi :minutes menit?")
                  .replace(":cost", rupiah(p.cost))
                  .replace(":minutes", String(p.renovationMinutes))}
              </p>
              <div className="warung-upgrade-confirm-actions">
                <button
                  type="button"
                  className="warung-secondary"
                  disabled={busy}
                  ref={confirmButton}
                  onClick={() => {
                    setConfirming(false);
                    requestAnimationFrame(() => upgradeButton.current?.focus());
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="warung-cta warung-upgrade-pay"
                  aria-label={busy ? "Memproses…" : `Konfirmasi renovasi seharga ${rupiah(p.cost)}`}
                  disabled={busy || !canUpgrade}
                  onClick={() => void pay()}
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
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="warung-cta warung-upgrade-pay"
              aria-label={
                busy
                  ? "Memproses…"
                  : `${p.renovationMinutes > 0 ? "Mulai renovasi" : "Naik level sekarang"} seharga ${rupiah(p.cost)}`
              }
              disabled={busy || !canUpgrade}
              ref={upgradeButton}
              onClick={() => (p.renovationMinutes > 0 ? setConfirming(true) : void pay())}
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
          )}
        </section>
      </div>

      {p.renovationMinutes > 0 && t["rules"] && (
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
    </div>
  );
}
