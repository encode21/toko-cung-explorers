import { useState } from "react";
import { useBusService, busBoarding } from "@/game/world/bus-service";
import { useGang } from "@/game/gang/store";
import { BusFront, MapPin } from "lucide-react";
import { GameModal, GameButton } from "@/ui/game-ui/GamePanel";
import { useBusTravel, busStopAt, closeBusMenu, rideBus } from "@/game/world/halte-actions";
import { BUS_FARE, busDestinations } from "@/game/world/bus-routes";

export function BusTravelPanel() {
  const { from, busy, error } = useBusTravel();
  const gangCount = useGang((s) => s.data?.gangCount ?? 0);
  const home = useGang((s) => s.data?.home.gang ?? null);
  const here = useGang((s) => s.inside);
  const [pickGang, setPickGang] = useState(false);
  useBusService();
  if (!from) {
    if (pickGang) setPickGang(false);
    return null;
  }
  const boarding = busBoarding(from);
  const seconds = Math.max(
    1,
    Math.ceil(
      ((boarding.canBoard ? boarding.departureAt : boarding.arrivalAt) - boarding.now) / 1000,
    ),
  );
  const status = !boarding.synced
    ? "Menghubungkan jadwal bus…"
    : boarding.occupied
      ? "Bus sedang membawa pemain lain · tunggu bus kembali ke halte."
      : boarding.canBoard
        ? `Bus di halte · berangkat ${seconds} detik lagi`
        : boarding.atStop
          ? boarding.boardingToken
            ? "Pintu sedang ditutup · bus segera berangkat"
            : "Bus di halte · menyiapkan pintu naik…"
          : boarding.arrivalAt > boarding.now
            ? "Bus sedang berkeliling · tunggu bus tiba di halte ini."
            : "Tunggu bus berhenti dan pintu terbuka. Bus bisa terlambat jika jalan terhalang.";
  const fare = `Rp${BUS_FARE.toLocaleString("id-ID")}`;
  return (
    <GameModal
      title="Mau turun di mana?"
      subtitle={`${busStopAt(from)?.name} · ${fare} sekali perjalanan`}
      onClose={closeBusMenu}
      className="bus-travel-panel"
    >
      <p role="status" className="bus-travel-hint">
        {status}
      </p>
      <p className="bus-travel-hint">
        Bus singgah di halte sepanjang rute untuk menaikkan penumpang. Keliling kota juga {fare}.
      </p>
      {pickGang ? (
        <div className="bus-travel-options">
          {Array.from({ length: gangCount }, (_, i) => i + 1).map((n) => {
            const current = from === "kampung" && n === here;
            return (
              <GameButton
                key={n}
                disabled={busy || !boarding.canBoard || current}
                onClick={() => void rideBus("gang", n)}
              >
                <MapPin size={24} aria-hidden />
                <span>
                  <strong>Kampung {n}</strong>
                  <small>
                    {current ? "Kamu di sini" : n === home ? "Rumahmu" : "Main ke kampung tetangga"}
                  </small>
                </span>
                <b>{fare}</b>
              </GameButton>
            );
          })}
          <GameButton disabled={busy} onClick={() => setPickGang(false)}>
            <span>
              <strong>Kembali</strong>
              <small>Pilih tujuan lain</small>
            </span>
          </GameButton>
        </div>
      ) : (
        <div className="bus-travel-options">
          {busDestinations(from)
            // From a kampung the gang option needs another kampung to go to.
            .filter((to) => to.id !== "gang" || from !== "kampung" || gangCount > 1)
            .map((to) => (
              <GameButton
                key={to.id}
                disabled={busy || !boarding.canBoard}
                onClick={() =>
                  to.id === "gang" && gangCount > 1 ? setPickGang(true) : void rideBus(to.id)
                }
              >
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
      )}
      {busy && <p role="status">Menyiapkan perjalanan…</p>}
      {error && (
        <p className="bus-travel-error" role="alert">
          {error}
        </p>
      )}
    </GameModal>
  );
}
