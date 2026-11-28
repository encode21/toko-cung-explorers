/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { useWarung } from "@/game/warung/store";
import { WARUNG_LOTS, lotFront } from "@/game/warung/lots";
import type { DealerCatalogItem, DeliveryOrder, DeliveryVehicle } from "./model";

function vehicleKindFor(type: DeliveryVehicle["type"], category?: DealerCatalogItem["category"]) {
  // shortcut: pickup memakai model van sampai ada model pickup sendiri.
  if (category === "pickup") return "van";
  if (category === "engkel") return "truck";
  return type === "motor" ? "motorcycle" : type === "viar" ? "viar" : "truck";
}

function vehicleColorFor(type: DeliveryVehicle["type"]) {
  return type === "motor" ? "#315c46" : type === "viar" ? "#e6a817" : "#d6c471";
}

/** Animates an NPC courier vehicle moving toward the customer's house along a simple lerp. */
function CourierTransitVehicle({
  order,
  origin,
}: {
  order: DeliveryOrder;
  origin: [number, number];
}) {
  const ref = useRef<Group>(null);
  const dx = order.pos[0] - origin[0];
  const dz = order.pos[2] - origin[1];
  const yaw = Math.atan2(dx, dz);

  useFrame(() => {
    if (!ref.current || !order.etaAt) return;
    const etaMs = Date.parse(order.etaAt);
    const totalMs = 35000;
    const remain = Math.max(0, etaMs - Date.now());
    const progress = Math.max(0, Math.min(1, 1 - remain / totalMs));
    ref.current.position.set(origin[0] + dx * progress, 0, origin[1] + dz * progress);
    ref.current.rotation.y = yaw;
  });

  const kind = vehicleKindFor(order.vehicleType ?? "motor");
  const color = vehicleColorFor(order.vehicleType ?? "motor");
  return (
    <group ref={ref} position={[origin[0], 0, origin[1]]}>
      <VehicleModel kind={kind} color={color} rider />
    </group>
  );
}

/**
 * Renders the player's warung delivery fleet (Motor, Viar, Truk) parked near their lot
 * plus any active NPC courier deliveries in transit.
 */
export function DeliveryVehicles() {
  const data = useWarung((s) => s.data);
  const delivery = data?.delivery;
  const warung = data?.warung;
  const lotIndex = (data?.lotMarket as { currentLot?: number | null } | undefined)?.currentLot ?? 6;

  const origin = useMemo<[number, number]>(() => {
    const lot = WARUNG_LOTS[lotIndex] ?? WARUNG_LOTS[6];
    return lot ? lotFront(lot, 3.2) : [-24, 14];
  }, [lotIndex]);

  if (!warung || !delivery || !delivery.unlocked) return null;

  const idleVehicles = delivery.vehicles.filter((v) => v.status !== "BUSY");
  const activeCourierOrders = delivery.orders.filter(
    (o) => !o.assignedSelf && o.status === "IN_TRANSIT" && o.etaAt,
  );

  return (
    <group>
      {idleVehicles.map((v, i) => {
        const category = delivery.dealerCatalog?.find((c) => c.id === v.variant)?.category;
        const offsetX = (i - (idleVehicles.length - 1) / 2) * 2.4;
        return (
          <group key={v.id} position={[origin[0] + offsetX, 0, origin[1]]}>
            <VehicleModel
              kind={vehicleKindFor(v.type, category)}
              color={vehicleColorFor(v.type)}
              emptyBed={v.type !== "viar"}
            />
          </group>
        );
      })}
      {activeCourierOrders.map((order) => (
        <CourierTransitVehicle key={order.id} order={order} origin={origin} />
      ))}
    </group>
  );
}
