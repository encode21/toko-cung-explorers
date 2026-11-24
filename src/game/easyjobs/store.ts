import { create } from "zustand";
import { useFishing } from "@/game/fishing/store";
import { useGame } from "@/state/game-store";
import { fishPrice, kuliDrop, kuliExpired, kuliStart, FRUIT_PRICE, type KuliJob } from "./model";

// shortcut: client-only reward, needs a server endpoint before money is real.
// All "dompet" amounts below are an in-memory tally; nothing is granted server-side.
interface EasyJobs {
  dompet: number;
  basket: Record<string, number>;
  fishBag: number[];
  pickedAt: Record<string, number>;
  lastPickAt: number;
  kuli: KuliJob | null;
}
export const useEasyJobs = create<EasyJobs>(() => ({
  dompet: 0,
  basket: {},
  fishBag: [],
  pickedAt: {},
  lastPickAt: 0,
  kuli: null,
}));
const toast = (m: string) => useGame.getState().setToast(m);
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export function pickFruit(id: string, fruit: string) {
  const now = Date.now();
  useEasyJobs.setState((s) => ({
    pickedAt: { ...s.pickedAt, [id]: now },
    basket: { ...s.basket, [fruit]: (s.basket[fruit] ?? 0) + 1 },
    lastPickAt: now,
  }));
}
export function sellFruit() {
  const { basket } = useEasyJobs.getState();
  const total = Object.entries(basket).reduce((n, [f, c]) => n + c * (FRUIT_PRICE[f] ?? 0), 0);
  if (!total) return;
  useEasyJobs.setState((s) => ({ basket: {}, dompet: s.dompet + total }));
  toast(`Buah terjual +${rp(total)}`);
}
export function sellFish() {
  const { fishBag } = useEasyJobs.getState();
  const total = fishBag.reduce((n, p) => n + p, 0);
  if (!total) return;
  useEasyJobs.setState((s) => ({ fishBag: [], dompet: s.dompet + total }));
  toast(`Ikan terjual +${rp(total)}`);
}
export function startKuli() {
  useEasyJobs.setState({ kuli: kuliStart(Date.now()) });
  toast("Kuli angkut: ambil karung di truk, antar ke kios yang bertanda");
}
export function pickupKarung() {
  useEasyJobs.setState((s) => ({ kuli: s.kuli && { ...s.kuli, carrying: true } }));
}
export function dropKarung() {
  const job = useEasyJobs.getState().kuli;
  if (!job) return;
  const r = kuliDrop(job);
  useEasyJobs.setState((s) => ({ kuli: r.job, dompet: s.dompet + r.pay }));
  toast(r.job ? `Antar sukses +${rp(r.pay)}` : `Kerja selesai! +${rp(r.pay)}`);
}
export function tickKuli() {
  const job = useEasyJobs.getState().kuli;
  if (job && kuliExpired(job, Date.now())) {
    useEasyJobs.setState({ kuli: null });
    toast("Waktu habis, kerja kuli dibatalkan");
  }
}
/** Avatar clip for the local player while an easy job is active. */
export function easyJobAnimation() {
  const s = useEasyJobs.getState();
  if (Date.now() - s.lastPickAt < 900) return "PickItem";
  return s.kuli?.carrying ? "CarryBox" : undefined;
}

// A fresh catch goes into the fish bag so it can be sold at the fish stall.
let lastCast = "";
useFishing.subscribe((s) => {
  const cast = s.data?.cast,
    caught = s.data?.catch;
  if (cast?.status !== "caught" || !caught || cast.id === lastCast) return;
  lastCast = cast.id;
  useEasyJobs.setState((e) => ({ fishBag: [...e.fishBag, fishPrice(caught.tier, caught.sizeCm)] }));
});
