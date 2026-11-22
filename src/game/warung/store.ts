import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { createId } from "@/lib/id";
import { useClub } from "@/game/club/store";
import { useDungeon } from "@/game/dungeon/store";
import { useFishing } from "@/game/fishing/store";
import { miniParticipant } from "@/game/minigames/store";
import { useMobility } from "@/game/mobility/store";
import { isMountainPosition } from "@/game/mountain/model";
import { vehicleFor } from "@/game/vehicles/model";
import {
  CUSTOMER_WALK_MS,
  debtorSpot,
  makeOrder,
  rupiah,
  warungOrigin,
  type CustomerPersonality,
  type WarungDebt,
  type WarungEventKind,
  type WarungStock,
  type LotCard,
  type WarungLeaderboard,
  type MyWarung,
  type OrderLine,
  type PublicWarung,
  type WarungDirectory,
  type WarungSnapshot,
} from "./model";
import { WARUNG_LOTS, lotFront } from "./lots";

export interface WarungCustomer {
  id: string;
  name: string;
  avatar: string;
  personality: CustomerPersonality;
  traitLabel: string;
  line: string;
  waitMs: number;
  arrivedAt: number;
  leavingAt: number | null;
  reaction?: string;
  /** Story visitor for this pending event (ngutang / iuran / ojol / palak). */
  eventId?: number;
  eventKind?: WarungEventKind;
  /** Empty-rack visitor who asked for specific items before leaving. */
  emptyStockAsk?: boolean;
  wantedItems?: OrderLine[];
  emptyReply?: "wait" | "refuse";
}

export interface RecommendedRestock {
  customerName: string;
  avatar: string;
  personality: CustomerPersonality;
  traitLabel: string;
  items: OrderLine[];
  createdAt: number;
  fulfilled?: boolean;
}

export interface ServeFeedback {
  kind: "fast" | "normal" | "slow";
  text: string;
  at: number;
}

export interface ActiveThief {
  id: string;
  name: string;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  startedAt: number;
  deadlineAt: number;
}

interface WarungStore {
  data: WarungSnapshot | null;
  directory: WarungDirectory | null;
  /** Warung the player is standing in (own or visited); null = outside. */
  inside: PublicWarung | null;
  /** Where to return to on exit. */
  returnTo: [number, number, number] | null;
  /** Walk-in customer waiting at the counter (own warung, or part-time shift). */
  order: OrderLine[] | null;
  /** City house lots showing warungs in this channel. */
  lots: LotCard[];
  /** Active queue of NPCs inside the warung (front = index 0, max 3). */
  customers: WarungCustomer[];
  /** Front customer alias (same as customers[0] ?? null). */
  customer: WarungCustomer | null;
  nextCustomerAt: number;
  /** Consecutive fast serves ("Cekatan!") streak. */
  serveStreak: number;
  lastServeFeedback: ServeFeedback | null;
  /** Customer-requested items saved when a buyer agreed to wait for kulakan. */
  recommendedRestock: RecommendedRestock | null;
  /** True = warung dikunci aman (default sebelum masuk); false = ditinggal buka & rawan maling! */
  locked: boolean;
  /** Active fleeing thief when the player left their warung unlocked. */
  thief: ActiveThief | null;
  nextThiefAt: number;
  /** Weekly omzet board (NPC + player sales). */
  leaderboard: WarungLeaderboard | null;
  /** Tab the Warungku panel should open on (e.g. "kulakan" from the Toko Cung prompt). */
  panelTab: string | null;
  /** Kulakan keranjang: picked at Toko Cung shelves, paid at the cashier. */
  basket: OrderLine[];
  /** Shelf zone the Kulakan tab is showing (null = whole catalog). */
  shelfFilter: string | null;
  busy: boolean;
  error: string;
}

export const useWarung = create<WarungStore>(() => ({
  data: null,
  directory: null,
  inside: null,
  returnTo: null,
  order: null,
  lots: [],
  customers: [],
  customer: null,
  nextCustomerAt: 0,
  serveStreak: 0,
  lastServeFeedback: null,
  recommendedRestock: null,
  locked: true,
  thief: null,
  nextThiefAt: 0,
  leaderboard: null,
  panelTab: null,
  basket: [],
  shelfFilter: null,
  busy: false,
  error: "",
}));

type VisitResult = { visit: PublicWarung; warung: MyWarung | null };
type WorkResult = VisitResult & { wage: number | null; savings: number };

function asPublic(w: MyWarung, ownerName: string | null): PublicWarung {
  return { ...w, ownerName };
}
export function isOwnWarung() {
  const s = useWarung.getState();
  return !!s.inside && s.inside.id === s.data?.warung?.id;
}

function setQueue(customers: WarungCustomer[], extra: Partial<WarungStore> = {}) {
  useWarung.setState({ customers, customer: customers[0] ?? null, ...extra });
}

