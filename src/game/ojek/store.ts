import { create } from "zustand";
import { takeEnergy } from "@/game/energy/store";
import { worldRequest } from "@/services/world/client";
import { createId } from "@/lib/id";
import { useGame } from "@/state/game-store";
import { bikeModel, vehicleFor } from "@/game/vehicles/model";
import { leaveVehicle, ownVehicle, vehicleHeartbeat } from "@/game/vehicles/runtime";
import { enterGang, leaveGang, useGang } from "@/game/gang/store";
import { enterHome, useHome } from "@/game/home/store";
import { cityHalteArrival } from "@/game/gang/model";
import { mobilityCommand, useMobility } from "@/game/mobility/store";
import { connectionId, useChannels } from "@/net/channel-store";
import { passengerFor, rideRemark, type RideFeel } from "./passenger";

export interface OjekSpot {
  id: string;
  name: string;
  x: number;
  z: number;
  /** Cross-scene stop: dropped at Gerbang Kampung, then the passenger walks into the gang / home. */
  scene?: "gang" | "home";
}
export interface OjekMotor {
  id: string;
  name: string;
  price: number;
  fare_percent: number;
  /** Juragan's cut on the shared bike of this type (older servers omit it). */
  setoran_percent?: number;
}
export interface OjekOrder {
  id: number;
  pickup: OjekSpot;
  dropoff: OjekSpot;
  distance: number;
  /** Base fare; payout depends on the motor at drop-off. */
  fare: number;
  publicPayout: number;
  ownPayout: number | null;
  minSeconds: number;
  acceptedAt: string;
  expiresAt: string;
  /** F8 soft-sell: e.g. a grocery run picked up at Toko Cung. */
  label?: string | null;
}
/** A ride another player ordered (pesan ojek). */
export interface OjekRide {
  id: number;
  status: "open" | "claimed";
  fare: number;
  distance: number;
  minSeconds: number;
  passenger: string;
  driver: string | null;
  pickup: OjekSpot;
  dropoff: OjekSpot;
  claimedAt: string | null;
  expiresAt: string;
}
export interface OjekSnapshot {
  motors: OjekMotor[];
  spots: OjekSpot[];
  rides?: OjekRide[];
  ojek: {
    hasWarung: boolean;
    cash: number | null;
    /** Ojek pay saved before owning a warung; becomes start capital when the warung opens. */
    savings: number;
    motor: OjekMotor | null;
    tripsThisHour: number;
    tripsPerHourCap: number;
    npcTripsPerHourCap: number | null;
    playerTripsThisHour: number;
    offer: OjekOrder | null;
    nextOfferAt: string;
    declinedStreak: number;
    /** 0–5: share of recent NPC orders delivered vs cancelled. */
    rating: number;
    setoranPercent: number;
    order: OjekOrder | null;
    ride: OjekRide | null;
    job: OjekRide | null;
  };
}
type OjekAction =
  | "read"
  | "bid"
  | "decline_bid"
  | "buy_motor"
  | "accept"
  | "complete"
  | "cancel_order"
  | "order_ride"
  | "cancel_ride"
  | "rides"
  | "claim_ride"
  | "complete_ride";

interface OjekState {
  data: OjekSnapshot | null;
  onBid: boolean;
  passengerDownUntil: number;
  rides: OjekRide[];
  busy: boolean;
  error: string | null;
  /** NPC order whose passenger is on the back seat (client-side; the server checks timing). */
  picked: number | null;
  /** Wall clock (ms) when the NPC passenger finishes climbing on. */
  boardingUntil: number | null;
  /** What the NPC passenger is saying right now (speech bubble). */
  remark: { text: string; until: number } | null;
}

export const useOjek = create<OjekState>(() => ({
  data: null,
  onBid: false,
  passengerDownUntil: 0,
  rides: [],
  busy: false,
  error: null,
  picked: null,
  boardingUntil: null,
  remark: null,
}));

/** Within this many metres of a spot counts as arrived. */
export const OJEK_ARRIVE_M = 4;
/** Player-ride drop-off radius; the server checks 8 m on the synced bike pose. */
const RIDE_ARRIVE_M = 6;
const STOPPED_MPS = 0.6;
export const BOARDING_MS = 1800;

