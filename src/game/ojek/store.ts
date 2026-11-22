import { create } from "zustand";
import { worldRequest } from "@/services/world/client";
import { createId } from "@/lib/id";
import { useGame } from "@/state/game-store";
import { bikeModel } from "@/game/vehicles/model";
import { ownVehicle, vehicleHeartbeat } from "@/game/vehicles/runtime";
import { mobilityCommand } from "@/game/mobility/store";

export interface OjekSpot {
  id: string;
  name: string;
  x: number;
  z: number;
}
export interface OjekMotor {
  id: string;
  name: string;
  price: number;
  fare_percent: number;
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
}
export interface OjekSnapshot {
  motors: OjekMotor[];
  ojek: {
    hasWarung: boolean;
    cash: number | null;
    motor: OjekMotor | null;
    tripsThisHour: number;
    tripsPerHourCap: number;
    setoranPercent: number;
    order: OjekOrder | null;
  };
}

interface OjekState {
  data: OjekSnapshot | null;
  busy: boolean;
  error: string | null;
  /** Order whose passenger is on the back seat (client-side; the server only checks timing). */
  picked: number | null;
}

export const useOjek = create<OjekState>(() => ({
  data: null,
  busy: false,
  error: null,
  picked: null,
}));

/** Within this many metres of a spot counts as arrived. */
export const OJEK_ARRIVE_M = 4;

export async function ojekCommand(
  action: "read" | "buy_motor" | "accept" | "complete",
  extra: Record<string, unknown> = {},
): Promise<OjekSnapshot | null> {
  if (useOjek.getState().busy) return null;
  useOjek.setState({ busy: true, error: null });
  try {
    const data = await worldRequest<OjekSnapshot>("ojek", {
      action,
      ...(action === "read" ? {} : { requestId: createId() }),
      ...extra,
    });
    const { picked } = useOjek.getState();
    useOjek.setState({ data, picked: data.ojek.order?.id === picked ? picked : null });
    syncWaypoint();
    return data;
  } catch (e) {
    useOjek.setState({ error: e instanceof Error ? e.message : "Ojek gagal dimuat." });
    return null;
  } finally {
    useOjek.setState({ busy: false });
  }
}

export function ojekTarget(): OjekSpot | null {
  const { data, picked } = useOjek.getState();
  const order = data?.ojek.order;
  if (!order) return null;
  return picked === order.id ? order.dropoff : order.pickup;
}

function syncWaypoint() {
  const game = useGame.getState();
  const { data, picked } = useOjek.getState();
  const order = data?.ojek.order;
  if (order) game.setWaypoint(picked === order.id ? "ojek-dropoff" : "ojek-pickup");
  else if (game.waypoint === "ojek-pickup" || game.waypoint === "ojek-dropoff")
    game.setWaypoint(null);
}

/** Driver pose when the local player is riding a bike as driver, else null. */
function bikePose() {
  const v = ownVehicle();
  return v && bikeModel(v.model) ? (vehicleHeartbeat() ?? null) : null;
}

/** Called every ~500 ms while an order is active: pick up, then drop off on arrival. */
export function ojekTick() {
  const { data, picked, busy } = useOjek.getState();
  const order = data?.ojek.order;
  if (!order || busy) return;
  if (Date.parse(order.expiresAt) <= Date.now()) {
    useGame.getState().setToast("Penumpang sudah pergi. Ambil order baru ya.");
    void ojekCommand("read");
    return;
  }
  const pose = bikePose();
  const spot = ojekTarget();
  if (!pose || !spot || Math.hypot(pose.x - spot.x, pose.z - spot.z) > OJEK_ARRIVE_M) return;
  if (picked !== order.id) {
    useOjek.setState({ picked: order.id });
    syncWaypoint();
    useGame.getState().setToast(`Penumpang naik. Antar ke ${order.dropoff.name}.`);
    return;
  }
  if (Date.now() < Date.parse(order.acceptedAt) + order.minSeconds * 1000) return; // Server rejects too-fast trips.
  const before = data.ojek.cash ?? 0;
  void ojekCommand("complete", { orderId: order.id }).then((s) => {
    if (!s || s.ojek.order) return;
    const got = (s.ojek.cash ?? 0) - before;
    const cut = order.fare - got;
    useGame
      .getState()
      .setToast(
        `Sampai! +Rp${got.toLocaleString("id-ID")} ke Kas usaha` +
          (cut > 0 ? ` (setoran juragan Rp${cut.toLocaleString("id-ID")}).` : "."),
      );
  });
}

/** Panggil motorku: the server parks the player's own motor beside them in this room. */
export async function summonMotor() {
  await mobilityCommand("vehicle-summon");
  useGame.getState().setToast("Motormu sudah parkir di sebelahmu. Tekan Naik.");
}
