import { BusFront, MapPin } from "lucide-react";
import { GameModal, GameButton } from "@/ui/game-ui/GamePanel";
import { useBusTravel, busStopAt, closeBusMenu, rideBus } from "@/game/world/halte-actions";
import { BUS_FARE, busDestinations } from "@/game/world/bus-routes";

export function BusTravelPanel() {
  const { from, busy, error } = useBusTravel();
  if (!from) return null;
  const fare = `Rp${BUS_FARE.toLocaleString("id-ID")}`;
  return (
    <GameModal
      title="Mau turun di mana?"
      subtitle={`${busStopAt(from)?.name} · ${fare} sekali perjalanan`}
      onClose={closeBusMenu}
      className="bus-travel-panel"
    >
      <p className="bus-travel-hint">
        Bus singgah di halte sepanjang rute untuk menaikkan penumpang. Keliling kota juga {fare}.
      </p>
      <div className="bus-travel-options">
        {busDestinations(from).map((to) => (
          <GameButton key={to.id} disabled={busy} onClick={() => void rideBus(to.id)}>
            {to.id === "keliling" ? (
              <BusFront size={24} aria-hidden />
            ) : (
              <MapPin size={24} aria-hidden />
            )}
            <span>
              <strong>{to.label}</strong>
              <small>{to.description}</small>
            </span>
            <b>{fare}</b>
          </GameButton>
        ))}
      </div>
      {busy && <p role="status">Menyiapkan perjalanan…</p>}
      {error && (
        <p className="bus-travel-error" role="alert">
          {error}
        </p>
      )}
    </GameModal>
  );
}
