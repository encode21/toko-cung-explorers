import { VENUE_DESTINATIONS } from "@/game/club/venue-layout";
import { CASHIER_POS, SHELVES, type ShelfId } from "@/game/world/layout";
import { PLACES } from "@/game/world/places";

export type MapIconKind =
  "store" | "warehouse" | "truck" | "music" | "basket" | "cashier" | "quest";
export type WaypointId =
  | ShelfId
  | "venue-club"
  | "venue-concert"
  | "map-store"
  | "map-warehouse"
  | "map-cashier"
  | `map-place-${string}`;
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
    position: CASHIER_POS,
    interior: true,
  },
  ...VENUE_DESTINATIONS.map((v): MapDestination => ({ ...v, icon: "music" })),
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

export function mapDestination(id: string | null | undefined) {
  return MAP_DESTINATIONS.find((p) => p.id === id);
}
