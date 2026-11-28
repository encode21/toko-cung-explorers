export type DeliveryVehicleType = "motor" | "viar" | "truk";

export interface DeliveryFleetRules {
  motor: number;
  viar: number;
  truk: number;
  max_couriers: number;
  require_truck_courier: boolean;
  max_orders_per_trip: number;
  max_active_orders: number;
  areas: string[];
}

export interface DeliveryVehicle {
  id: number;
  type: DeliveryVehicleType;
  slot: number;
  label: string;
  ownership: "rented" | "owned";
  variant: string | null;
  setoranPercent: number;
  status: "IDLE" | "BUSY" | "BROKEN";
  condition: number;
  tripsTotal: number;
  capacity: number;
}

export interface DealerCatalogItem {
  id: string;
  category: "viar" | "pickup" | "engkel";
  slotType: DeliveryVehicleType;
  name: string;
  price: number;
  capacity: number;
  minLevel: number;
  rainProof: boolean;
  description: string;
}

export interface DeliveryCourier {
  id: number;
  name: string;
  role: "kurir" | "supir_truk";
  status: "IDLE" | "DELIVERING" | "SICK";
  mood: number;
  dailySalary: number;
  commissionPercent: number;
  tripsToday: number;
  lastPaidDay: string | null;
}

export interface DeliveryOrderItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
}

export interface DeliveryGimmick {
  key: string;
  label: string;
  text: string;
  ratingDelta: number;
  delaySeconds: number;
  damageVehicle: number;
}

export interface DeliveryOrder {
  id: number;
  npcName: string;
  npcKey: string | null;
  area: "kampung" | "kota";
  addressLabel: string;
  pos: [number, number, number];
  items: DeliveryOrderItem[];
  boxes: number;
  goodsTotal: number;
  ongkir: number;
  status:
    "PENDING" | "PREPARED" | "DISPATCHED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  vehicleId: number | null;
  vehicleType: DeliveryVehicleType | null;
  courierId: number | null;
  assignedSelf: boolean;
  gimmick: DeliveryGimmick | null;
  etaAt: string | null;
  createdAt: string;
}

export interface DeliveryChat {
  id: number;
  npcName: string;
  npcKey: string | null;
  area: "kampung" | "kota";
  addressLabel: string;
  pos: [number, number, number];
  message: string;
  items: DeliveryOrderItem[];
  boxes: number;
  goodsTotal: number;
  ongkir: number;
  expiresAt: string;
}

export interface DeliverySnapshot {
  enabled: boolean;
  unlocked: boolean;
  rules: DeliveryFleetRules;
  dealerCatalog?: DealerCatalogItem[];
  vehicles: DeliveryVehicle[];
  couriers: DeliveryCourier[];
  orders: DeliveryOrder[];
  chats: DeliveryChat[];
  rating: {
    count: number;
    average: number;
    recent: { id: number; stars: number; comment: string | null }[];
  };
  economy: {
    income: number;
    opex: number;
    setoranKoko?: number;
    net: number;
  };
}

export function deliverySecondsLeft(iso: string | null | undefined, now = Date.now()): number {
  if (!iso) return 0;
  const ms = Date.parse(iso) - now;
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 1000)) : 0;
}