async function run<T>(action: string, extra: Record<string, unknown> = {}): Promise<T | null> {
  if (useWarung.getState().busy) return null;
  useWarung.setState({ busy: true, error: "" });
  try {
    return await worldRequest<T>("warung", { action, ...extra });
  } catch (e) {
    useWarung.setState({
      error: e instanceof Error ? e.message : "Warung sementara tidak tersedia.",
    });
    return null;
  } finally {
    useWarung.setState({ busy: false });
  }
}

/** Owner actions return the owner snapshot; keep the 3D room in sync when standing inside. */
export async function warungCommand(action: string, extra: Record<string, unknown> = {}) {
  const needsId = [
    "restock",
    "serve",
    "upgrade",
    "theft_loss",
    "pay_rent",
    "story_claim",
    "kulakan",
  ].includes(action);
  const s = await run<WarungSnapshot>(
    action,
    needsId ? { requestId: createId(), ...extra } : extra,
  );
  if (!s) return null;
  applySnapshot(s);
  return s;
}

function applySnapshot(s: WarungSnapshot) {
  const { inside, recommendedRestock } = useWarung.getState();
  const recFulfilled =
    !!recommendedRestock &&
    !!s.warung &&
    recommendedRestock.items.every(
      (req) => (s.warung!.stock.find((st) => st.itemId === req.itemId)?.qty ?? 0) >= req.qty,
    );
  useWarung.setState({
    data: s,
    inside:
      inside && s.warung && inside.id === s.warung.id
        ? asPublic(s.warung, inside.ownerName)
        : inside,
    ...(recommendedRestock && recFulfilled !== !!recommendedRestock.fulfilled
      ? { recommendedRestock: { ...recommendedRestock, fulfilled: recFulfilled } }
      : {}),
  });
  const game = useGame.getState();
  if (s.settled && s.settled.revenue > 0 && s.settled.minutes >= 10)
    game.setToast(
      `Selagi kamu pergi, ${Object.values(s.settled.items).reduce((a, b) => a + b, 0)} barang terjual.`,
    );
  for (const n of s.news ?? []) {
    if (n.kind === "debt_paid")
      game.setToast(`${n.npc} datang melunasi utang ${rupiah(n.amount)} plus uang terima kasih.`);
    else if (n.kind === "debt_collected_chat")
      game.setToast(`💬 ${n.npc}: “Eh iya lupa! Ini langsung saya bayar ${rupiah(n.amount)} ya!”`);
    else if (n.kind === "debt_delayed_chat")
      game.setToast(`💬 ${n.npc}: “Aduh bentar lagi gajian, nanti saya mampir bayar ya…”`);
    else if (n.kind === "debt_extended_chat")
      game.setToast(
        `⏳ ${n.npc} mengulur waktu bayar +${n.extendMinutes ?? 15} menit! Coba samperin di jalan.`,
      );
    else if (n.kind === "debt_collected_street")
      game.setToast(
        `Ketemu ${n.npc} di jalan! Utang langsung lunas +${rupiah(n.amount)} (plus terima kasih).`,
      );
    else if (n.kind === "rent_bargain_ok")
      game.setToast(`🧧 ${n.npc}: “Ya sudah, sehari saya kasih gratis. Jangan bilang-bilang ya.”`);
    else if (n.kind === "rent_bargain_fail")
      game.setToast(`🧧 ${n.npc}: “Waduh, saya juga harus bayar listrik. Sewa tetap sewa.”`);
    else if (n.kind === "theft_escaped")
      game.setToast(
        `😱 Pencuri kabur! Kas -${rupiah(n.amount)}${n.qty ? ` & ${n.qty} barang dicuri` : ""}! Kunci warung sebelum pergi ya!`,
      );
    else
      game.setToast(
        `${n.npc} tidak kunjung bayar utang ${rupiah(n.amount)}. Hati-hati kasih utang ya.`,
      );
  }
}

export const serveOrder = (items: OrderLine[], fast = false) =>
  warungCommand("serve", { items, fast });

export const collectDebt = (
  eventId: number,
  method: "chat" | "street",
  tone?: "good" | "soft" | "harsh",
) => warungCommand("collect_debt", { eventId, method, ...(tone ? { tone } : {}) });

export function trackDebtor(debt: WarungDebt) {
  const spot = debtorSpot(debt.id);
  useHud.getState().setSheet(null);
  if (useWarung.getState().inside) exitWarung();
  useGame.getState().setWaypoint(`warung-debt-${debt.id}`);
  useGame.getState().setToast(`Ikuti panah penunjuk jalan ke ${debt.npc} di ${spot.area}!`);
}

let pollInFlight = false;
/**
 * Owner heartbeat while standing in the warung (story visitors, debt repayments, offline sales).
 * Silent: never toggles `busy` or the error banner, and skips while a player action is running.
 */
export async function pollWarung() {
  if (pollInFlight || useWarung.getState().busy) return;
  pollInFlight = true;
  try {
    const s = await worldRequest<WarungSnapshot>("warung", { action: "read", inside: true });
    applySnapshot(s);
  } catch {
    // Next heartbeat retries.
  } finally {
    pollInFlight = false;
  }
}

