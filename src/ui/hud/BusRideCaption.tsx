import { useBusService, busBoarding } from "@/game/world/bus-service";
import { busStopAt, openBusMenu, useBusTravel } from "@/game/world/halte-actions";
import { useGame } from "@/state/game-store";
import { BusTravelPanel } from "./BusTravelPanel";
import { skipBusRide, useBusRide } from "@/game/world/bus-ride";

/** Bottom caption while the bus is driving. The street stays visible, unlike the travel card. */
export function BusRideCaption() {
  const riding = useBusRide((s) => s.riding);
  const ready = useBusRide((s) => s.ready);
  const title = useBusRide((s) => s.title);
  const stop = useBusRide((s) => s.stop);
  const waiting = useBusRide((s) => s.waiting);
  const departureIn = useBusRide((s) => s.departureIn);
  const boarded = useBusRide((s) => s.boarded);
  const fade = useBusRide((s) => s.fade);
  const service = useBusService();
  const menu = useBusTravel((s) => s.from);
  const player = useGame((s) => s.playerPos);
  const nearby = service.stop ? busStopAt(service.stop) : null;
  const boarding = service.stop ? busBoarding(service.stop) : null;
  const showArrival =
    !riding &&
    !menu &&
    nearby &&
    boarding?.atStop &&
    Math.hypot(player[0] - nearby.board[0], player[2] - nearby.board[2]) < 18 &&
    player[1] < 3;
  return (
    <>
      <BusTravelPanel />
      {showArrival && (
        <div className="bus-ride-caption" role="status" data-ui-panel>
          <div>
            <strong>Bus di {nearby.name}</strong>
            <small>
              {boarding.canBoard
                ? `Naik sekarang · berangkat ${Math.max(1, Math.ceil((boarding.departureAt - boarding.now) / 1000))} detik lagi`
                : boarding.boardingToken
                  ? "Pintu sedang ditutup · segera berangkat"
                  : "Pintu naik sedang disiapkan…"}
            </small>
          </div>
          <button type="button" onClick={() => openBusMenu(nearby.id)}>
            Pilih tujuan
          </button>
        </div>
      )}
      {riding && (
        <div className="bus-ride-caption" role="status" data-ui-panel>
          <div>
            <strong>{stop ? stop.name : title}</strong>
            <small>
              {!ready
                ? "Menunggu jalur halte kosong…"
                : stop
                  ? waiting
                    ? `${waiting} penumpang naik · berangkat ${departureIn} detik lagi`
                    : `Berangkat ${departureIn} detik lagi`
                  : `${boarded} penumpang naik sepanjang rute`}
            </small>
          </div>
          <small>Geser layar untuk melihat sekeliling</small>
          <button type="button" onClick={skipBusRide}>
            Lewati
          </button>
        </div>
      )}
      {fade > 0.01 && <div className="bus-ride-fade" style={{ opacity: fade }} aria-hidden />}
    </>
  );
}
