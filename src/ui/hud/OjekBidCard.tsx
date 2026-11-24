import { useEffect, useState } from "react";
import { ojekCommand, useOjek } from "@/game/ojek/store";
import { ownVehicle } from "@/game/vehicles/runtime";
import "./ojek-panel.css";

/** One offer, shown either inside the phone or as a non-modal driving notification. */
export function OjekBidCard({ floating = false }: { floating?: boolean }) {
  const offer = useOjek((s) => s.data?.ojek.offer);
  const busy = useOjek((s) => s.busy);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!offer) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [offer]);
  if (!offer) return null;
  const seconds = Math.max(0, Math.ceil((Date.parse(offer.expiresAt) - now) / 1000));
  const payout = ownVehicle()?.mine ? (offer.ownPayout ?? offer.publicPayout) : offer.publicPayout;
  return (
    <section
      className={`ojek-bid${floating ? " ojek-bid-floating" : ""}`}
      data-ojek-bid
      data-hud-control
      aria-label="Tawaran ojol"
    >
      <div className="ojek-bid-heading">
        <strong>🛵 Bid masuk</strong>
        <span>{seconds} dtk</span>
      </div>
      <p>
        <b>{offer.pickup.name}</b> → <b>{offer.dropoff.name}</b>
      </p>
      {offer.label && <small>🛍️ {offer.label}</small>}
      <small>
        {offer.distance} m · Bersih Rp{payout.toLocaleString("id-ID")}
      </small>
      <div className="ojek-bid-actions">
        <button
          type="button"
          disabled={busy || !seconds}
          onClick={() => void ojekCommand("decline_bid", { orderId: offer.id })}
        >
          Lewati
        </button>
        <button
          type="button"
          disabled={busy || !seconds}
          onClick={() => void ojekCommand("accept", { orderId: offer.id })}
        >
          Ambil bid
        </button>
      </div>
    </section>
  );
}
