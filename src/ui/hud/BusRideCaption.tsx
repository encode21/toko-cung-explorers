import { BusTravelPanel } from "./BusTravelPanel";
import { skipBusRide, useBusRide } from "@/game/world/bus-ride";

/** Bottom caption while the bus is driving. The street stays visible, unlike the travel card. */
export function BusRideCaption() {
  const riding = useBusRide((s) => s.riding);
  const ready = useBusRide((s) => s.ready);
  const title = useBusRide((s) => s.title);
  const stop = useBusRide((s) => s.stop);
  const waiting = useBusRide((s) => s.waiting);
  const boarded = useBusRide((s) => s.boarded);
  const fade = useBusRide((s) => s.fade);
  return (
    <>
      <BusTravelPanel />
      {riding && (
        <div className="bus-ride-caption" role="status">
          <div>
            <strong>{stop ? stop.name : title}</strong>
            <small>
              {!ready
                ? "Menunggu jalur halte kosong…"
                : stop
                  ? waiting
                    ? `${waiting} penumpang sedang naik`
                    : "Menunggu penumpang"
                  : `${boarded} penumpang naik sepanjang rute`}
            </small>
          </div>
          <button type="button" onClick={skipBusRide}>
            Lewati
          </button>
        </div>
      )}
      {fade > 0.01 && <div className="bus-ride-fade" style={{ opacity: fade }} aria-hidden />}
    </>
  );
}
