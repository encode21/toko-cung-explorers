import { useEffect } from "react";
import { garasiCommand, summonVehicle, useGarasi, type GarasiKind } from "@/game/garasi/store";
import { useHud } from "@/state/hud-store";
import "./warung-panel.css";
import "./usaha-panel.css";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const STYLE_SECTIONS: { kind: Exclude<GarasiKind, "car">; title: string; off: string }[] = [
  { kind: "paint", title: "Bengkel Cat Motor", off: "Cat asli" },
  { kind: "jacket", title: "Jaket Ojol", off: "Tanpa jaket" },
  { kind: "helmet", title: "Helm", off: "Helm standar" },
];

/** Phone app: car dealer, my vehicles (summon/park), and rider style. Money is Kas usaha. */
export function GarasiPanel() {
  const data = useGarasi((s) => s.data);
  const busy = useGarasi((s) => s.busy);
  const error = useGarasi((s) => s.error);
  useEffect(() => void garasiCommand("read"), []);
  const g = data?.garasi;
  const owned = (kind: GarasiKind, id: string) =>
    g?.owned.find((o) => o.kind === kind && o.itemId === id);
  const summon = (vehicle: string, at: "here" | "garasi") => {
    useHud.getState().setSheet(null);
    void summonVehicle(vehicle, at);
  };
  const myVehicles = [
    ...(g?.motor ? [{ id: "motor", name: g.motor.name, icon: "🛵" }] : []),
    ...(data?.catalog.car ?? [])
      .filter((c) => owned("car", c.id))
      .map((c) => ({ id: c.id, name: c.name, icon: "🚗" })),
  ];

  return (
    <div className="warung-panel ojek-panel">
      <div className="warung-panel-intro">
        <p>Simulasi garasi — Kas usaha bukan uang asli.</p>
      </div>
      <div className="warung-panel-body">
        {error && (
          <p className="warung-error" role="alert">
            {error}
          </p>
        )}
        {!data || !g ? (
          !error && <p className="warung-hint">Memuat garasi…</p>
        ) : !g.hasWarung ? (
          <div className="warung-card warung-card-awning">
            <strong>Buka warung dulu</strong>
            <p className="warung-hint">Mobil dan gaya rider dibeli pakai Kas usaha warungmu.</p>
            <button
              type="button"
              className="warung-cta"
              onClick={() => useHud.getState().setSheet("warung")}
            >
              Buka Warungku
            </button>
          </div>
        ) : (
          <>
            <div className="warung-card warung-card-awning">
              <div className="warung-card-head">
                <strong>Kas usaha {rp(g.cash ?? 0)}</strong>
              </div>
              <p className="warung-hint">
                Panggil kendaraan ke dekatmu, atau parkir di {g.spotName} untuk pamer. Kendaraan
                yang ditinggal 10 menit pulang sendiri.
              </p>
            </div>

            <section className="warung-list" aria-labelledby="garasi-mine-title">
              <h4 id="garasi-mine-title">Kendaraanku</h4>
              {myVehicles.length === 0 && (
                <p className="warung-hint">Belum ada. Beli motor di Ojek atau mobil di bawah.</p>
              )}
              {myVehicles.map((v) => (
                <div key={v.id} className="warung-row">
                  <i className="warung-badge" aria-hidden="true">
                    {v.icon}
                  </i>
                  <div>
                    <strong>{v.name}</strong>
                  </div>
                  <button
                    type="button"
                    className="warung-cta"
                    disabled={busy}
                    onClick={() => summon(v.id, "here")}
                  >
                    Panggil
                  </button>
                  <button
                    type="button"
                    className="warung-secondary"
                    disabled={busy}
                    onClick={() => summon(v.id, "garasi")}
                  >
                    Parkir
                  </button>
                </div>
              ))}
            </section>

            <section className="warung-list" aria-labelledby="garasi-dealer-title">
              <h4 id="garasi-dealer-title">Dealer Mobil</h4>
              {data.catalog.car.map((c) => {
                const mine = !!owned("car", c.id);
                return (
                  <div key={c.id} className="warung-row" data-owned={mine || undefined}>
                    <i className="warung-badge" aria-hidden="true" style={{ color: c.color }}>
                      ■
                    </i>
                    <div>
                      <strong>{c.name}</strong>
                      <span>
                        {rp(c.price)} · {c.blurb}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={mine ? "warung-secondary" : "warung-cta"}
                      disabled={busy || mine || (g.cash ?? 0) < c.price}
                      onClick={() => void garasiCommand("buy", { kind: "car", itemId: c.id })}
                    >
                      {mine ? "Punyamu" : "Beli"}
                    </button>
                  </div>
                );
              })}
            </section>

            {STYLE_SECTIONS.map(({ kind, title, off }) => {
              const anyOn = g.owned.some((o) => o.kind === kind && o.equipped);
              return (
                <section
                  key={kind}
                  className="warung-list"
                  aria-labelledby={`garasi-${kind}-title`}
                >
                  <h4 id={`garasi-${kind}-title`}>{title}</h4>
                  {data.catalog[kind].map((item) => {
                    const mine = owned(kind, item.id);
                    return (
                      <div
                        key={item.id}
                        className="warung-row"
                        data-owned={mine?.equipped || undefined}
                      >
                        <i
                          className="warung-badge"
                          aria-hidden="true"
                          style={{ color: item.color }}
                        >
                          ●
                        </i>
                        <div>
                          <strong>{item.name}</strong>
                          <span>{mine ? "Sudah dimiliki" : rp(item.price)}</span>
                        </div>
                        <button
                          type="button"
                          className={mine?.equipped ? "warung-secondary" : "warung-cta"}
                          disabled={busy || mine?.equipped || (!mine && (g.cash ?? 0) < item.price)}
                          onClick={() =>
                            void garasiCommand(mine ? "equip" : "buy", { kind, itemId: item.id })
                          }
                        >
                          {mine?.equipped ? "Dipakai" : mine ? "Pakai" : "Beli"}
                        </button>
                      </div>
                    );
                  })}
                  {anyOn && (
                    <button
                      type="button"
                      className="warung-secondary"
                      disabled={busy}
                      onClick={() => void garasiCommand("equip", { kind, itemId: "none" })}
                    >
                      {off}
                    </button>
                  )}
                </section>
              );
            })}
            <p className="warung-hint">
              Cat dipakai saat motormu dipanggil lagi. Jaket dan helm terlihat pemain lain saat kamu
              naik motor.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
