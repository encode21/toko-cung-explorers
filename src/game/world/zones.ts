/** Map V2 semantic footprints. Metadata only: no event dispatch or permissions. */
export type ZoneTone = "normal" | "warning";
export interface WorldZone {
  id:
    "entrance" | "retail" | "cashier" | "promo" | "warehouse" | "loading" | "sidewalk" | "parking";
  label: string;
  hint: string;
  tone: ZoneTone;
  floor: 1;
  c: [number, number];
  s: [number, number];
}
export const ZONES: WorldZone[] = [
  {
    id: "entrance",
    label: "Pintu Masuk",
    hint: "Masuk melalui kanopi",
    tone: "normal",
    floor: 1,
    c: [0, 5],
    s: [3.4, 4],
  },
  {
    id: "retail",
    label: "Retail",
    hint: "Belanja kebutuhan harian",
    tone: "normal",
    floor: 1,
    c: [0, -6],
    s: [17.6, 13],
  },
  {
    id: "cashier",
    label: "Kasir",
    hint: "Pembayaran & layanan",
    tone: "normal",
    floor: 1,
    c: [5.6, 1.2],
    s: [4.2, 3],
  },
  {
    id: "promo",
    label: "Promo",
    hint: "Pilihan hemat",
    tone: "normal",
    floor: 1,
    c: [-2.6, 0.6],
    s: [2.2, 2],
  },
  {
    id: "warehouse",
    label: "Gudang & Packing",
    hint: "Stok dan persiapan pesanan",
    tone: "warning",
    floor: 1,
    c: [0, -17.5],
    s: [18, 9],
  },
  {
    id: "loading",
    label: "Loading",
    hint: "Bongkar muat via pintu belakang",
    tone: "warning",
    floor: 1,
    c: [0, -26],
    s: [19, 5],
  },
  {
    id: "sidewalk",
    label: "Trotoar Depan",
    hint: "Jalur pejalan kaki",
    tone: "normal",
    floor: 1,
    c: [0, 11.7],
    s: [28, 2],
  },
  {
    id: "parking",
    label: "Parkir",
    hint: "Parkir pelanggan",
    tone: "normal",
    floor: 1,
    c: [-9, 7.8],
    s: [10, 6.4],
  },
];