/** Part-time shift in someone else's warung; returns the wage earned. */
export async function workOrder(items: OrderLine[]) {
  const inside = useWarung.getState().inside;
  if (!inside) return null;
  const r = await run<WorkResult>("work", { requestId: createId(), warungId: inside.id, items });
  if (!r) return null;
  useWarung.setState((s) => ({
    inside: s.inside?.id === r.visit.id ? r.visit : s.inside,
    data: s.data ? { ...s.data, warung: r.warung, savings: r.savings } : s.data,
  }));
  return r.wage;
}

let lotsInFlight = false;
/** Background poll for the city lots; never blocks or reports errors to panel actions. */
export async function loadLots() {
  const room = useChannels.getState().lease?.channel;
  if (lotsInFlight || !room?.startsWith("CHANNEL-")) return;
  lotsInFlight = true;
  try {
    const r = await worldRequest<{ lots: LotCard[] }>("warung", { action: "lots", room });
    if (useChannels.getState().lease?.channel === room) useWarung.setState({ lots: r.lots });
  } catch {
    // Lots are decoration; the next poll retries.
  } finally {
    lotsInFlight = false;
  }
}

export async function loadDirectory() {
  const room = useChannels.getState().lease?.channel;
  const d = await run<WarungDirectory>("directory", room?.startsWith("CHANNEL-") ? { room } : {});
  if (d) useWarung.setState({ directory: d });
}

function teleportInto(w: PublicWarung, own = false) {
  const game = useGame.getState();
  const [x, y, z] = warungOrigin(w.id);
  const now = Date.now();
  const rec = useWarung.getState().recommendedRestock;
  const initialQueue: WarungCustomer[] = [];
  if (own && rec && now - rec.createdAt < 15 * 60_000) {
    const allMet = rec.items.every(
      (req) => (w.stock.find((st) => st.itemId === req.itemId)?.qty ?? 0) >= req.qty,
    );
    initialQueue.push({
      id: createId(),
      name: rec.customerName,
      avatar: rec.avatar,
      personality: rec.personality,
      traitLabel: rec.traitLabel,
      line: allMet
        ? "Nah ini dia! Langsung bungkus pesananku tadi ya! 😊"
        : "Lho, pesananku belum lengkap ya? Aku masih nunggu di sini kok 😊",
      waitMs: allMet ? 45_000 : 60_000,
      arrivedAt: now - CUSTOMER_WALK_MS,
      leavingAt: null,
      reaction: "😊",
      emptyStockAsk: !allMet,
      ...(allMet ? {} : { emptyReply: "wait" as const }),
      wantedItems: rec.items,
    });
  }
  setQueue(initialQueue, {
    order: null,
    nextCustomerAt: now + (initialQueue.length > 0 ? 6000 : 2500),
    serveStreak: 0,
    lastServeFeedback: null,
  });
  game.setSitting(false);
  useWarung.setState({
    inside: w,
    returnTo: useWarung.getState().returnTo ?? [...game.playerPos],
    ...(own ? { locked: false, thief: null } : {}),
  });
  useGame.setState({ pendingTeleport: [x, y + 0.83, z + (own ? -2.6 : 3)] });
}

/** The warung room replaces the city scene, so only enter from plain city walking. */
function blockedReason(): string | null {
  const game = useGame.getState();
  const playerId = useChannels.getState().lease?.playerId;
  if (useDungeon.getState().data?.instance) return "Selesaikan dungeon dulu.";
  if (useClub.getState().inside && !useClub.getState().outdoor) return "Keluar dari club dulu.";
  if (isMountainPosition(game.playerPos[0], game.playerPos[2])) return "Kembali ke kota dulu.";
  if (playerId && vehicleFor(useMobility.getState().vehicles ?? [], playerId))
    return "Turun dari kendaraan dulu.";
  if (miniParticipant() || useFishing.getState().open || game.pendingTeleport)
    return "Selesaikan aktivitasmu dulu.";
  return null;
}

export async function enterWarung(id: number) {
  const blocked = useWarung.getState().inside ? null : blockedReason();
  if (blocked) {
    useGame.getState().setToast(blocked);
    return;
  }
  const mine = useWarung.getState().data?.warung;
  if (mine && mine.id === id) {
    const s = await warungCommand("read");
    if (s?.warung) teleportInto(asPublic(s.warung, "Kamu"), true);
    return;
  }
  const r = await run<VisitResult>("visit", { warungId: id });
  if (!r) return;
  useWarung.setState((s) => ({ data: s.data ? { ...s.data, warung: r.warung } : s.data }));
  teleportInto(r.visit);
}