let requestSequence = 0;
let appliedSequence = 0;
let nextBidPoll = 0;
let polling = false;
let accountGeneration = 0;

export async function ojekCommand(
  action: OjekAction,
  extra: Record<string, unknown> = {},
): Promise<OjekSnapshot | null> {
  // Background polls (read/rides) must not grey out buttons, swallow taps, or wipe the last error.
  const quiet = action === "read" || action === "rides";
  if (quiet && (useOjek.getState().busy || polling)) return null;
  if (quiet) polling = true;
  if (!quiet) {
    if (useOjek.getState().busy) return null;
    useOjek.setState({ busy: true, error: null });
  }
  const sequence = ++requestSequence;
  const generation = accountGeneration;
  try {
    const data = await worldRequest<OjekSnapshot>("ojek", {
      action,
      ...(action === "read" || action === "rides" ? {} : { requestId: createId() }),
      ...extra,
    });
    if (generation !== accountGeneration || sequence < appliedSequence) return null;
    appliedSequence = sequence;
    takeEnergy(data);
    const s = useOjek.getState();
    const sameOrder = !!data.ojek.order && data.ojek.order.id === s.data?.ojek.order?.id;
    useOjek.setState({
      data,
      ...(data.rides ? { rides: data.rides } : {}),
      picked: sameOrder ? s.picked : null,
      ...(sameOrder ? {} : { boardingUntil: null }),
      ...(data.ojek.order?.id === s.data?.ojek.order?.id ? {} : { passengerDownUntil: 0 }),
    });
    syncWaypoint();
    return data;
  } catch (e) {
    if (generation !== accountGeneration) return null;
    const message = e instanceof Error ? e.message : "Ojek gagal dimuat.";
    if (!quiet || !useOjek.getState().data) useOjek.setState({ error: message });
    // The panel scrolls; a toast keeps the reason visible wherever the button is.
    if (!quiet && action !== "bid") useGame.getState().setToast(message);
    return null;
  } finally {
    if (generation === accountGeneration) {
      if (quiet) polling = false;
      else useOjek.setState({ busy: false });
    }
  }
}

/** Another player is sitting on my bike (the passenger I invited with "Ajak bonceng"). */
function passengerAboard() {
  return !!ownVehicle()?.occupants.some(
    (s) => s.seat !== 0 && s.status === "active" && s.connectionId !== connectionId,
  );
}

/** Where the waypoint points: a claimed player ride first, else the NPC order. */
export function ojekTarget(): OjekSpot | null {
  const { data, picked } = useOjek.getState();
  const job = data?.ojek.job;
  if (job) return passengerAboard() ? job.dropoff : job.pickup;
  const order = data?.ojek.order;
  if (!order) return null;
  return picked === order.id ? order.dropoff : order.pickup;
}

function syncWaypoint() {
  const game = useGame.getState();
  const { data, picked } = useOjek.getState();
  const job = data?.ojek.job;
  const order = data?.ojek.order;
  const toDropoff = job ? passengerAboard() : !!order && picked === order.id;
  const next = job || order ? (toDropoff ? "ojek-dropoff" : "ojek-pickup") : null;
  if (next && game.waypoint !== next) game.setWaypoint(next);
  else if (!next && (game.waypoint === "ojek-pickup" || game.waypoint === "ojek-dropoff"))
    game.setWaypoint(null);
}

/** Driver pose when the local player is riding a bike as driver, else null. */
function bikePose() {
  const v = ownVehicle();
  return v && bikeModel(v.model) ? (vehicleHeartbeat() ?? null) : null;
}

const toast = (text: string) => useGame.getState().setToast(text);
/** Kas usaha, or pre-warung savings: wherever ojek pay lands. */
const wallet = (s: OjekSnapshot | null | undefined) => (s?.ojek.cash ?? 0) + (s?.ojek.savings ?? 0);
const walletName = (s: OjekSnapshot) => (s.ojek.hasWarung ? "Kas usaha" : "tabungan modal");
const say = (text: string) => useOjek.setState({ remark: { text, until: Date.now() + 3500 } });

let feel: RideFeel = { lastSpeed: 0, lastYaw: 0, slowFor: 0, quietUntil: 0 };
let lastNag = 0;
let lastRideStatus: string | null = null;

