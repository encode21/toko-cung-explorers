/**
 * Zona operasional Toko Cung.
 * Definisi label + footprint diport dari `toko-cung-insights`
 * (src/components/office3d/scene-state.ts → zoneBounds/zoneState) lalu
 * dipetakan ke koordinat dunia ini (toko: x -9..9, z -13..3; gudang z -22..-13).
 */

export type ZoneTone = "normal" | "warning";

export interface WorldZone {
  id: string;
  label: string;
  hint: string;
  tone: ZoneTone;
  /** Titik tengah [x, z]. */
  c: [number, number];
  /** Ukuran [lebar, kedalaman]. */
  s: [number, number];
}

export const ZONES: WorldZone[] = [
  { id: "retail", label: "Area Retail", hint: "Rak makanan, snack, minuman", tone: "normal", c: [5, -5.5], s: [7.4, 12] },
  { id: "packing", label: "Area Packing", hint: "Bungkus pesanan online", tone: "warning", c: [-4.2, -16.4], s: [8, 5.6] },
  { id: "cashier1", label: "Kasir 1", hint: "Antrean pendek", tone: "normal", c: [5.6, 1.2], s: [3.6, 2.4] },
  { id: "cashier2", label: "Kasir 2", hint: "Kasir kedua", tone: "normal", c: [1.4, 1.2], s: [3.6, 2.4] },
  { id: "ownerCashier", label: "Owner", hint: "Pak Cung menjaga kasir", tone: "normal", c: [-6.4, -11], s: [3.6, 2.6] },
  { id: "warehouse", label: "Gudang", hint: "Stok & palet", tone: "warning", c: [4.4, -17.6], s: [8.6, 8], },
  { id: "courierPickup", label: "Pickup Kurir", hint: "Serah terima paket", tone: "warning", c: [9.5, 9.5], s: [4.6, 4] },
];
