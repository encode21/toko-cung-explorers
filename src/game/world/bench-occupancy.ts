import type { RemoteState } from "../../net/net-store";
import { BENCH_SEATS, benchSitPose, type BenchSpot } from "./street-props.ts";

type BenchPeer = Pick<RemoteState, "id" | "x" | "y" | "z" | "anim" | "seatId">;
const citySeats = BENCH_SEATS.filter((seat) => seat.benchId);
const citySeatIds = new Set(citySeats.map((seat) => seat.id));
const anchors = citySeats.map((seat) => ({ seat, pose: benchSitPose(seat) }));

function legacySeat(peer: BenchPeer) {
  if (peer.anim !== "Sit") return undefined;
  // Older clients sit at the physical center, about half a seat from either new anchor.
  let best = 0.6;
  let nearest: string | undefined;
  for (const { seat, pose } of anchors) {
    if (Math.abs(pose.y - peer.y) > 0.1) continue;
    const distance = Math.hypot(pose.x - peer.x, pose.z - peer.z);
    if (distance < best) {
      best = distance;
      nearest = seat.id;
    }
  }
  return nearest;
}

const noClaims: ReadonlyMap<string, BenchPeer> = new Map();

export function benchSeatClaims(peers: Iterable<BenchPeer>): ReadonlyMap<string, BenchPeer> {
  let claims: Map<string, BenchPeer> | undefined;
  for (const peer of peers) {
    const seatId = peer.seatId === undefined ? legacySeat(peer) : peer.seatId;
    if (!seatId || !citySeatIds.has(seatId)) continue;
    claims ??= new Map();
    const other = claims.get(seatId);
    // Legacy clients cannot yield. Updated clients agree on the lowest connection id.
    if (!other || (other.seatId !== undefined && (peer.seatId === undefined || peer.id < other.id)))
      claims.set(seatId, peer);
  }
  return claims ?? noClaims;
}

export function availableBenchSeat(
  seat: BenchSpot,
  claims: ReadonlyMap<string, BenchPeer>,
  currentPlayerId?: string,
) {
  const owner = claims.get(seat.id);
  if (!owner || (currentPlayerId && owner.seatId !== undefined && currentPlayerId < owner.id))
    return seat;
  return citySeats.find((other) => other.benchId === seat.benchId && !claims.has(other.id));
}