/** Called every 500 ms while there is any ojek work. */
export function ojekTick() {
  const { data, busy, remark } = useOjek.getState();
  if (remark && remark.until <= Date.now()) useOjek.setState({ remark: null });
  if (!data || busy) return;
  syncWaypoint();
  if (data.ojek.job) return jobTick(data.ojek.job);
  if (data.ojek.order) return orderTick(data.ojek.order);
  if (data.ojek.offer && Date.parse(data.ojek.offer.expiresAt) <= Date.now()) {
    if (Date.now() >= nextBidPoll) {
      nextBidPoll = Date.now() + 5000;
      void ojekCommand("read");
    }
    return;
  }
  if (
    useOjek.getState().onBid &&
    !data.ojek.offer &&
    !data.ojek.ride &&
    canBid() &&
    Date.now() >= Date.parse(data.ojek.nextOfferAt) &&
    Date.now() >= nextBidPoll
  ) {
    nextBidPoll = Date.now() + 5000;
    void ojekCommand("bid");
  }
}

/** Passenger side of a player ride: poll so the status updates without opening the phone. */
export function passengerPoll() {
  const ride = useOjek.getState().data?.ojek.ride;
  if (!ride) return;
  // Still on the driver's bike when the ride closes = delivered (the server pays only with us aboard at the stop).
  const aboard = () => !!vehicleFor(useMobility.getState().vehicles ?? [], connectionId);
  void ojekCommand("read").then((s) => {
    const next = s?.ojek.ride;
    if (next?.status === "claimed" && lastRideStatus !== "claimed")
      toast(`🛵 ${next.driver ?? "Driver"} menuju lokasimu. Terima ajakan bonceng saat dia tiba.`);
    if (s && !next) toast("Pesanan ojek selesai.");
    if (s && !next && ride.dropoff.scene && aboard()) void arriveScene(ride.dropoff.scene);
    lastRideStatus = next?.status ?? null;
  });
}

/** Dropped at Gerbang Kampung: get off the bike, then the normal gang / home entry takes over. */
async function arriveScene(scene: "gang" | "home") {
  for (let i = 0; i < 40 && vehicleFor(useMobility.getState().vehicles ?? [], connectionId); i++) {
    if (i % 12 === 0) await leaveVehicle();
    await new Promise((r) => setTimeout(r, 250));
  }
  if (scene === "home") enterHome();
  else await enterGang();
}

/** Pesan ojek. From the gang or home the server picks up at Gerbang Kampung, so walk out there to wait. */
export async function orderRide(dropoff: string) {
  const s = await ojekCommand("order_ride", { dropoff });
  if (!s?.ojek.ride) return;
  if (useHome.getState().inside) {
    useHome.setState({ inside: false });
    const gate = useGang.getState().data?.layout.gate ?? { x: -30, z: -60 };
    useGame.setState({ waypoint: null, pendingTeleport: cityHalteArrival(gate) });
  } else if (useGang.getState().inside !== null) leaveGang();
}

function orderTick(order: OjekOrder) {
  const { picked, boardingUntil, passengerDownUntil } = useOjek.getState();
  if (Date.now() < passengerDownUntil) return;
  if (Date.parse(order.expiresAt) <= Date.now()) {
    toast("Penumpang sudah pergi. Ambil order baru ya.");
    void ojekCommand("read");
    return;
  }
  const pose = bikePose();
  const spot = ojekTarget();
  if (!pose || !spot) return;
  const near = Math.hypot(pose.x - spot.x, pose.z - spot.z) <= OJEK_ARRIVE_M;
  const stopped = Math.abs(pose.speed) < STOPPED_MPS;
  const who = passengerFor(order.id);

  if (picked !== order.id) {
    if (boardingUntil) {
      if (!stopped) {
        useOjek.setState({ boardingUntil: null });
        say(who.lines.notReady);
      } else if (Date.now() >= boardingUntil) {
        useOjek.setState({ picked: order.id, boardingUntil: null });
        feel = { lastSpeed: 0, lastYaw: pose.yaw, slowFor: 0, quietUntil: Date.now() + 4000 };
        syncWaypoint();
        say(`${who.lines.hello} Ke ${order.dropoff.name} ya.`);
      }
      return;
    }
    if (!near) return;
    if (stopped) useOjek.setState({ boardingUntil: Date.now() + BOARDING_MS });
    else if (Date.now() - lastNag > 4000) {
      lastNag = Date.now();
      toast("Berhenti dulu, penumpang mau naik.");
    }
    return;
  }

  // Passenger aboard: comment on the riding, then drop off once stopped at the destination.
  const remark = rideRemark(who, feel, pose, near);
  feel = remark.feel;
  if (remark.text) say(remark.text);
  if (!near || !stopped) return;
  if (Date.now() < Date.parse(order.acceptedAt) + order.minSeconds * 1000) return; // Server rejects too-fast trips.
  const before = wallet(useOjek.getState().data);
  void ojekCommand("complete", { orderId: order.id }).then((s) => {
    if (!s || s.ojek.order) return;
    const got = wallet(s) - before;
    const cut = order.fare - got;
    toast(
      `${who.lines.thanks} +Rp${got.toLocaleString("id-ID")} ke ${walletName(s)}` +
        (cut > 0 ? ` (setoran juragan Rp${cut.toLocaleString("id-ID")}).` : "."),
    );
  });
}

