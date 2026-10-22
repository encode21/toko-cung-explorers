import {
  TRUCK_SOURCE,
  TRUCK_PARCELS,
  freshTruck,
  relocateLegacyTruck,
  truckObjective,
  truckParked,
  type TruckState,
} from "./truck-model";
import type { WorldEvent } from "../reactive-world/model";
export const DEFINITIONS = {
  TRUCK_DELIVERY: {
    event: "TRUCK_DELIVERY",
    title: "Supir Pengiriman",
    description: "Muat tiga paket, kemudikan truk, lalu bongkar di gudang belakang.",
    objective: "Antar tiga paket dengan truk",
    target: 3,
  },
  STORE_RUSH_HELP_CASHIER: {
    event: "STORE_RUSH",
    title: "Bantu Kasir",
    description: "Toko sedang ramai. Bantu proses beberapa item agar antrean cepat bergerak.",
    objective: "Scan barang",
    target: 5,
  },
  WAREHOUSE_RUSH_HELP_PACKING: {
    event: "WAREHOUSE_RUSH",
    title: "Bantu Gudang",
    description: "Pesanan sedang menumpuk. Bantu pindahkan paket ke area packing.",
    objective: "Antar paket ke meja packing",
    target: 3,
  },
} as const;
export type MissionType = keyof typeof DEFINITIONS;
export type MissionStatus =
  "AVAILABLE" | "ACCEPTED" | "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED";
export type MissionAction =
  "accept" | "scan" | "take" | "place" | "cancel" | "load" | "board" | "exit" | "unload";
