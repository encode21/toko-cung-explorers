import { useEffect, useState } from "react";
import { Bike, MapPin, Wrench } from "lucide-react";
import { ojekCommand, summonMotor, useOjek } from "@/game/ojek/store";
import { useHud } from "@/state/hud-store";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { OjekDriverView } from "./OjekDriverView";
import { OjekRouteMap } from "./OjekRouteMap";
import { OjekDestinationPicker } from "./OjekDestinationPicker";
import "./ojek-panel.css";

import { motorThumbnail } from "@/game/vehicles/motorcycles";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
type OjekTab = "drive" | "ride" | "motor";

function RouteStop({ label, name }: { label: string; name: string }) {
  return (
    <div className="ojek-route-stop">
      <MapPin aria-hidden="true" />
      <span>
        <small>{label}</small>
        <strong>{name}</strong>
      </span>
    </div>
  );
}

/** Phone app: driving, requesting a ride and choosing a motor. Money is Kas usaha. */
export function OjekPanel() {
  const data = useOjek((s) => s.data);
  const busy = useOjek((s) => s.busy);
  const error = useOjek((s) => s.error);
  const [dropoff, setDropoff] = useState("");
  const [tab, setTab] = useState<OjekTab>("drive");
  const canDrive = !!data && !data.ojek.job;
  const offerId = data?.ojek.offer?.id;

  const tripId = data?.ojek.job?.id ?? data?.ojek.order?.id;
  useEffect(() => {
    if (offerId || tripId) setTab("drive");
  }, [offerId, tripId]);

  useEffect(() => void ojekCommand("read"), []);
  // Drivers see fresh player orders while the app is open.
  useEffect(() => {
    if (!canDrive) return;
    void ojekCommand("rides");
    const t = setInterval(() => void ojekCommand("rides"), 5000);
    return () => clearInterval(t);
  }, [canDrive]);

  if (!data)
    return (
      <div className="ojek-panel ojek-app ojek-app-loading" role={error ? "alert" : "status"}>
        <p>{error ?? "Memuat ojek…"}</p>
        {error && (
          <button type="button" className="ojek-action" onClick={() => void ojekCommand("read")}>
            Coba lagi
          </button>
        )}
      </div>
    );
  const { ojek, motors, spots } = data;
  const { ride } = ojek;
  const current = ojek.motor;
  const destination = spots.find((spot) => spot.id === dropoff);
  const activeTab = tab === "ride" && !ojek.hasWarung ? "drive" : tab;
  const callMotor = () => {
    useHud.getState().setSheet(null);
    void summonMotor();
  };

  return (
    <div className="ojek-panel ojek-app">
      {activeTab === "motor" && (
        <div className="ojek-wallet">
          <span>{ojek.hasWarung ? "Kas usaha" : "Tabungan modal"}</span>
          <strong>
            <KasMoneyIcon />
            {rp(ojek.hasWarung ? (ojek.cash ?? 0) : ojek.savings)}
          </strong>
        </div>
      )}

      {error && (
        <p className="ojek-app-error" role="alert">
          {error}
        </p>
      )}
      {activeTab === "drive" ? (
        <OjekDriverView data={data} onOpenMotor={() => setTab("motor")} />
      ) : (
        <div className="ojek-app-scroll" key={activeTab}>
          {ojek.offer && (
            <button type="button" className="ojek-incoming-link" onClick={() => setTab("drive")}>
              Order masuk · Lihat tawaran
            </button>
          )}
          {activeTab === "ride" && (
            <section className="ojek-app-section" aria-label="Pesan Ojek">
              {ride ? (
                <>
                  <OjekRouteMap dropoff={ride.dropoff} stage="preview" />
                  <div className="ojek-section-heading">
                    <h3>Perjalananmu</h3>
                    <strong>{rp(ride.fare)}</strong>
                  </div>
                  <p className="ojek-ride-status" role="status">
                    {ride.status === "open"
                      ? "Mencari driver…"
                      : `${ride.driver ?? "Driver"} menuju lokasimu`}
                  </p>
                  <RouteStop label="Tujuan" name={ride.dropoff.name} />
                </>
              ) : (
                <>
                  <OjekDestinationPicker
                    spots={spots}
                    value={dropoff}
                    onChange={setDropoff}
                    disabled={busy}
                  />
                  {destination && <OjekRouteMap dropoff={destination} stage="preview" />}
                </>
              )}
              <p className="ojek-copy">
                Ongkos ditahan dari Kas usaha dan kembali kalau batal atau tidak ada driver.
              </p>
            </section>
          )}
          {activeTab === "motor" && (
            <>
              {current ? (
                <div className="ojek-current-motor">
                  <img className="ojek-motor-thumb" src={motorThumbnail(current.id)} alt="" />
                  <span>
                    <small>Motorku</small>
                    <strong>{current.name}</strong>
                  </span>
                  <button type="button" className="ojek-action" disabled={busy} onClick={callMotor}>
                    Panggil
                  </button>
                </div>
              ) : (
                <p className="ojek-copy">
                  Motor umum di parkiran gratis dipakai untuk mulai narik.
                </p>
              )}
              <section className="ojek-app-section" aria-label="Dealer Motor">
                <h3>Dealer Motor</h3>
                {!ojek.hasWarung && (
                  <p className="ojek-copy">Buka warung untuk membeli motor dari Kas usaha.</p>
                )}
                <ul className="ojek-app-list ojek-motor-list">
                  {motors.map((m) => {
                    const owned = current?.id === m.id;
                    const lower = !!current && m.price <= current.price;
                    const affordable = (ojek.cash ?? 0) >= m.price;
                    return (
                      <li key={m.id}>
                        <img
                          className="ojek-motor-thumb"
                          src={motorThumbnail(m.id)}
                          alt={`Model ${m.name} di game`}
                          loading="lazy"
                        />
                        <div className="ojek-list-info">
                          <strong>{m.name}</strong>
                          <b>{rp(m.price)}</b>
                          <small>
                            Ongkos {m.fare_percent}%
                            {!owned && !lower && ojek.hasWarung && !affordable
                              ? " · Kas belum cukup"
                              : ""}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="ojek-action"
                          disabled={busy || !ojek.hasWarung || owned || lower || !affordable}
                          onClick={() => void ojekCommand("buy_motor", { model: m.id })}
                        >
                          {owned ? "Punyamu" : lower ? "Terlewati" : "Beli"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
              <details className="ojek-app-help">
                <summary>Motor & setoran</summary>
                <p>
                  Motor juragan dikenai setoran {ojek.setoranPercent}% dari ongkos. Motor sendiri
                  tanpa setoran, ongkos naik sesuai tipe, dan bisa dipanggil di mana saja.
                </p>
              </details>
            </>
          )}
        </div>
      )}
      {activeTab === "ride" && (
        <div className="ojek-app-checkout">
          {ride ? (
            <button
              type="button"
              className="ojek-action ojek-action-secondary ojek-action-wide"
              disabled={busy}
              onClick={() => void ojekCommand("cancel_ride", { rideId: ride.id })}
            >
              Batalkan pesanan
            </button>
          ) : (
            <button
              type="button"
              className="ojek-action ojek-action-order ojek-action-wide"
              disabled={busy || !destination}
              onClick={() =>
                destination && void ojekCommand("order_ride", { dropoff: destination.id })
              }
            >
              {destination ? `Pesan ke ${destination.name}` : "Pilih tujuan dulu"}
            </button>
          )}
        </div>
      )}
      <nav className="ojek-app-tabs" aria-label="Menu Ojek">
        <button type="button" aria-pressed={activeTab === "drive"} onClick={() => setTab("drive")}>
          <Bike aria-hidden="true" />
          Narik
        </button>
        {ojek.hasWarung && (
          <button type="button" aria-pressed={activeTab === "ride"} onClick={() => setTab("ride")}>
            <MapPin aria-hidden="true" />
            Pesan{ride && <span className="ojek-tab-dot" aria-label="Perjalanan aktif" />}
          </button>
        )}
        <button type="button" aria-pressed={activeTab === "motor"} onClick={() => setTab("motor")}>
          <Wrench aria-hidden="true" />
          Motor
        </button>
      </nav>
    </div>
  );
}
