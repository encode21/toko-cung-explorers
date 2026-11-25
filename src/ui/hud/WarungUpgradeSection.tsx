import { lazy, Suspense, useState } from "react";
import { Hammer, TrendingUp } from "lucide-react";
import { useWarung, warungCommand } from "@/game/warung/store";
import { renovationMinutesLeft, rupiah, type UpgradePreview } from "@/game/warung/model";
import { useGang } from "@/game/gang/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import type { WaypointId } from "@/game/navigation/map-destinations";
import "./warung-upgrade.css";

const UpgradeBuildingPreview = lazy(() => import("@/game/warung/UpgradeBuildingPreview"));

const GROUPS: { id: UpgradePreview["lines"][number]["group"]; title: string }[] = [
  { id: "laku", title: "Lebih laku" },
  { id: "buka", title: "Bisa jual & punya" },
  { id: "tampilan", title: "Tampilan bangunan" },
  { id: "biaya", title: "Biaya naik" },
];

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
  if (!w) return null;
  const t = w.renovationText ?? {};

  if (w.renovation) {
    return (
      <div className="warung-operation-detail warung-upgrade">
        <Hammer size={40} aria-hidden />
        <h4>
          {(t["card"] ?? "Renovasi ke :level · selesai ±:minutes menit lagi")
            .replace(":level", w.renovation.levelName)
            .replace(":minutes", String(renovationMinutesLeft(w.renovation)))}
        </h4>
        <p>{t["rules"]}</p>
        <RenovationMeanwhile />
      </div>
    );
  }

  const p = w.upgradePreview;
  if (!p) {
    return (
      <div className="warung-operation-detail">
        <TrendingUp size={40} aria-hidden />
        <h4>{w.nextUpgradeCost === null ? "Level tertinggi" : "Naik level"}</h4>
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
    setConfirming(false);
    await warungCommand("upgrade");
  };
  return (
    <div className="warung-operation-detail warung-upgrade">
      <h4>
        {w.levelName} → {p.name}
      </h4>
      <Suspense fallback={<div className="warung-upgrade-preview" />}>
        <UpgradeBuildingPreview level={w.level} next={p.level} house={house} />
      </Suspense>
      <small className="warung-hint">Geser untuk memutar bangunan.</small>
      <div className="warung-upgrade-groups">
        {GROUPS.map(({ id, title }) => {
          const lines = p.lines.filter((l) => l.group === id);
          if (!lines.length) return null;
          return (
            <section key={id} data-group={id}>
              <strong>{title}</strong>
              <ul>
                {lines.map((l) => (
                  <li key={l.text}>{l.text}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {p.renovationMinutes > 0 && (
        <p className="warung-hint">
          🚧 Renovasi {p.renovationGameDays} hari game (±{p.renovationMinutes} menit). {t["rules"]}
        </p>
      )}
      <strong className="warung-upgrade-cost">{rupiah(p.cost)}</strong>
      {!canUpgrade && <p>Kumpulkan {rupiah(p.cost - w.cash)} lagi dari jualan.</p>}
      {confirming ? (
        <div className="warung-upgrade-confirm" role="alertdialog" aria-label="Konfirmasi upgrade">
          <p>
            {(t["confirm"] ?? "Bayar :cost dan renovasi :minutes menit?")
              .replace(":cost", rupiah(p.cost))
              .replace(":minutes", String(p.renovationMinutes))}
          </p>
          <button type="button" className="warung-cta" disabled={busy} onClick={() => void pay()}>
            Ya, renovasi
          </button>
          <button
            type="button"
            className="warung-secondary"
            disabled={busy}
            onClick={() => setConfirming(false)}
          >
            Batal
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="warung-cta"
          disabled={busy || !canUpgrade}
          onClick={() => (p.renovationMinutes > 0 ? setConfirming(true) : void pay())}
        >
          {busy ? "Memproses…" : canUpgrade ? "Upgrade & renovasi" : "Kas belum cukup"}
        </button>
      )}
    </div>
  );
}
