import type { ArchiveEntry } from "./types";

/** Public archive catalog — lore only, never includes puzzle answers. */
export const RAHASIA_ARCHIVES: ArchiveEntry[] = [
  {
    id: "archive-01",
    index: 1,
    title: "Jejak Pertama",
    lore: "Pesanan melewati picking dan packing sebelum diserahkan ke kurir.",
  },
  {
    id: "archive-02",
    index: 2,
    title: "Suara Gudang",
    lore: "Nakama Gudang menjaga alur barang dari rak ke meja packing.",
  },
  {
    id: "archive-03",
    index: 3,
    title: "Parkir Kurir",
    lore: "Area pickup punya jalur khusus motor kurir untuk serah terima.",
  },
  {
    id: "archive-04",
    index: 4,
    title: "Label Senyap",
    lore: "Label batch menempel sebelum paket menunggu di pickup.",
  },
  {
    id: "archive-05",
    index: 5,
    title: "Urutan Operasi",
    lore: "Order masuk → picking → packing → pickup menjaga janji kirim.",
  },
  {
    id: "archive-06",
    index: 6,
    title: "Teka-teki Area Pickup",
    lore: "Di area pickup, paket yang sudah di-packing diserahkan kepada kurir.",
  },
  {
    id: "archive-07",
    index: 7,
    title: "Arsip Dunia Toko Cung",
    lore: "Rahasia Chapter 1 mengajak mengamati, bukan hanya mengikuti panah.",
  },
];

export function archiveUnlockKey(id: string) {
  return `secret:${id}`;
}