export const GRACE_MS = 120_000;
export const ACTION_MS = 1100;
export interface Mission {
  id: string;
  type: MissionType;
  sourceEventId: string;
  status: MissionStatus;
  acceptedAt: number;
  expiresAt: number;
  sourceEndedAt: number | null;
  progress: number;
  carrying: boolean;
  lastActionAt: number;
  reward: 1;
  truck?: TruckState | undefined;
}
export interface MissionSession {
  revision: number;
  active: Mission | null;
  last: Mission | null;
  finished: string[];
  contribution: number;
  updatedAt: number;
}
export interface MissionRoom {
  revision: number;
  sessions: Record<string, MissionSession>;
}
export const emptySession = (): MissionSession => ({
  revision: 0,
  active: null,
  last: null,
  finished: [],
  contribution: 0,
  updatedAt: 0,
});
export const ANCHORS = {
  scan: {
    id: "mission-cashier",
    label: "Scan Barang",
    position: [5.4, 0, -1] as [number, number, number],
    radius: 1.25,
  },
  take: {
    id: "mission-parcel",
    label: "Ambil Paket",
    position: [-7.3, 0, -14.8] as [number, number, number],
    radius: 1.25,
  },
  place: {
    id: "mission-packing",
    label: "Taruh Paket",
    position: [-3.6, 0, -15.3] as [number, number, number],
    radius: 1.3,
  },
};
export function offers(events: WorldEvent[], session: MissionSession) {
  return (Object.keys(DEFINITIONS) as MissionType[]).flatMap<{
    type: MissionType;
    sourceEventId: string;
    expiresAt: number;
  }>((type) => {
    if (type === "TRUCK_DELIVERY")
      return !session.finished.includes(TRUCK_SOURCE) &&
        session.active?.sourceEventId !== TRUCK_SOURCE
        ? [{ type, sourceEventId: TRUCK_SOURCE, expiresAt: 4_102_444_800_000 }]
        : [];
    const event = events.find((e) => e.type === DEFINITIONS[type].event && e.status === "ACTIVE");
    return event &&
      !session.finished.includes(event.id) &&
      session.active?.sourceEventId !== event.id
      ? [{ type, sourceEventId: event.id, expiresAt: event.expiresAt }]
      : [];
  });
}
export function finish(
  s: MissionSession,
  status: "COMPLETED" | "EXPIRED" | "CANCELLED",
  now: number,
): MissionSession {
  if (!s.active) return s;
  return {
    ...s,
    revision: s.revision + 1,
    updatedAt: now,
    active: null,
    last: { ...s.active, status, carrying: false },
    finished:
      s.active.truck && status !== "COMPLETED"
        ? s.finished
        : [...s.finished, s.active.sourceEventId].slice(-64),
    contribution: s.contribution + (status === "COMPLETED" ? 1 : 0),
  };
}
export function reconcileMission(
  s: MissionSession,
  events: WorldEvent[],
  now: number,
): MissionSession {
  if (!s.active) return s;
  let active = s.active;
  if (active.truck) {
    const truck = relocateLegacyTruck(active.truck);
    if (truck !== active.truck) {
      active = { ...active, truck };
      s = { ...s, active, revision: s.revision + 1, updatedAt: now };
    }
  }
  if (
    active.type !== "TRUCK_DELIVERY" &&
    !events.some((e) => e.id === active.sourceEventId) &&
    active.sourceEndedAt === null
  ) {
    active = {
      ...active,
      sourceEndedAt: now,
      expiresAt: Math.min(active.expiresAt, now + GRACE_MS),
    };
    s = { ...s, active, revision: s.revision + 1, updatedAt: now };
  }
  return now >= active.expiresAt ? finish(s, "EXPIRED", now) : s;
}
/** Host controller: clients request actions, never submit progress or rewards. */
export function applyMissionAction(
  s: MissionSession,
  action: MissionAction,
  sourceEventId: string | undefined,
  events: WorldEvent[],
  position: readonly number[] | null,
  now: number,
): { session: MissionSession; error?: string } {
  const fail = (error: string) => ({ session: s, error });
  s = reconcileMission(s, events, now);
  if (action === "accept") {
    if (s.active) return fail("Tuntaskan misi aktif terlebih dahulu.");
    const offer = offers(events, s).find(
      (o) => o.sourceEventId === sourceEventId && o.expiresAt > now,
    );
    if (!offer) return fail("Misi sudah tidak tersedia.");
    if (
      offer.type === "TRUCK_DELIVERY" &&
      (!position ||
        Math.hypot(position[0]! - TRUCK_PARCELS[0], position[2]! - TRUCK_PARCELS[2]) > 2.5 ||
        Math.abs(position[1]! - 0.83) > 1.5)
    )
      return fail("Dekati paket pengiriman di depan toko.");
    return {
      session: {
        ...s,
        revision: s.revision + 1,
        updatedAt: now,
        active: {
          id: `${offer.type}:${offer.sourceEventId}${offer.type === "TRUCK_DELIVERY" ? `:${now}` : ""}`,
          type: offer.type,
          sourceEventId: offer.sourceEventId,
          status: "ACCEPTED",
          acceptedAt: now,
          expiresAt: Math.min(
            offer.expiresAt + GRACE_MS,
            now + (offer.type === "TRUCK_DELIVERY" ? 1_200_000 : 900_000),
          ),
          sourceEndedAt: null,
          progress: 0,
          carrying: false,
          lastActionAt: 0,
          reward: 1,
          ...(offer.type === "TRUCK_DELIVERY" ? { truck: freshTruck() } : {}),
        },
      },
    };
  }
  const m = s.active;
  if (!m) return fail("Tidak ada misi aktif.");
  if (action === "cancel") return { session: finish(s, "CANCELLED", now) };
  if (m.truck) {
    const t = m.truck,
      expected = truckObjective(m);
    if (action !== expected.action) return fail("Ikuti tahap pengiriman yang ditandai.");
    if (now - m.lastActionAt < ACTION_MS) return fail("Tunggu aksi sebelumnya selesai.");
    if (
      !position ||
      !position.every(Number.isFinite) ||
      Math.abs(position[1]! - 0.83) > 2.5 ||
      Math.hypot(position[0]! - expected.position[0], position[2]! - expected.position[2]) >
        expected.radius + 0.25
    )
      return fail("Dekati titik pengiriman terlebih dahulu.");
    if (action === "exit" && Math.abs(t.speed) > 0.15)
      return fail("Rem sampai truk berhenti sebelum turun.");
    if ((action === "unload" || action === "place") && !truckParked(t))
      return fail("Parkir di area bongkar gudang belakang.");
    const truck = {
      ...t,
      loaded: t.loaded + Number(action === "load"),
      unloaded: t.unloaded + Number(action === "place"),
      driver: action === "board" ? "pending" : action === "exit" ? null : t.driver,
      speed: 0,
    };
    const next: MissionSession = {
      ...s,
      revision: s.revision + 1,
      updatedAt: now,
      active: {
        ...m,
        truck,
        status: "ACTIVE",
        carrying: action === "take" || action === "unload",
        progress: truck.unloaded,
        lastActionAt: now,
      },
    };
    return { session: truck.unloaded === 3 ? finish(next, "COMPLETED", now) : next };
  }
  if (action === "load" || action === "board" || action === "exit" || action === "unload")
    return fail("Tidak ada pengiriman aktif.");
  if (now - m.lastActionAt < ACTION_MS) return fail("Tunggu aksi sebelumnya selesai.");
  if (
    m.type === "STORE_RUSH_HELP_CASHIER"
      ? action !== "scan"
      : action !== (m.carrying ? "place" : "take")
  )
    return fail("Aksi tidak sesuai tujuan misi.");
  const anchor = ANCHORS[action];
  if (
    !position ||
    position.length !== 3 ||
    !position.every(Number.isFinite) ||
    Math.abs(position[1]! - 0.83 - anchor.position[1]) > 1.5 ||
    Math.hypot(position[0]! - anchor.position[0], position[2]! - anchor.position[2]) >
      anchor.radius + 0.25
  )
    return fail("Dekati titik bantuan terlebih dahulu.");
  const progress = m.progress + (action === "take" ? 0 : 1);
  const next: MissionSession = {
    ...s,
    revision: s.revision + 1,
    updatedAt: now,
    active: { ...m, status: "ACTIVE", progress, carrying: action === "take", lastActionAt: now },
  };
  return {
    session: progress >= DEFINITIONS[m.type].target ? finish(next, "COMPLETED", now) : next,
  };
}
