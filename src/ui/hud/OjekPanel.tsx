import { useEffect } from "react";
import { ojekCommand, summonMotor, useOjek } from "@/game/ojek/store";
import { useHud } from "@/state/hud-store";
import "./warung-panel.css";
import "./usaha-panel.css";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

/** Phone app: motor dealer + "Ambil penumpang". Money is Kas usaha (shared with the warung). */
export function OjekPanel() {
  const data = useOjek((s) => s.data);
  const busy = useOjek((s) => s.busy);
  const error = useOjek((s) => s.error);
  const picked = useOjek((s) => s.picked);
  useEffect(() => void ojekCommand("read"), []);

  const ojek = data?.ojek;
  const order = ojek?.order;
  const current = ojek?.motor;

  return (
    <div className="warung-panel ojek-panel">
      <div className="warung-panel-intro">
        <p>Simulasi ojek — Kas usaha bukan uang asli.</p>
      </div>
      <div className="warung-panel-body">
        {error && (
          <p className="warung-error" role="alert">
            {error}
          </p>
        )}
        {!data || !ojek ? (
          !error && <p className="warung-hint">Memuat ojek…</p>
        ) : !ojek.hasWarung ? (
          <div className="warung-card warung-card-awning">
            <strong>Buka warung dulu</strong>
            <p className="warung-hint">Motor dibeli pakai Kas usaha dari warungmu.</p>
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
                <strong>{current ? current.name : "Belum punya motor"}</strong>
                <span className="warung-level-pill">
                  Narik {ojek.tripsThisHour}/{ojek.tripsPerHourCap} jam ini
                </span>
              </div>
              <dl>
                <div>
                  <dt>Kas usaha</dt>
                  <dd>{rp(ojek.cash ?? 0)}</dd>
                </div>
                <div>
                  <dt>Ongkos</dt>
                  <dd>{current ? `${current.fare_percent}%` : "100%"}</dd>
                </div>
                <div>
                  <dt>Setoran juragan</dt>
                  <dd>{current ? "0%" : `${ojek.setoranPercent}%`}</dd>
                </div>
              </dl>
              {current && (
                <button
                  type="button"
                  className="warung-cta"
                  disabled={busy}
                  onClick={() => {
                    useHud.getState().setSheet(null);
                    void summonMotor();
                  }}
                >
                  Panggil motorku
                </button>
              )}
            </div>

            <section className="warung-list" aria-labelledby="ojek-order-title">
              <h4 id="ojek-order-title">Narik Ojek</h4>
              {order ? (
                <div className="warung-card ojek-order">
                  <strong>
                    {picked === order.id
                      ? `Antar ke ${order.dropoff.name}`
                      : `Jemput penumpang di ${order.pickup.name}`}
                  </strong>
                  <dl>
                    <div>
                      <dt>Motor umum</dt>
                      <dd>{rp(order.publicPayout)}</dd>
                    </div>
                    {order.ownPayout !== null && (
                      <div>
                        <dt>Motormu</dt>
                        <dd>{rp(order.ownPayout)}</dd>
                      </div>
                    )}
                  </dl>
                  <p className="warung-hint">Tetap di atas motor sampai tujuan.</p>
                </div>
              ) : (
                <button
                  type="button"
                  className="warung-cta"
                  disabled={busy || ojek.tripsThisHour >= ojek.tripsPerHourCap}
                  onClick={() => void ojekCommand("accept")}
                >
                  Ambil penumpang
                </button>
              )}
              <p className="warung-hint ojek-setoran">
                Motor umum di parkiran gratis dipakai, tapi narik pakai motor juragan kena setoran{" "}
                {ojek.setoranPercent}% dari ongkos. Motor sendiri: tanpa setoran, ongkos naik sesuai
                tipe, dan bisa dipanggil di mana saja.
              </p>
            </section>

            <section className="warung-list" aria-labelledby="ojek-dealer-title">
              <h4 id="ojek-dealer-title">Dealer Motor</h4>
              {data.motors.map((m) => {
                const owned = current?.id === m.id;
                const lower = !!current && m.price <= current.price;
                return (
                  <div key={m.id} className="warung-row" data-owned={owned || undefined}>
                    <i className="warung-badge" aria-hidden="true">
                      🛵
                    </i>
                    <div>
                      <strong>{m.name}</strong>
                      <span>
                        {rp(m.price)} · ongkos {m.fare_percent}%
                      </span>
                    </div>
                    <button
                      type="button"
                      className={owned ? "warung-secondary" : "warung-cta"}
                      disabled={busy || owned || lower || (ojek.cash ?? 0) < m.price}
                      onClick={() => void ojekCommand("buy_motor", { model: m.id })}
                    >
                      {owned ? "Punyamu" : "Beli"}
                    </button>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
