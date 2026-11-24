import { useEffect, useState } from "react";
import { ArrowRight, Bike, Navigation, Power, Star } from "lucide-react";
import { connectionId } from "@/net/channel-store";
import { useMobility } from "@/game/mobility/store";
import { bikeModel, vehicleFor } from "@/game/vehicles/model";
import { ojekCommand, setOnBid, useOjek, type OjekSnapshot } from "@/game/ojek/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { OjekRouteMap } from "./OjekRouteMap";
import "./ojek-driver.css";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const distance = (m: number) =>
  m >= 1000
    ? `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`
    : `${Math.round(m)} m`;

export function OjekDriverView({
  data,
  onOpenMotor,
}: {
  data: OjekSnapshot;
  onOpenMotor: () => void;
}) {
  const busy = useOjek((s) => s.busy);
  const onBid = useOjek((s) => s.onBid);
  const picked = useOjek((s) => s.picked);
  const boardingUntil = useOjek((s) => s.boardingUntil);
  const rides = useOjek((s) => s.rides);
  const vehicles = useMobility((s) => s.vehicles);
  const leaving = useMobility((s) => s.vehicleLeaving);
  const vehicle = leaving ? undefined : vehicleFor(vehicles ?? [], connectionId);
  const onBike =
    !!vehicle &&
    bikeModel(vehicle.model) &&
    vehicle.occupants.some((s) => s.seat === 0 && s.connectionId === connectionId);
  const aboard = !!vehicle?.occupants.some(
    (s) => s.seat !== 0 && s.status === "active" && s.connectionId !== connectionId,
  );
  const { ojek } = data;
  const trip = ojek.job ?? ojek.order;
  const offer = trip ? null : ojek.offer;
  const toDropoff = ojek.job ? aboard : !!ojek.order && picked === ojek.order.id;
  const boarding = !!ojek.order && !toDropoff && !!boardingUntil;
  const route = trip ?? offer;
  const [now, setNow] = useState(Date.now);
  const offerExpiresAt = offer?.expiresAt;
  useEffect(() => {
    if (!offerExpiresAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [offerExpiresAt]);
  const seconds = offer ? Math.max(0, Math.ceil((Date.parse(offer.expiresAt) - now) / 1000)) : 0;
  const phase = trip
    ? toDropoff
      ? "dropoff"
      : "pickup"
    : offer
      ? "offer"
      : onBid
        ? "online"
        : "offline";
  const payout = ojek.job
    ? ojek.job.fare
    : route && "publicPayout" in route
      ? vehicle?.mine
        ? (route.ownPayout ?? route.publicPayout)
        : route.publicPayout
      : 0;
  const navigate = () => {
    useGame.getState().setWaypoint(toDropoff ? "ojek-dropoff" : "ojek-pickup");
    useHud.getState().setSheet(null);
  };

  return (
    <div className="ojek-driver" data-driver-state={phase}>
      <div className="ojek-driver-scroll" key={`${phase}:${route?.id ?? "idle"}`}>
        <div className="ojek-driver-map">
          <OjekRouteMap
            pickup={route?.pickup}
            dropoff={route?.dropoff}
            stage={trip ? (toDropoff ? "dropoff" : "pickup") : offer ? "preview" : "idle"}
          />
          <div className="ojek-map-stats">
            <span className="ojek-map-wallet">
              <KasMoneyIcon />
              <span>
                <strong>{rp(ojek.hasWarung ? (ojek.cash ?? 0) : ojek.savings)}</strong>
              </span>
            </span>
            <span className="ojek-map-rating">
              <Star aria-hidden="true" />
              <b>{(ojek.rating ?? 5).toFixed(1)}</b>
              <span className="sr-only">Rating</span>
            </span>
          </div>
        </div>
        <section
          className="ojek-driver-sheet"
          aria-label={offer ? "Order masuk" : trip ? "Perjalanan aktif" : "Status driver"}
        >
          {route ? (
            <>
              <div className="ojek-driver-heading">
                <h3>
                  {offer
                    ? seconds
                      ? "Order masuk"
                      : "Tawaran berakhir"
                    : boarding
                      ? "Penumpang sedang naik"
                      : toDropoff
                        ? "Antar penumpang"
                        : "Jemput penumpang"}
                </h3>
                {offer && (
                  <span className="ojek-offer-timer" aria-label={`Sisa waktu ${seconds} detik`}>
                    {seconds} dtk
                  </span>
                )}
              </div>
              {trip && (
                <p className="ojek-active-target">
                  {toDropoff ? trip.dropoff.name : trip.pickup.name}
                </p>
              )}
              {trip && (
                <ol className="ojek-trip-steps" aria-label="Tahap perjalanan">
                  <li
                    aria-current={!toDropoff ? "step" : undefined}
                    data-done={toDropoff || undefined}
                  >
                    1. Jemput
                  </li>
                  <li aria-current={toDropoff ? "step" : undefined}>2. Antar</li>
                </ol>
              )}
              <div className="ojek-driver-fare">
                <span>
                  {ojek.job ? ojek.job.passenger : "Penumpang NPC"}
                  <small>{distance(route.distance)} perjalanan</small>
                </span>
                <span>
                  <small>Pendapatan bersih</small>
                  <strong>{rp(payout)}</strong>
                </span>
              </div>
              <div className="ojek-trip-route">
                <div data-stop="pickup" data-current={!toDropoff || undefined}>
                  <span className="ojek-stop-dot" aria-hidden="true" />
                  <span>
                    <small>Jemput di</small>
                    <strong>{route.pickup.name}</strong>
                  </span>
                </div>
                <div data-stop="dropoff" data-current={toDropoff || undefined}>
                  <span className="ojek-stop-dot" aria-hidden="true" />
                  <span>
                    <small>Antar ke</small>
                    <strong>{route.dropoff.name}</strong>
                  </span>
                </div>
              </div>
              {trip && (
                <p className="ojek-driver-hint">
                  {toDropoff
                    ? "Berhenti di tujuan. Perjalanan akan selesai otomatis."
                    : ojek.job
                      ? "Berhenti di dekat penumpang, lalu pilih Ajak bonceng di dunia game."
                      : boarding
                        ? "Tetap berhenti sampai penumpang selesai naik."
                        : "Berhenti di titik jemput agar penumpang naik ke motor."}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="ojek-driver-heading">
                <h3>
                  <span className="ojek-online-dot" data-online={onBid || undefined} />
                  {onBid
                    ? onBike
                      ? "Mencari order"
                      : "Naik motor untuk narik"
                    : "Kamu sedang offline"}
                </h3>
                <span className="ojek-trip-count">{ojek.tripsThisHour} trip</span>
              </div>
              <p className="ojek-driver-hint">
                {onBid
                  ? "Tetap di atas motor. Tawaran baru akan muncul di sini; HP boleh ditutup."
                  : onBike
                    ? "Siap jalan? Aktifkan untuk menerima tawaran penumpang."
                    : "Naik motor terlebih dahulu, lalu aktifkan untuk menerima order."}
              </p>
              <button type="button" className="ojek-driver-motor" onClick={onOpenMotor}>
                <Bike aria-hidden="true" />
                <span>
                  {ojek.motor ? ojek.motor.name : "Belum punya motor?"}
                  <small>
                    {ojek.motor ? "Lihat motor & panggil" : "Gunakan motor umum di parkiran"}
                  </small>
                </span>
                <ArrowRight aria-hidden="true" />
              </button>
              <details className="ojek-player-orders">
                <summary>
                  Order pemain <span>{rides.length}</span>
                </summary>
                {rides.length === 0 ? (
                  <p className="ojek-driver-hint">Belum ada pesanan di channel ini.</p>
                ) : (
                  <ul className="ojek-app-list">
                    {rides.map((r) => (
                      <li key={r.id}>
                        <div className="ojek-list-info">
                          <strong>{r.passenger}</strong>
                          <span>Ke {r.dropoff.name}</span>
                          <b>{rp(r.fare)}</b>
                        </div>
                        <button
                          type="button"
                          className="ojek-action"
                          disabled={busy || ojek.playerTripsThisHour >= ojek.tripsPerHourCap}
                          onClick={() => void ojekCommand("claim_ride", { rideId: r.id })}
                        >
                          Ambil
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {ojek.playerTripsThisHour >= ojek.tripsPerHourCap && (
                  <p className="ojek-driver-hint">Batas trip pemain tercapai. Coba lagi nanti.</p>
                )}
              </details>
              <details className="ojek-app-help">
                <summary>Rating & aturan narik</summary>
                <p>
                  {ojek.npcTripsPerHourCap === null
                    ? "Trip NPC tanpa batas."
                    : `Trip NPC ${ojek.tripsThisHour - ojek.playerTripsThisHour}/${ojek.npcTripsPerHourCap} dalam satu jam terakhir.`}{" "}
                  Rating baik membuat bid lebih ramai.
                </p>
                <p>
                  Dua tawaran berturut-turut boleh dilewati. Mulai yang ketiga, rating −0,1. Trip
                  selesai +0,1. Nonaktif saat ada tawaran dihitung Lewati.
                </p>
              </details>
            </>
          )}
        </section>
      </div>
      <div className="ojek-driver-action">
        {offer ? (
          <div className="ojek-driver-offer-actions">
            <button
              type="button"
              className="ojek-action ojek-action-secondary"
              disabled={busy || !seconds}
              onClick={() => void ojekCommand("decline_bid", { orderId: offer.id })}
            >
              Lewati
            </button>
            <button
              type="button"
              className="ojek-action"
              disabled={busy || !seconds}
              onClick={() => void ojekCommand("accept", { orderId: offer.id })}
            >
              {seconds ? `Terima · ${seconds} dtk` : "Tawaran berakhir"}
            </button>
          </div>
        ) : trip ? (
          <button type="button" className="ojek-action ojek-action-wide" onClick={navigate}>
            <Navigation aria-hidden="true" />
            {toDropoff ? "Lanjutkan perjalanan" : "Menuju titik jemput"}
          </button>
        ) : (
          <button
            type="button"
            role="switch"
            aria-label="Status driver"
            aria-checked={onBid}
            className={`ojek-action ojek-action-wide${onBid ? " ojek-action-secondary" : ""}`}
            disabled={busy}
            onClick={() => void setOnBid(!onBid)}
          >
            <Power aria-hidden="true" />
            {onBid ? "Nonaktifkan" : "Aktifkan"}
          </button>
        )}
      </div>
    </div>
  );
}
