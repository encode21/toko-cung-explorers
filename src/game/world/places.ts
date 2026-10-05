/**
 * Lokasi nyata di sekitar Toko Cung — diport dari mitra & ekspedisi Toko Cung
 * (SUPPLIERS, COURIERS, REORDER_LIST) di project `toko-cung-insights`.
 * Dipakai Neighborhood untuk memberi nama pada bangunan sekitar.
 */
import { COURIERS, SUPPLIERS } from "@/commerce/products/tokocung-inventory";
import { PARTNER_CENTERS } from "@/game/world/outdoor-layout";

export interface Place {
  id: string;
  name: string;
  subtitle: string;
  /** Posisi [x, z] di dunia. */
  c: [number, number];
  /** Tinggi bangunan (meter). */
  h: number;
  tone: "supplier" | "courier" | "civic";
}

const supplierPlaces: Place[] = SUPPLIERS.slice(0, 4).map((s, i) => ({
  id: `supplier-${i}`,
  name: s.name,
  subtitle: `Supplier · on-time ${s.ontime}%`,
  c: PARTNER_CENTERS[i] ?? [-17, 35],
  h: 9 + (i % 3) * 2,
  tone: "supplier",
}));

const courierPlaces: Place[] = COURIERS.map((c, i) => ({
  id: `courier-${c.name}`,
  name: `${c.name} Drop Point`,
  subtitle: `${c.inTransit} pengiriman berjalan`,
  c: PARTNER_CENTERS[4 + i] ?? [35, 35],
  h: 8 + (i % 2) * 3,
  tone: "courier",
}));

export const PLACES: Place[] = [
  ...supplierPlaces,
  ...courierPlaces,
  {
    id: "pasar",
    name: "Pasar Warga",
    subtitle: "Pemasok sayur & telur harian",
    c: PARTNER_CENTERS[7] ?? [-44, 35],
    h: 7,
    tone: "civic",
  },
];

export const PLACE_TONE_COLOR: Record<Place["tone"], string> = {
  supplier: "#2f7d59",
  courier: "#d99a3c",
  civic: "#57a37b",
};