export async function buyFromWarung(itemId: string, qty: number, expectedPrice: number) {
  const inside = useWarung.getState().inside;
  if (!inside) return;
  const r = await run<VisitResult>("buy", {
    requestId: createId(),
    warungId: inside.id,
    itemId,
    qty,
    expectedPrice,
  });
  if (!r) {
    if (useWarung.getState().error.startsWith("Harga berubah")) {
      const v = await run<VisitResult>("visit", { warungId: inside.id });
      if (v) useWarung.setState({ inside: v.visit, error: "Harga berubah. Cek lagi raknya." });
    }
    return;
  }
  useWarung.setState((s) => ({
    inside: s.inside?.id === r.visit.id ? r.visit : s.inside,
    data: s.data ? { ...s.data, warung: r.warung } : s.data,
  }));
  useGame.getState().setToast("Stok masuk ke warungmu.");
}

export function exitWarung(lockOnExit = false) {
  const { returnTo, inside, data } = useWarung.getState();
  if (!inside) return;
  const own = !!data?.warung && inside.id === data.warung.id;
  setQueue([], {
    inside: null,
    returnTo: null,
    order: null,
    ...(own
      ? {
          locked: lockOnExit,
          nextThiefAt: lockOnExit ? 0 : Date.now() + 22_000 + Math.random() * 14_000,
        }
      : {}),
  });
  useGame.setState({ pendingTeleport: returnTo ?? [0, 0.83, 12] });
  if (own) {
    useGame
      .getState()
      .setToast(
        lockOnExit
          ? "🔒 Warung dikunci rapat. Aman dari pencuri!"
          : "🔓 Warung tidak dikunci! Hati-hati maling kalau ditinggal lama.",
      );
  }
}

export function setWarungLocked(locked: boolean) {
  useWarung.setState({
    locked,
    nextThiefAt: locked ? 0 : Date.now() + 24_000 + Math.random() * 14_000,
  });
  useGame
    .getState()
    .setToast(
      locked
        ? "🔒 Warung dikunci. Aman dari pencuri!"
        : "🔓 Kunci warung dibuka. Hati-hati maling!",
    );
}

const THIEF_ESCAPE_POINTS: readonly [number, number][] = [
  [-48, -14],
  [48, -14],
  [-46, 32],
  [46, 32],
  [0, 52],
];

const THIEF_NAMES = ["Bang Maling", "Si Copet", "Kang Jambret", "Garong Kota"];

/** Periodic check outside warung: if unlocked and player has cash/stock, spawn a fleeing thief. */
export function thiefTick() {
  const s = useWarung.getState();
  const w = s.data?.warung;
  if (s.inside || !w || s.locked || s.thief) return;
  const now = Date.now();
  if (s.nextThiefAt <= 0) {
    useWarung.setState({ nextThiefAt: now + 24_000 + Math.random() * 14_000 });
    return;
  }
  if (now < s.nextThiefAt) return;
  const hasLoot = w.cash > 0 || w.stock.some((st) => st.qty > 0);
  if (!hasLoot) return;

  // Spawn at the player's warung lot front if visible, otherwise ~14m away from the player.
  const myLotCard = s.lots.find((l) => l.id === w.id);
  const myLot = myLotCard ? WARUNG_LOTS[myLotCard.lot] : undefined;
  const [px, , pz] = useGame.getState().playerPos;
  let sx = px + 14;
  let sz = pz + 6;
  if (myLot) {
    const [fx, fz] = lotFront(myLot, 2.4);
    sx = fx;
    sz = fz;
  }
  // Pick the escape point farthest from spawn (at least 36m away) so the chase is fun & fair.
  let bestTarget = THIEF_ESCAPE_POINTS[0]!;
  let bestDist = -1;
  for (const pt of THIEF_ESCAPE_POINTS) {
    const d = Math.hypot(pt[0] - sx, pt[1] - sz);
    if (d > bestDist) {
      bestDist = d;
      bestTarget = pt;
    }
  }
  const name = pickRandom(THIEF_NAMES);
  useWarung.setState({
    thief: {
      id: createId(),
      name,
      x: sx,
      z: sz,
      targetX: bestTarget[0],
      targetZ: bestTarget[1],
      startedAt: now,
      deadlineAt: now + 35_000,
    },
  });
  useGame.getState().setWaypoint("warung-thief");
  useGame
    .getState()
    .setToast(`🚨 MALING! ${name} kabur dari warungmu yang tidak dikunci! Kejar sebelum lolos!`);
}

export function updateThiefPosition(x: number, z: number) {
  const t = useWarung.getState().thief;
  if (!t) return;
  useWarung.setState({ thief: { ...t, x, z } });
}

export function catchThief() {
  const t = useWarung.getState().thief;
  if (!t) return;
  useWarung.setState({ thief: null, nextThiefAt: Date.now() + 90_000 });
  if (useGame.getState().waypoint === "warung-thief") {
    useGame.getState().setWaypoint(null);
  }
  useGame.getState().setToast(`🚔 ${t.name} berhasil kamu tangkap! Kas & stok warungmu 100% aman!`);
}

export function thiefEscaped() {
  const t = useWarung.getState().thief;
  if (!t) return;
  useWarung.setState({ thief: null, nextThiefAt: Date.now() + 90_000 });
  if (useGame.getState().waypoint === "warung-thief") {
    useGame.getState().setWaypoint(null);
  }
  void warungCommand("theft_loss");
}

