import { useEffect } from "react";
import { ojekCommand, useOjek } from "@/game/ojek/store";
import { usahaCommand, useUsaha } from "@/game/usaha/store";
import { rupiah } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import type { WaypointId } from "@/game/navigation/map-destinations";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import "./warung-panel.css";
import "./usaha-panel.css";

function guide(id: WaypointId) {
  useGame.getState().setWaypoint(id);
  useHud.getState().setSheet(null);
}

/** Phone "Usaha": every business the player can own, with status and the way there. */
export function UsahaListPanel() {
  const warung = useWarung((s) => s.data?.warung);
  const usaha = useUsaha((s) => s.data);
  const ojek = useOjek((s) => s.data);
  const hasWarung = !!warung;
  useEffect(() => {
    void ojekCommand("read");
    if (hasWarung) void usahaCommand("read");
  }, [hasWarung]);

  const setSheet = useHud.getState().setSheet;
  const motor = ojek?.ojek.motor;
  const cheapestMotor = ojek?.motors.reduce((min, m) => Math.min(min, m.price), Infinity);

  return (
    <div className="warung-panel usaha-list">
      <div className="warung-panel-intro">
        <p>
          {hasWarung
            ? `Kas usaha ${rupiah(warung.cash)} — dipakai bersama semua usahamu.`
            : "Mulai dari warung: Kas warung jadi modal usaha lain."}
        </p>
      </div>
      <div className="warung-panel-body">
        <div className="warung-row" data-usaha-row="warung">
          <i className="warung-badge" aria-hidden="true">
            🏪
          </i>
          <div>
            <strong>Warung</strong>
            <span>{hasWarung ? `${warung.name} · ${warung.levelName}` : "Belum punya"}</span>
          </div>
          {hasWarung ? (
            <button type="button" className="warung-cta" onClick={() => guide("usaha-warung")}>
              Tunjukkan jalan
            </button>
          ) : (
            <button type="button" className="warung-cta" onClick={() => setSheet("warung")}>
              Buka warung
            </button>
          )}
        </div>

        {(["warteg", "kos"] as const).map((kind) => {
          const owned = !!usaha?.[kind];
          const price = kind === "warteg" ? usaha?.catalog.wartegPrice : usaha?.catalog.kosPrice;
          return (
            <div
              className="warung-row"
              key={kind}
              data-usaha-row={kind}
              data-locked={!hasWarung || undefined}
            >
              <i className="warung-badge" aria-hidden="true">
                {kind === "warteg" ? "🍛" : "🏠"}
              </i>
              <div>
                <strong>{kind === "warteg" ? "Warteg" : "Kos-kosan"}</strong>
                <span>
                  {owned
                    ? "Milikmu · masuk lewat pintu depan"
                    : price != null
                      ? `Dijual ${rupiah(price)} · beli di lokasi`
                      : "Butuh warung dulu"}
                </span>
              </div>
              <button
                type="button"
                className={owned ? "warung-cta" : "warung-secondary"}
                onClick={() => guide(`usaha-${kind}`)}
              >
                Tunjukkan jalan
              </button>
            </div>
          );
        })}

        <div className="warung-row" data-usaha-row="ojek" data-locked={!hasWarung || undefined}>
          <i className="warung-badge" aria-hidden="true">
            🛵
          </i>
          <div>
            <strong>Ojek</strong>
            <span>
              {motor
                ? `Motormu: ${motor.name}`
                : cheapestMotor != null && Number.isFinite(cheapestMotor)
                  ? `Motor mulai ${rupiah(cheapestMotor)} · bisa narik pakai motor umum`
                  : "Narik penumpang dari handphone"}
            </span>
          </div>
          <button type="button" className="warung-secondary" onClick={() => setSheet("ojek")}>
            Buka Ojek
          </button>
        </div>
      </div>
    </div>
  );
}
