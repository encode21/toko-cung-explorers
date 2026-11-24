import { create } from "zustand";
import { useFishing } from "@/game/fishing/store";
import { takeEnergy } from "@/game/energy/store";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { useGame } from "@/state/game-store";
import { useWarung } from "@/game/warung/store";
import { KULI_TIME_MS, kuliExpired, type KuliJob } from "./model";

/** Server `jobs` response: basket, kuli job and unsold fish are the server's; Kas is the shared Kas usaha. */
interface JobsResponse {
  jobs: {
    basket: Record<string, number>;
    kuli: { delivered: number; endsAt: number } | null;
    fishForSale: { price: number; fishId: string }[];
  };
  paid: number;
  kas: { cash: number | null };
}
interface EasyJobs {
  basket: Record<string, number>;
  /** Price of each unsold fish, from the server. */
  fishBag: number[];
  /** Species id of each unsold fish (same order as fishBag), for the kiosk list. */
  fishIds: string[];
  pickedAt: Record<string, number>;
  lastPickAt: number;
  kuli: KuliJob | null;
}
export const useEasyJobs = create<EasyJobs>(() => ({
  basket: {},
  fishBag: [],
  fishIds: [],
  pickedAt: {},
  lastPickAt: 0,
  kuli: null,
}));
const toast = (m: string) => useGame.getState().setToast(m);
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

async function jobs(action: string, extra: Record<string, unknown> = {}) {
  try {
    const r = await worldRequest<JobsResponse>("jobs", { action, requestId: createId(), ...extra });
    takeEnergy(r);
    const { cash } = r.kas;
    if (cash != null)
      useWarung.setState((w) =>
        w.data?.warung ? { data: { ...w.data, warung: { ...w.data.warung, cash } } } : w,
      );
    useEasyJobs.setState((s) => ({
      basket: r.jobs.basket,
      fishBag: r.jobs.fishForSale.map((f) => f.price),
      fishIds: r.jobs.fishForSale.map((f) => f.fishId),
      kuli: r.jobs.kuli && {
        startedAt: r.jobs.kuli.endsAt - KULI_TIME_MS,
        done: r.jobs.kuli.delivered,
        carrying: s.kuli?.done === r.jobs.kuli.delivered && s.kuli.carrying,
      },
    }));
    return r;
  } catch (e) {
    if (action !== "read") toast(e instanceof Error ? e.message : "Gagal, coba lagi.");
    return null;
  }
}
export const loadJobs = () => jobs("read");

export async function pickFruit(id: string) {
  if (!(await jobs("pick", { treeId: id }))) return;
  const now = Date.now();
  useEasyJobs.setState((s) => ({ pickedAt: { ...s.pickedAt, [id]: now }, lastPickAt: now }));
}
export async function sellFruit() {
  const r = await jobs("sell_fruit");
  if (r) toast(`Buah terjual +${rp(r.paid)}`);
}
export async function sellFish() {
  const r = await jobs("sell_fish");
  if (r) toast(`Ikan terjual +${rp(r.paid)}`);
}
export async function startKuli() {
  if (await jobs("kuli_start"))
    toast("Kuli angkut: ambil karung di truk, antar ke kios yang bertanda");
}
export function pickupKarung() {
  useEasyJobs.setState((s) => ({ kuli: s.kuli && { ...s.kuli, carrying: true } }));
}
export async function dropKarung() {
  const r = await jobs("kuli_deliver");
  if (r) toast(r.jobs.kuli ? `Antar sukses +${rp(r.paid)}` : `Kerja selesai! +${rp(r.paid)}`);
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

// A fresh catch is stored by the server: reload so it shows up for sale at the fish stall.
let lastCast = "";
useFishing.subscribe((s) => {
  const cast = s.data?.cast;
  if (cast?.status !== "caught" || !s.data?.catch || cast.id === lastCast) return;
  lastCast = cast.id;
  void loadJobs();
});