export function exitWarungToTokoCung() {
  exitWarung(true);
  useGame.getState().setWaypoint("map-store");
  useGame.getState().setToast("🔒 Warung dikunci dulu. Ikuti penunjuk jalan ke Toko Cung!");
}

/** Channel change or logout: leave the room without a server call. */
export function resetWarung() {
  if (useWarung.getState().inside) exitWarung();
  useWarung.setState({ directory: null, lots: [], error: "" });
}

interface PersonaSpec {
  name: string;
  avatar: string;
  personality: CustomerPersonality;
  traitLabel: string;
  waitMs: number;
  lines: string[];
}

const WALK_IN_PERSONAS: PersonaSpec[] = [
  {
    name: "Bu Rempong",
    avatar: "npc-shopper-1",
    personality: "bawel",
    traitLabel: "Bawel",
    waitMs: 16_000,
    lines: [
      "Cepetan dikit dong, kompor di rumah masih nyala!",
      "Aduh jangan lama-lama ya, saya lagi buru-buru nih!",
    ],
  },
  {
    name: "Mpok Lela",
    avatar: "npc-shopper-2",
    personality: "bawel",
    traitLabel: "Bawel",
    waitMs: 17_000,
    lines: [
      "Kok antre sih? Tolong duluan ya, dikit doang kok!",
      "Halo, masih buka kan? Cepet ya, anak saya udah nangis!",
    ],
  },
  {
    name: "Pak Sabar",
    avatar: "npc-pedestrian-1",
    personality: "sabar",
    traitLabel: "Sabar & Bingung",
    waitMs: 34_000,
    lines: [
      "Hmm… enaknya beli apa ya? Santai aja, saya sambil mikir…",
      "Sebentar ya, tadi istri titip apa ya… oh ini aja deh!",
    ],
  },
  {
    name: "Dek Rara",
    avatar: "npc-shopper-3",
    personality: "sabar",
    traitLabel: "Sabar & Bingung",
    waitMs: 32_000,
    lines: [
      "Emm… jajannya bagus semua, bingung mau pilih yang mana…",
      "Tunggu bentar ya Kak, aku hitung uang jajan dulu…",
    ],
  },
  {
    name: "Bu Siti",
    avatar: "npc-shopper-1",
    personality: "biasa",
    traitLabel: "Warga",
    waitMs: 24_000,
    lines: ["Permisi, mau belanja kebutuhan dapur nih.", "Halo, barang ini masih ada ya?"],
  },
  {
    name: "Mas Bayu",
    avatar: "npc-pedestrian-2",
    personality: "biasa",
    traitLabel: "Warga",
    waitMs: 24_000,
    lines: ["Mampir beli cemilan dulu buat lembur.", "Permisi, mau beli ini ya!"],
  },
  {
    name: "Teh Nining",
    avatar: "npc-shopper-2",
    personality: "biasa",
    traitLabel: "Warga",
    waitMs: 25_000,
    lines: ["Assalamualaikum, mau belanja sebentar ya!", "Beli ini dong, mumpung lewat."],
  },
  {
    name: "Om Hendra",
    avatar: "npc-pedestrian-1",
    personality: "sabar",
    traitLabel: "Sabar",
    waitMs: 30_000,
    lines: ["Pelan-pelan aja, saya nggak buru-buru kok.", "Santai, yang penting lengkap ya."],
  },
];

const EMPTY_LINES = [
  "Yah… raknya kosong semua. Besok balik lagi deh.",
  "Lho, barangnya habis semua? Ya udah ke sebelah dulu…",
  "Aduh kosong ya? Padahal mau jajan di sini…",
];

const EVENT_AVATAR: Record<WarungEventKind, string> = {
  ngutang: "npc-shopper-2",
  iuran: "npc-pedestrian-2",
  ojol: "npc-courier",
  palak: "npc-pedestrian-1",
  sultan: "npc-shopper-3",
};
const EVENT_TRAIT: Record<WarungEventKind, string> = {
  ngutang: "Ngutang",
  iuran: "Pak RT",
  ojol: "Ojol",
  palak: "Preman",
  sultan: "Sultan",
};

const ANGRY_TIMEOUT_BAWEL = [
  "Anj*r lama banget sih! B*go amat jualan, mending ke sebelah!",
  "Woi g*blok, nunggu sampe lumutan nih! Males ah beli di sini!",
  "Heh t*lol, anak gue udah nangis dari tadi! Batal deh!",
  "B*ngsat kelamaan! Warung apaan nih lelet amat!",
];

const ANGRY_TIMEOUT_NORMAL = [
  "Aduh lama bgt sih, anj*ng keburu telat nih! Pergi ah!",
  "Kelamaan nunggu! Sumpah b*kin emosi aja, batal beli!",
  "Woi tidur ya?! Nunggu doang sampe capek, males ah!",
];