function jobTick(job: OjekRide) {
  if (Date.parse(job.expiresAt) <= Date.now()) {
    toast("Waktu antar habis. Ongkos kembali ke penumpang.");
    void ojekCommand("read");
    return;
  }
  const pose = bikePose();
  if (!pose) return;
  const aboard = passengerAboard();
  const spot = aboard ? job.dropoff : job.pickup;
  const dist = Math.hypot(pose.x - spot.x, pose.z - spot.z);
  if (!aboard) {
    if (dist <= OJEK_ARRIVE_M * 2 && Date.now() - lastNag > 6000) {
      lastNag = Date.now();
      toast(`Berhenti lalu tekan "Ajak bonceng" untuk ${job.passenger}.`);
    }
    return;
  }
  if (dist > RIDE_ARRIVE_M || Math.abs(pose.speed) >= STOPPED_MPS) return;
  if (!job.claimedAt || Date.now() < Date.parse(job.claimedAt) + job.minSeconds * 1000) return;
  const before = wallet(useOjek.getState().data);
  void ojekCommand("complete_ride", { rideId: job.id }).then((s) => {
    if (s && !s.ojek.job)
      toast(
        `Sampai! +Rp${(wallet(s) - before).toLocaleString("id-ID")} dari ${job.passenger} ke ${walletName(s)}.`,
      );
  });
}

/** Getting off the bike with an NPC order cancels it (and lowers the rating): ask first. */
export function confirmLeaveOjek(): boolean {
  const order = useOjek.getState().data?.ojek.order;
  const v = ownVehicle();
  if (!order || !v || !bikeModel(v.model)) return true;
  if (
    !window.confirm(
      "Turun sekarang akan membatalkan order ojol dan rating kamu turun. Tetap turun?",
    )
  )
    return false;
  void ojekCommand("cancel_order", { orderId: order.id });
  return true;
}

/** Panggil motorku: the server parks the player's own motor beside them in this room. */
export async function summonMotor() {
  await mobilityCommand("vehicle-summon");
  toast("Motormu sudah parkir di sebelahmu. Tekan Naik.");
}

export function canBid() {
  return !!bikePose() && useGame.getState().overlay === "none";
}

export async function setOnBid(onBid: boolean) {
  if (onBid && !canBid()) {
    toast("Naik motor dulu untuk ON BID.");
    return;
  }
  useOjek.setState({ onBid });
  nextBidPoll = 0;
  if (!onBid) {
    const offer = useOjek.getState().data?.ojek.offer;
    if (offer) await ojekCommand("decline_bid", { orderId: offer.id });
  } else if (!useOjek.getState().data) await ojekCommand("read");
}

// Room/account changes cannot carry a pending response or ON BID into another session.
useChannels.subscribe((state, previous) => {
  if (state.lease?.channel === previous.lease?.channel && state.playing === previous.playing)
    return;
  accountGeneration++;
  polling = false;
  nextBidPoll = 0;
  useOjek.setState({
    data: null,
    rides: [],
    onBid: false,
    busy: false,
    error: null,
    picked: null,
    boardingUntil: null,
    passengerDownUntil: 0,
    remark: null,
  });
});
