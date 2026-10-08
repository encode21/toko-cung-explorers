/** One elected connected/visible peer owns traffic. Followers never simulate on missing data. */
import { useOps } from "@/state/ops-store";
import { useNet } from "@/net/net-store";
import { getActiveChannel, playerId } from "@/net/useWorldChannel";
import {
  validTrafficSnapshot,
  reconcileProgress,
  type TrafficSnap,
  type TrafficVehicleSnap,
} from "./traffic-protocol";
export type { TrafficSnap } from "./traffic-protocol";
export const trafficDistances = new Map<string, Omit<TrafficVehicleSnap, "id">>();
let latest: TrafficSnap | null = null;
let receivedAt = 0,
  lastPublishAt = 0,
  sequence = 0;
let owner: string | null = null,
  epoch = "";
let signature = "";
const retired = new Set<string>();
function authority() {
  const net = useNet.getState();
  const elected = net.connected
    ? (net.roster
        .filter((r) => r.available !== false)
        .sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || a.id.localeCompare(b.id))[0]?.id ??
      null)
    : null;
  if (elected !== owner) {
    if (latest) retired.add(latest.epoch);
    owner = elected;
    sequence = 0;
    signature = "";
    lastPublishAt = 0;
    epoch = elected === playerId ? crypto.randomUUID() : "";
    if (elected === playerId && latest) useOps.getState().setTruck(latest.truck);
  }
  return elected;
}
export function isTrafficHost() {
  return authority() === playerId;
}
export function resetTrafficSync() {
  latest = null;
  owner = null;
  receivedAt = 0;
  lastPublishAt = 0;
  sequence = 0;
  epoch = "";
  signature = "";
  retired.clear();
  trafficDistances.clear();
}
export function handleTrafficSnap(snap: TrafficSnap) {
  if (
    !validTrafficSnapshot(snap) ||
    snap.host !== authority() ||
    snap.host === playerId ||
    retired.has(snap.epoch)
  )
    return;
  if (latest?.epoch === snap.epoch && snap.seq <= latest.seq) return;
  if (latest && latest.epoch !== snap.epoch) retired.add(latest.epoch);
  latest = snap;
  receivedAt = performance.now();
  useOps.getState().setTruck(snap.truck);
}
export function getSyncedVehicle(id: string) {
  if (isTrafficHost() || !latest || latest.host !== owner) return null;
  const v = latest.vehicles.find((v) => v.id === id);
  if (!v) return null;
  const age = Math.max(0, (performance.now() - receivedAt) / 1000);
  return {
    ...v,
    distance: v.distance + (v.state === "MOVING" ? v.speed * Math.min(age, 0.2) : 0),
    speed: age > 2 ? 0 : v.speed,
  };
}
/** Handoff adopts the previous owner's most recent state, including active/route state. */
export function getTrafficHandoff(id: string) {
  return latest?.vehicles.find((v) => v.id === id) ?? null;
}
export function maybePublishTraffic(nowMs: number, force = false) {
  if (!isTrafficHost()) return;
  const channel = getActiveChannel();
  if (!channel) return;
  const vehicles = [...trafficDistances].map(([id, v]) => ({ id, ...v }));
  if (vehicles.length !== 4) return;
  const nextSignature = JSON.stringify([
    useOps.getState().truck,
    vehicles.map((v) => [v.id, v.active, v.state, v.routeId]),
  ]);
  if (!force && nowMs - lastPublishAt < (nextSignature === signature ? 125 : 40)) return;
  signature = nextSignature;
  lastPublishAt = nowMs;
  const payload: TrafficSnap = {
    host: playerId,
    epoch,
    seq: ++sequence,
    at: Date.now(),
    truck: useOps.getState().truck,
    vehicles,
  };
  latest = payload;
  void channel.send({ type: "broadcast", event: "traffic", payload });
}
export const followDistance = reconcileProgress;
if (import.meta.env.DEV && typeof window !== "undefined")
  Object.assign(window, {
    trafficDebug: () => ({
      owner: authority(),
      host: isTrafficHost(),
      epoch,
      sequence,
      receivedAt,
      snapshot: latest,
      entities: [...trafficDistances],
    }),
  });