export const ANGRY_WRONG_ITEM = [
  "Salah ambil barang lagi! Matanya di mana sih?! B*go amat, batal beli!",
  "Heh g*blok, bukan itu yang gue pesen! Nggak jadi beli ah!",
  "Anj*r salah mulu! T*lol banget sih, males beli di sini!",
];

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const MAX_QUEUE = 3;

export function customerArrived(c: WarungCustomer | null, now = Date.now()) {
  return !!c && c.leavingAt === null && now - c.arrivedAt >= CUSTOMER_WALK_MS;
}

/**
 * Drives the local customer queue while the player is on shift (own warung or part-time).
 * Supports up to 3 concurrent customers in line, story visitors, and disappointed empty-stock visitors.
 */
export function customerTick(stock: WarungStock[], withEvents: boolean) {
  const now = Date.now();
  const s = useWarung.getState();
  const event = withEvents ? s.data?.event : null;
  let queue = [...s.customers];
  let changed = false;

  // 1. Remove customers who finished walking out.
  const beforeLen = queue.length;
  queue = queue.filter((c) => !(c.leavingAt !== null && now - c.leavingAt > CUSTOMER_WALK_MS));
  if (queue.length !== beforeLen) changed = true;

  // 2. Check timeouts & disappointed empty-stock visitors.
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]!;
    if (c.leavingAt !== null) continue;
    if (c.eventId !== undefined && c.eventId !== event?.id) {
      queue[i] = { ...c, leavingAt: now };
      changed = true;
      continue;
    }
    if (c.personality === "kecewa" && now - c.arrivedAt > CUSTOMER_WALK_MS + 4000) {
      queue[i] = { ...c, leavingAt: now, reaction: "😞" };
      changed = true;
      continue;
    }
    // Only time out walk-ins who aren't currently mid-order at index 0.
    const beingServed = i === 0 && !!s.order;
    if (
      c.eventId === undefined &&
      c.personality !== "kecewa" &&
      !beingServed &&
      now - c.arrivedAt > CUSTOMER_WALK_MS + c.waitMs
    ) {
      queue[i] = { ...c, leavingAt: now, reaction: c.emptyStockAsk ? "😞" : "😡" };
      changed = true;
      if (!c.emptyStockAsk) {
        useGame
          .getState()
          .setToast(
            c.personality === "bawel"
              ? `🤬 ${c.name}: “${pickRandom(ANGRY_TIMEOUT_BAWEL)}”`
              : `😠 ${c.name}: “${pickRandom(ANGRY_TIMEOUT_NORMAL)}”`,
          );
        useWarung.setState({ serveStreak: 0 });
      }
    }
  }

  // 3. Inject server story visitor if not already in queue.
  const activeCount = queue.filter((c) => c.leavingAt === null).length;
  if (event && !queue.some((c) => c.eventId === event.id)) {
    const storyCustomer: WarungCustomer = {
      id: `evt-${event.id}`,
      name: event.npc,
      avatar: EVENT_AVATAR[event.kind],
      personality: "event",
      traitLabel: EVENT_TRAIT[event.kind],
      line: "",
      waitMs: 180_000,
      arrivedAt: now,
      leavingAt: null,
      eventId: event.id,
      eventKind: event.kind,
    };
    // Put story visitor at front if nobody is mid-order, otherwise right behind index 0.
    if (!s.order && queue.length === 0) queue.push(storyCustomer);
    else if (!s.order) queue.unshift(storyCustomer);
    else queue.splice(1, 0, storyCustomer);
    changed = true;
  } else if (now >= s.nextCustomerAt && activeCount < MAX_QUEUE) {
    const hasStock = stock.some((x) => x.qty > 0);
    if (hasStock) {
      // Avoid duplicate names already in the room.
      const used = new Set(queue.map((c) => c.name));
      const pool = WALK_IN_PERSONAS.filter((p) => !used.has(p.name));
      const pick = (pool.length ? pool : WALK_IN_PERSONAS)[
        Math.floor(Math.random() * (pool.length || WALK_IN_PERSONAS.length))
      ]!;
      queue.push({
        id: createId(),
        name: pick.name,
        avatar: pick.avatar,
        personality: pick.personality,
        traitLabel: pick.traitLabel,
        line: pick.lines[Math.floor(Math.random() * pick.lines.length)]!,
        waitMs: pick.waitMs,
        arrivedAt: now,
        leavingAt: null,
      });
      changed = true;
      useWarung.setState({ nextCustomerAt: now + 4500 + Math.random() * 5500 });
    } else if (activeCount === 0) {
      // Empty warung: a customer walks in asking for specific unlocked items so the owner can ask them to wait.
      const pick = WALK_IN_PERSONAS[Math.floor(Math.random() * WALK_IN_PERSONAS.length)]!;
      const catalog = s.data?.catalog ?? [];
      const level = s.data?.warung?.level ?? 1;
      const unlocked = catalog.filter((item) => item.level <= level);
      if (withEvents && unlocked.length > 0) {
        const shuffled = [...unlocked].sort(() => Math.random() - 0.5);
        const count = Math.min(shuffled.length, Math.random() < 0.55 ? 2 : 1);
        const wantedItems: OrderLine[] = shuffled.slice(0, count).map((item) => ({
          itemId: item.id,
          qty: 1 + Math.floor(Math.random() * 2),
        }));
        queue.push({
          id: createId(),
          name: pick.name,
          avatar: pick.avatar,
          personality: pick.personality,
          traitLabel: pick.traitLabel,
          line: "Mau beli ini… eh, kok raknya kosong ya?",
          waitMs: 18_000,
          arrivedAt: now,
          leavingAt: null,
          reaction: "🤔",
          emptyStockAsk: true,
          wantedItems,
        });
      } else {
        const line = EMPTY_LINES[Math.floor(Math.random() * EMPTY_LINES.length)]!;
        queue.push({
          id: createId(),
          name: pick.name,
          avatar: pick.avatar,
          personality: "kecewa",
          traitLabel: "Kecewa",
          line,
          waitMs: 4000,
          arrivedAt: now,
          leavingAt: null,
          reaction: "😞",
        });
      }
      changed = true;
      useWarung.setState({ nextCustomerAt: now + 13_000 + Math.random() * 5000 });
    }
  }

  if (changed) setQueue(queue);
}

