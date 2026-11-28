import { create } from "zustand";
import { createId } from "@/lib/id";
import { warungCommand, useWarung } from "@/game/warung/store";
import type { DeliveryOrder, DeliverySnapshot } from "./model";

export interface DeliveryState {
  busy: boolean;
  error: string | null;
  /** Currently tracked self-delivery order ID (for HUD waypoint & handover). */
  activeSelfOrderId: number | null;
  setActiveSelfOrderId: (id: number | null) => void;
  clearError: () => void;
}

export const useDelivery = create<DeliveryState>((set) => ({
  busy: false,
  error: null,
  activeSelfOrderId: null,
  setActiveSelfOrderId: (id) => set({ activeSelfOrderId: id }),
  clearError: () => set({ error: null }),
}));

export function getDeliverySnapshot(): DeliverySnapshot | null {
  return (
    (useWarung.getState().data as { delivery?: DeliverySnapshot | null } | null)?.delivery ?? null
  );
}

export function activeSelfOrders(delivery: DeliverySnapshot | null | undefined): DeliveryOrder[] {
  if (!delivery) return [];
  return delivery.orders.filter(
    (o) => o.assignedSelf && (o.status === "DISPATCHED" || o.status === "IN_TRANSIT"),
  );
}

export async function deliveryCommand(
  action:
    | "delivery_read"
    | "delivery_request_chat"
    | "delivery_accept"
    | "delivery_reject"
    | "delivery_prepare"
    | "delivery_dispatch"
    | "delivery_pickup"
    | "delivery_complete"
    | "delivery_courier_hire"
    | "delivery_courier_fire"
    | "delivery_courier_pay"
    | "delivery_repair"
    | "delivery_buy_vehicle",
  payload: Record<string, unknown> = {},
): Promise<boolean> {
  useDelivery.setState({ busy: true, error: null });
  try {
    const needsRequestId = [
      "delivery_accept",
      "delivery_dispatch",
      "delivery_complete",
      "delivery_courier_hire",
      "delivery_courier_pay",
      "delivery_repair",
      "delivery_buy_vehicle",
    ].includes(action);
    const data = needsRequestId ? { requestId: createId(), ...payload } : payload;
    await warungCommand(action as Parameters<typeof warungCommand>[0], data);
    const snap = getDeliverySnapshot();
    const selfOrders = activeSelfOrders(snap);
    const currentTracked = useDelivery.getState().activeSelfOrderId;
    if (selfOrders.length > 0 && !selfOrders.some((o) => o.id === currentTracked)) {
      useDelivery.setState({ activeSelfOrderId: selfOrders[0]!.id });
    } else if (selfOrders.length === 0 && currentTracked !== null) {
      useDelivery.setState({ activeSelfOrderId: null });
    }
    return true;
  } catch (err) {
    useDelivery.setState({
      error: err instanceof Error ? err.message : "Gagal memproses pengantaran.",
    });
    return false;
  } finally {
    useDelivery.setState({ busy: false });
  }
}
