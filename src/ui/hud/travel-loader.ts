import { create } from "zustand";

export type LoaderArt = "bus" | "rumah" | "gang";
type Loader = { title: string; subtitle: string; art: LoaderArt; since: number; minMs: number };

/** Scene-change loading card. Shown by travel code; hidden once the teleport landed and minMs passed. */
export const useLoader = create<{ loader: Loader | null }>(() => ({ loader: null }));

export function showLoader(title: string, subtitle: string, art: LoaderArt, minMs = 1400) {
  useLoader.setState({ loader: { title, subtitle, art, since: Date.now(), minMs } });
}
export function hideLoader() {
  useLoader.setState({ loader: null });
}
/** Max time a loader may stay up, so a failed request can never freeze the screen. */
export const LOADER_TIMEOUT_MS = 10_000;
export function loaderDone(l: Loader, now: number, teleportPending: boolean) {
  const elapsed = now - l.since;
  return elapsed >= LOADER_TIMEOUT_MS || (elapsed >= l.minMs && !teleportPending);
}

export const LOADER_TIPS = [
  "Tips: Banjir bikin jalan lambat, cari jalan yang lebih tinggi.",
  "Tips: Bus ke Gang Kampung berangkat dari halte samping gerbang.",
  "Tips: Kulakan di Toko Cung bisa bayar QRIS, transfer, atau VA lewat CngBank.",
  "Tips: Sapa tetangga di gang, siapa tahu ada titipan.",
  "Tips: Tidur di rumah setelah warung tutup biar besok segar.",
  "Tips: Pas hujan, warga suka ngumpul di warung. Siapin stok kopi!",
];
