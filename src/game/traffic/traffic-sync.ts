/**
 * Sync lalu lintas antar klien: host (playerId terkecil di roster)
 * mensimulasikan & broadcast; follower mengikuti snapshot.
 */

import type { TruckPhase } from "@/state/ops-store";
import { useOps } from "@/state/ops-store";
import { useNet } from "@/net/net-store";
import { getActiveChannel, playerId } from "@/net/useWorldChannel";

export interface TrafficVehicleSnap {
  id: string;
  distance: number;
  speed: number;
}

export interface TrafficSnap {
  host: string;
  at: number;
  truck: TruckPhase;
  vehicles: TrafficVehicleSnap[];
}

/** Distance/speed yang diisi host tiap frame. */
export const trafficDistances = new Map<string, { distance: number; speed: number }>();

let latest: TrafficSnap | null = null;
let lastPublishAt = 0;

export function isTrafficHost() {
  const roster = useNet.getState().roster;
  if (roster.length <= 1) return true;
  const ids = roster.map((r) => r.id).sort();
  return ids[0] === playerId;
}

export function handleTrafficSnap(snap: TrafficSnap) {
  if (snap.host === playerId) return;
  if (isTrafficHost()) return;
  latest = snap;
  if (snap.truck !== useOps.getState().truck) useOps.getState().setTruck(snap.truck);
}

export function getSyncedVehicle(id: string) {
  if (isTrafficHost() || !latest) return null;
  return latest.vehicles.find((v) => v.id === id) ?? null;
}

/** Host kirim state ~8 Hz. */
export function maybePublishTraffic(nowMs: number) {
  if (!isTrafficHost()) return;
  if (useNet.getState().roster.length <= 1) return;
  if (nowMs - lastPublishAt < 120) return;
  lastPublishAt = nowMs;
  const channel = getActiveChannel();
  if (!channel) return;
  const payload: TrafficSnap = {
    host: playerId,
    at: nowMs,
    truck: useOps.getState().truck,
    vehicles: [...trafficDistances.entries()].map(([id, v]) => ({
      id,
      distance: Math.round(v.distance * 100) / 100,
      speed: Math.round(v.speed * 100) / 100,
    })),
  };
  void channel.send({ type: "broadcast", event: "traffic", payload });
}

/** Dekati distance host; wrap lane di-handle dengan snap jika lompat besar. */
export function followDistance(current: number, target: number, total: number, dt: number) {
  let diff = target - current;
  if (total > 1 && Math.abs(diff) > total * 0.5) {
    // Wrap loop — ikut target langsung.
    return target;
  }
  if (Math.abs(diff) > 12) return target;
  return current + diff * Math.min(1, dt * 10);
}
