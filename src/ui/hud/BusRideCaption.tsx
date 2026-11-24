import { skipBusRide, useBusRide } from "@/game/world/bus-ride";

/** Bottom caption while the bus is driving. The street stays visible, unlike the travel card. */
export function BusRideCaption() {
  const riding = useBusRide((s) => s.riding);
  const title = useBusRide((s) => s.title);
  const fade = useBusRide((s) => s.fade);
  return (
    <>
      {riding && (
        <div className="bus-ride-caption" role="status">
          <strong>{title}</strong>
          <button type="button" onClick={skipBusRide}>
            Lewati
          </button>
        </div>
      )}
      {fade > 0.01 && <div className="bus-ride-fade" style={{ opacity: fade }} aria-hidden />}
    </>
  );
}
