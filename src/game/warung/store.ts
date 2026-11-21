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
  makeOrder,
  rupiah,
  warungOrigin,
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

export interface WarungCustomer {
  name: string;
  avatar: string;
  arrivedAt: number;
  leavingAt: number | null;
  /** Story visitor for this pending event (ngutang / iuran / ojol). */
  eventId?: number;
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
  /** NPC walking in / waiting at the counter / walking out (local to this client). */
  customer: WarungCustomer | null;
  nextCustomerAt: number;
  /** Weekly omzet board (NPC + player sales). */
  leaderboard: WarungLeaderboard | null;
  /** Tab the Warungku panel should open on (e.g. "kulakan" from the Toko Cung prompt). */
  panelTab: string | null;
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
  customer: null,
  nextCustomerAt: 0,
  leaderboard: null,
  panelTab: null,
  busy: false,
  error: "",
}));

type VisitResult = { visit: PublicWarung; warung: MyWarung | null };
// wage is null when the server replays an already-processed request.
type WorkResult = VisitResult & { wage: number | null; savings: number };

function asPublic(w: MyWarung, ownerName: string | null): PublicWarung {
  return { ...w, ownerName };
}
export function isOwnWarung() {
  const s = useWarung.getState();
  return !!s.inside && s.inside.id === s.data?.warung?.id;
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
  const needsId = ["restock", "serve", "upgrade"].includes(action);
  const s = await run<WarungSnapshot>(
    action,
    needsId ? { requestId: createId(), ...extra } : extra,
  );
  if (!s) return null;
  applySnapshot(s);
  return s;
}

function applySnapshot(s: WarungSnapshot) {
  const inside = useWarung.getState().inside;
  useWarung.setState({
    data: s,
    inside:
      inside && s.warung && inside.id === s.warung.id
        ? asPublic(s.warung, inside.ownerName)
        : inside,
  });
  const game = useGame.getState();
  if (s.settled && s.settled.revenue > 0 && s.settled.minutes >= 10)
    game.setToast(
      `Selagi kamu pergi, ${Object.values(s.settled.items).reduce((a, b) => a + b, 0)} barang terjual.`,
    );
  for (const n of s.news ?? [])
    game.setToast(
      n.kind === "debt_paid"
        ? `${n.npc} datang melunasi utang ${rupiah(n.amount)} plus uang terima kasih.`
        : `${n.npc} tidak kunjung bayar utang ${rupiah(n.amount)}. Hati-hati kasih utang ya.`,
    );
}

export const serveOrder = (items: OrderLine[]) => warungCommand("serve", { items });

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
    // Player may have pressed Keluar while the request was in flight.
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
  useWarung.setState({ customer: null, order: null, nextCustomerAt: Date.now() + 4000 });
  game.setSitting(false);
  useWarung.setState({
    inside: w,
    returnTo: useWarung.getState().returnTo ?? [...game.playerPos],
  });
  // Owners start behind the etalase; visitors at the door side.
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
    // Price changed under us: refresh the rack so the player sees the new price.
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

export function exitWarung() {
  const { returnTo, inside } = useWarung.getState();
  if (!inside) return;
  useWarung.setState({ inside: null, returnTo: null, order: null, customer: null });
  useGame.setState({ pendingTeleport: returnTo ?? [0, 0.83, 12] });
}

/** Channel change or logout: leave the room without a server call. */
export function resetWarung() {
  if (useWarung.getState().inside) exitWarung();
  useWarung.setState({ directory: null, lots: [], error: "" });
}

const WALK_IN = [
  ["Bu Siti", "npc-shopper-1"],
  ["Pak Budi", "npc-pedestrian-1"],
  ["Dek Rara", "npc-shopper-3"],
  ["Mas Bayu", "npc-pedestrian-2"],
  ["Teh Nining", "npc-shopper-2"],
  ["Om Hendra", "npc-pedestrian-1"],
] as const;
const EVENT_AVATAR: Record<WarungEventKind, string> = {
  ngutang: "npc-shopper-2",
  iuran: "npc-pedestrian-2",
  ojol: "npc-courier",
};
const WAIT_MS = 25_000;

export function customerArrived(c: WarungCustomer | null, now = Date.now()) {
  return !!c && c.leavingAt === null && now - c.arrivedAt >= CUSTOMER_WALK_MS;
}

/**
 * Drives the local customer queue while the player is on shift (own warung or part-time).
 * Story visitors come from the server's pending event; walk-ins arrive every 6–12 s while stock lasts.
 */
export function customerTick(stock: WarungStock[], withEvents: boolean) {
  const now = Date.now();
  const s = useWarung.getState();
  const c = s.customer;
  const event = withEvents ? s.data?.event : null;
  if (c?.leavingAt != null) {
    if (now - c.leavingAt > CUSTOMER_WALK_MS)
      useWarung.setState({ customer: null, nextCustomerAt: now + 6000 + Math.random() * 6000 });
    return;
  }
  if (c) {
    if (c.eventId !== undefined && c.eventId !== event?.id) leaveCustomer();
    else if (c.eventId === undefined && !s.order && now - c.arrivedAt > WAIT_MS) {
      leaveCustomer();
      useGame.getState().setToast(`${c.name} kelamaan menunggu dan pergi.`);
    }
    return;
  }
  if (event) {
    useWarung.setState({
      customer: {
        name: event.npc,
        avatar: EVENT_AVATAR[event.kind],
        arrivedAt: now,
        leavingAt: null,
        eventId: event.id,
      },
    });
    return;
  }
  if (now >= s.nextCustomerAt && stock.some((x) => x.qty > 0)) {
    const [name, avatar] = WALK_IN[Math.floor(Math.random() * WALK_IN.length)]!;
    useWarung.setState({ customer: { name, avatar, arrivedAt: now, leavingAt: null } });
  }
}

export function leaveCustomer() {
  const c = useWarung.getState().customer;
  if (c && c.leavingAt === null)
    useWarung.setState({ customer: { ...c, leavingAt: Date.now() }, order: null });
}

export function startOrder(stock: WarungStock[]) {
  const s = useWarung.getState();
  if (!customerArrived(s.customer) || s.customer?.eventId !== undefined || s.order) return;
  useWarung.setState({ order: makeOrder(stock) });
}

export async function answerEvent(eventId: number, choice: "accept" | "decline") {
  const r = await warungCommand("event", { eventId, choice });
  if (r) leaveCustomer();
  return r;
}

/** Client mirror of the server kulakan area: inside the store, or on its front pavement. */
export function atTokoCung() {
  const g = useGame.getState();
  const [x, , z] = g.playerPos;
  // Same rectangle as the server's kulakan_area (store footprint + front pavement); `g.inside` is any building.
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

export function openWarungPanel(tab: string) {
  useWarung.setState({ panelTab: tab });
  useHud.getState().setSheet("warung");
}
