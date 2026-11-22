import { CITY_HELIPAD } from "@/game/mountain/model";
import { EXPANSION_DESTINATIONS } from "../world/expansion-plan";
import { VENUE_DESTINATIONS } from "@/game/club/venue-layout";
import { BEACH_DESTINATION } from "@/game/swimming/model";
import { FISHING_DESTINATION } from "@/game/fishing/model";
import { CASHIER_APPROACH, SHELVES, type ShelfId } from "@/game/world/layout";
import { PLACES } from "@/game/world/places";
import { debtorSpot } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { useOjek } from "@/game/ojek/store";
import { USAHA_LOTS } from "@/game/usaha/model";
import { WARUNG_LOTS, lotFront } from "@/game/warung/lots";

export type MapIconKind =
  "store" | "warehouse" | "truck" | "music" | "basket" | "cashier" | "quest";
export type WaypointId =
  | ShelfId
  | (typeof EXPANSION_DESTINATIONS)[number]["id"]
  | "venue-helicopter"
  | "venue-club"
  | "venue-concert"
  | "venue-fishing"
  | "venue-beach"
  | "map-store"
  | "map-warehouse"
  | "map-cashier"
  | `map-place-${string}`
  | `warung-debt-${number}`
  | "warung-thief"
  | "ojek-pickup"
  | "ojek-dropoff"
  | "usaha-warung"
  | "usaha-warteg"
  | "usaha-kos";
export interface MapDestination {
  id: WaypointId;
  label: string;
  detail: string;
  icon: MapIconKind;
  position: readonly [number, number, number];
  /** Position of the building icon, distinct from its accessible entrance. */
  marker?: readonly [number, number];
  interior?: boolean;
}

/** One registry for map details, ground arrows and the destination beacon. */
export const MAP_DESTINATIONS: MapDestination[] = [
  {
    id: "venue-helicopter",
    label: "Helipad Kota",
    detail: "Naik helikopter menuju basecamp Pegunungan. Dekati pintu helikopter untuk berangkat.",
    icon: "quest",
    position: CITY_HELIPAD.boarding,
    marker: [CITY_HELIPAD.position[0], CITY_HELIPAD.position[2]],
  },
  ...EXPANSION_DESTINATIONS.map((v): MapDestination => ({ ...v, icon: "quest" })),
  {
    id: "map-store",
    label: "Toko Cung",
    detail:
      "Belanja kebutuhan harian dan temui warga di Toko Cung. Masuk melalui pintu depan toko.",
    icon: "store",
    position: [0, 0, 4],
    marker: [0, -5],
  },
  {
    id: "map-warehouse",
    label: "Gudang",
    detail: "Area stok, packing, dan bongkar muat Toko Cung. Akses melalui pintu belakang gudang.",
    icon: "warehouse",
    position: [0, 0, -24],
    marker: [0, -18],
  },
  {
    id: "map-cashier",
    label: "Kasir",
    detail: "Selesaikan belanjamu di kasir setelah memilih barang dari rak toko.",
    icon: "cashier",
    position: CASHIER_APPROACH,
    interior: true,
  },
  ...(["warteg", "kos"] as const).map((kind): MapDestination => {
    const lot = USAHA_LOTS[kind];
    const [x, z] = lotFront(lot);
    return {
      id: `usaha-${kind}`,
      label: kind === "warteg" ? "Warteg" : "Kos-kosan",
      detail:
        kind === "warteg"
          ? "Ruko warteg yang bisa dibeli pakai Kas usaha. Masuk lewat pintu depan."
          : "Rumah kos yang bisa dibeli pakai Kas usaha. Masuk lewat pintu depan.",
      icon: "store",
      position: [x, 0, z],
      marker: [lot.x, lot.z],
    };
  }),
  ...VENUE_DESTINATIONS.map((v): MapDestination => ({ ...v, icon: "music" })),
  {
    id: FISHING_DESTINATION.id,
    label: FISHING_DESTINATION.label,
    detail: FISHING_DESTINATION.detail,
    icon: "quest",
    position: FISHING_DESTINATION.position,
  },
  {
    id: BEACH_DESTINATION.id,
    label: BEACH_DESTINATION.label,
    detail: BEACH_DESTINATION.detail,
    icon: "quest",
    position: BEACH_DESTINATION.position,
  },
  ...SHELVES.map((s): MapDestination => ({
    ...s,
    icon: "basket",
    detail: "Temukan produk di rak ini, lalu lanjutkan belanjamu ke kasir.",
    interior: true,
  })),
  ...PLACES.map((p): MapDestination => ({
    id: `map-place-${p.id}`,
    label: p.name,
    detail:
      p.tone === "courier"
        ? "Drop point ekspedisi di lingkungan Toko Cung."
        : p.tone === "civic"
          ? p.subtitle
          : "Mitra pemasok di lingkungan Toko Cung.",
    icon: p.tone === "courier" ? "truck" : "store",
    marker: p.c,
    // Partner shop fronts face the road to the north (rotation PI).
    position: [p.c[0], 0, p.c[1] - 5],
  })),
];

export function mapDestination(id: string | null | undefined): MapDestination | undefined {
  if (id === "ojek-pickup" || id === "ojek-dropoff") {
    const order = useOjek.getState().data?.ojek.order;
    const spot = order && (id === "ojek-pickup" ? order.pickup : order.dropoff);
    if (spot) {
      return {
        id,
        label: `🛵 ${spot.name}`,
        detail:
          id === "ojek-pickup" ? "Jemput penumpang ojek di sini." : "Antar penumpang ojek ke sini.",
        icon: "quest",
        position: [spot.x, 0, spot.z],
        marker: [spot.x, spot.z],
      };
    }
  }
  if (id === "usaha-warung") {
    const { data, lots } = useWarung.getState();
    const card = lots.find((l) => l.id === data?.warung?.id);
    const lot = card && WARUNG_LOTS[card.lot];
    if (lot) {
      const [x, z] = lotFront(lot);
      return {
        id,
        label: "Warungku",
        detail: "Warung milikmu. Masuk lewat pintu depan.",
        icon: "store",
        position: [x, 0, z],
        marker: [lot.x, lot.z],
      };
    }
  }
  if (id === "warung-thief") {
    const thief = useWarung.getState().thief;
    if (thief) {
      return {
        id: "warung-thief",
        label: `🚨 ${thief.name}`,
        detail: "Kejar dan tabrak pencuri sebelum kabur membawa Kas & stok warungmu!",
        icon: "quest",
        position: [thief.x, 0, thief.z],
        marker: [thief.x, thief.z],
      };
    }
  }
  if (id?.startsWith("warung-debt-")) {
    const debtId = Number(id.slice("warung-debt-".length));
    if (Number.isFinite(debtId)) {
      const spot = debtorSpot(debtId);
      return {
        id: id as WaypointId,
        label: "Penghutang Warung",
        detail: `Temui penghutang di ${spot.area} untuk menagih utang langsung.`,
        icon: "quest",
        position: [spot.x, 0, spot.z],
        marker: [spot.x, spot.z],
      };
    }
  }
  return MAP_DESTINATIONS.find((p) => p.id === id);
}
