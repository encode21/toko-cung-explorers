import { Navigation, PackageCheck } from "lucide-react";
import { useWarung } from "@/game/warung/store";
import { activeSelfOrders, deliveryCommand, useDelivery } from "@/game/delivery/store";
import { useGame } from "@/state/game-store";
import "./delivery-panel.css";

/** Floating HUD tracker when the player is personally delivering an order. */
export function DeliveryTracking() {
  const delivery = useWarung((s) => s.data?.delivery);
  const inWarung = useWarung((s) => !!s.inside);
  const playerPos = useGame((s) => s.playerPos);
  const setWaypoint = useGame((s) => s.setWaypoint);
  const activeSelfOrderId = useDelivery((s) => s.activeSelfOrderId);
  const busy = useDelivery((s) => s.busy);

  if (inWarung || !delivery) return null;
  const selfOrders = activeSelfOrders(delivery);
  if (selfOrders.length === 0) return null;

  const order = selfOrders.find((o) => o.id === activeSelfOrderId) ?? selfOrders[0]!;
  const dist = Math.round(
    Math.hypot(playerPos[0] - order.pos[0], playerPos[2] - order.pos[2]),
  );
  const arrived = dist <= 8;

  return (
    <aside className="delivery-hud-pill" aria-label="Pengantaran aktif">
      <h5>
        📦 Antar ke {order.npcName}
      </h5>
      <div className="delivery-muted">
        {order.addressLabel} · <strong>{dist} m</strong>
      </div>
      {order.gimmick && (
        <div className="delivery-badge delivery-badge--warn">{order.gimmick.label}</div>
      )}
      <div className="delivery-actions">
        <button
          type="button"
          className="delivery-btn delivery-btn--secondary"
          onClick={() => setWaypoint("delivery-target")}
        >
          <Navigation size={13} aria-hidden /> Arah
        </button>
        <button
          type="button"
          className="delivery-btn delivery-btn--accent"
          disabled={busy || !arrived}
          title={arrived ? "Serahkan paket sekarang" : "Dekati rumah NPC (≤ 8 m)"}
          onClick={() => void deliveryCommand("delivery_complete", { orderId: order.id })}
        >
          <PackageCheck size={13} aria-hidden /> {arrived ? "Serahkan" : `${dist} m lagi`}
        </button>
      </div>
    </aside>
  );
}