/**
 * Seller asks an empty-rack customer: "Sebentar ya, kulakan dulu!"
 * Willingness depends on personality: Sabar 90%, Warga 65%, Bawel 30%.
 * If they agree, saves their requested items as `recommendedRestock` for Kulakan at Toko Cung.
 */
export function askCustomerToWait(customerId: string): "wait" | "refuse" | null {
  const { customers } = useWarung.getState();
  const idx = customers.findIndex((c) => c.id === customerId && c.leavingAt === null);
  if (idx < 0) return null;
  const target = customers[idx]!;
  if (!target.emptyStockAsk || target.emptyReply) return null;
  const chance = target.personality === "sabar" ? 0.9 : target.personality === "bawel" ? 0.3 : 0.65;
  const willWait = Math.random() < chance;
  const next = [...customers];
  if (willWait) {
    next[idx] = {
      ...target,
      emptyReply: "wait",
      reaction: "😊",
      waitMs: 60_000,
      line: "Oke, aku tunggu di sini ya! Jangan lama-lama kulakannya 😊",
    };
    setQueue(next, {
      recommendedRestock: {
        customerName: target.name,
        avatar: target.avatar,
        personality: target.personality,
        traitLabel: target.traitLabel,
        items: target.wantedItems ?? [],
        createdAt: Date.now(),
        fulfilled: false,
      },
    });
    return "wait";
  }
  const elapsed = Math.max(0, Date.now() - target.arrivedAt - CUSTOMER_WALK_MS);
  next[idx] = {
    ...target,
    emptyReply: "refuse",
    reaction: "😤",
    waitMs: elapsed + 3200,
    line:
      target.personality === "bawel"
        ? "Anj*r kelamaan kalau nunggu kulakan! B*go ah, ke warung sebelah aja!"
        : "Wah maaf, aku lagi buru-buru nih. Lain kali aja ya…",
  };
  setQueue(next);
  return "refuse";
}

export function clearRecommendedRestock() {
  useWarung.setState({ recommendedRestock: null });
}

/** Restock all items requested by the waiting customer in one flow at Toko Cung. */
export async function restockRecommended() {
  const rec = useWarung.getState().recommendedRestock;
  const w = useWarung.getState().data?.warung;
  if (!rec || !w) return false;
  let added = false;
  for (const req of rec.items) {
    const have = w.stock.find((s) => s.itemId === req.itemId)?.qty ?? 0;
    const inBasket = useWarung.getState().basket.find((l) => l.itemId === req.itemId)?.qty ?? 0;
    const need = Math.max(0, req.qty - have - inBasket);
    if (need <= 0) continue;
    addToBasket(req.itemId, need);
    added = true;
  }
  if (added)
    useGame.getState().setToast(`🧺 Pesanan ${rec.customerName} masuk keranjang. Bayar di kasir.`);
  return added;
}

export function leaveCustomer(reaction?: string) {
  const { customers } = useWarung.getState();
  const idx = customers.findIndex((c) => c.leavingAt === null);
  if (idx < 0) return;
  const next = [...customers];
  next[idx] = { ...next[idx]!, leavingAt: Date.now(), ...(reaction ? { reaction } : {}) };
  setQueue(next, { order: null });
}

export function recordServeSpeed(kind: "fast" | "normal" | "slow", bonusText = "") {
  const prev = useWarung.getState().serveStreak;
  const nextStreak = kind === "fast" ? prev + 1 : 0;
  const text =
    kind === "fast"
      ? `⚡ Cekatan!${nextStreak >= 2 ? ` Combo ×${nextStreak}` : ""}${bonusText ? ` · ${bonusText}` : ""}`
      : kind === "slow"
        ? "🐢 Agak lama — pelanggan hampir nggak sabar!"
        : "😊 Pesanan selesai!";
  useWarung.setState({
    serveStreak: nextStreak,
    lastServeFeedback: { kind, text, at: Date.now() },
  });
}

