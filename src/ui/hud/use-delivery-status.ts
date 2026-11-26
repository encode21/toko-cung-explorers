import { useEffect, useState } from "react";
import { useWarung } from "@/game/warung/store";

/** Shared display state; DeliveryPrompt remains responsible for arrival polling. */
export function useDeliveryStatus() {
  const shipments = useWarung((s) => s.data?.shipments);
  const trucks = (shipments ?? []).filter(
    (shipment) =>
      shipment.mode === "antar" && shipment.etaAt && Number.isFinite(Date.parse(shipment.etaAt)),
  );
  const active = trucks.length > 0;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const boxes = trucks.reduce((sum, shipment) => sum + shipment.boxes, 0);
  const eta = active ? Math.min(...trucks.map((shipment) => Date.parse(shipment.etaAt!))) : 0;
  const left = Math.max(0, Math.ceil((eta - Date.now()) / 1000));
  const countdown = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const description =
    left > 0
      ? `Truk Toko Cung mengantar ${boxes} dus. ${trucks.length > 1 ? "Pengiriman berikutnya" : "Perkiraan tiba"} dalam ${countdown}.`
      : `Truk Toko Cung sedang menurunkan barang. Total kiriman ${boxes} dus.`;

  return { active, boxes, trucks, left, countdown, description };
}