export function startOrder(stock: WarungStock[]) {
  const s = useWarung.getState();
  const front = s.customers.find((c) => c.leavingAt === null) ?? null;
  if (
    !customerArrived(front) ||
    front?.eventId !== undefined ||
    front?.personality === "kecewa" ||
    front?.emptyStockAsk ||
    s.order
  )
    return;
  const exactWanted =
    front?.wantedItems &&
    front.wantedItems.length > 0 &&
    front.wantedItems.every(
      (req) => (stock.find((st) => st.itemId === req.itemId)?.qty ?? 0) >= req.qty,
    )
      ? front.wantedItems
      : null;
  useWarung.setState({
    order: exactWanted ?? makeOrder(stock),
    ...(exactWanted && s.recommendedRestock?.customerName === front?.name
      ? { recommendedRestock: null }
      : {}),
  });
}

export async function answerEvent(eventId: number, choice: "accept" | "decline") {
  const ev = useWarung.getState().data?.event;
  const r = await warungCommand("event", { eventId, choice });
  if (!r) return null;
  leaveCustomer(choice === "accept" ? "😊" : "😠");
  if (ev?.kind === "palak" && choice === "decline") {
    // Standing up to the preman: 40% chance 1 waiting buyer gets spooked and leaves.
    const { customers } = useWarung.getState();
    const walkInIdx = customers.findIndex((c) => c.leavingAt === null && c.eventId === undefined);
    if (walkInIdx >= 0 && Math.random() < 0.4) {
      const next = [...customers];
      const spooked = next[walkInIdx]!;
      next[walkInIdx] = { ...spooked, leavingAt: Date.now(), reaction: "😱" };
      setQueue(next);
      useGame
        .getState()
        .setToast(`Preman diusir! ${spooked.name} ikut kaget dan pergi, tapi Kas aman.`);
    } else {
      useGame.getState().setToast(`${ev.npc} menggerutu lalu pergi. Kas warung aman!`);
    }
  }
  return r;
}

/** Client mirror of the server kulakan area: inside the store, or on its front pavement. */
export function atTokoCung() {
  const g = useGame.getState();
  const [x, , z] = g.playerPos;
  return x >= -11 && x <= 11 && z >= -23 && z <= 8;
}

let boardInFlight = false;
/** Silent poll for the weekly leaderboard (3D board + Juara tab). */
export async function loadLeaderboard() {
  if (boardInFlight) return;
  boardInFlight = true;
  try {
    const b = await worldRequest<WarungLeaderboard>("warung", { action: "leaderboard" });
    useWarung.setState({ leaderboard: b });
  } catch {
    // Board keeps the last result; next poll retries.
  } finally {
    boardInFlight = false;
  }
}

/** Silent first read so prompts know whether the player owns a warung. */
export async function ensureWarungData() {
  if (useWarung.getState().data) return;
  try {
    const s = await worldRequest<WarungSnapshot>("warung", { action: "read" });
    if (!useWarung.getState().data) applySnapshot(s);
  } catch {
    // Prompts stay hidden until a later read succeeds.
  }
}

/** Add (or with qty < 0, remove) pieces in the kulakan keranjang. */
export function addToBasket(itemId: string, qty: number) {
  const basket = useWarung.getState().basket;
  const have = basket.find((l) => l.itemId === itemId)?.qty ?? 0;
  const next = Math.max(0, have + qty);
  useWarung.setState({
    basket: next
      ? basket.some((l) => l.itemId === itemId)
        ? basket.map((l) => (l.itemId === itemId ? { itemId, qty: next } : l))
        : [...basket, { itemId, qty: next }]
      : basket.filter((l) => l.itemId !== itemId),
  });
}

/** Ambil barang: open the Kulakan tab showing only this shelf's items. */
export function openShelf(zoneId: string) {
  openWarungPanel("kulakan");
  useWarung.setState({ shelfFilter: zoneId });
}

/** Bayar at the Toko Cung cashier: one server transaction for the whole keranjang. */
export async function payBasket() {
  const { basket, data } = useWarung.getState();
  if (!basket.length) return false;
  const catalog = data?.catalog ?? [];
  const total = basket.reduce(
    (a, l) => a + (catalog.find((c) => c.id === l.itemId)?.wholesale ?? 0) * l.qty,
    0,
  );
  const s = await warungCommand("kulakan", { items: basket });
  if (!s) return false;
  useWarung.setState({ basket: [] });
  useGame.getState().setToast(`🧾 Kulakan lunas ${rupiah(total)}. Stok sudah masuk rak warungmu.`);
  return true;
}

export function openWarungPanel(tab: string) {
  // Opened from anywhere but a shelf: show the whole catalog.
  useWarung.setState({ panelTab: tab, shelfFilter: null });
  useHud.getState().setSheet("warung");
}
