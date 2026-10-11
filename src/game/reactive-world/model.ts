/** Normalized, public operational signals only. Timestamps are UTC epoch milliseconds. */
export const EVENT_TYPES = ["STORE_RUSH", "WAREHOUSE_RUSH", "COURIER_PICKUP"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export type EventStatus = "INACTIVE" | "STARTING" | "ACTIVE" | "ENDING";
export interface WorldEvent {
  id: string;
  type: EventType;
  status: EventStatus;
  intensity: number;
  startedAt: number;
  expiresAt: number;
  revision: number;
  payload: { parcelTier?: "LOW" | "MEDIUM" | "HIGH"; courier?: "JNE" | "GoSend" | "Deliveree" };
}
export interface WorldSnapshot {
  revision: number;
  generatedAt: number;
  events: WorldEvent[];
}
export const CONFIG = {
  leaseMs: 90_000,
  pollMs: 45_000,
  minDurationMs: 60_000,
  cooldownMs: 30_000,
  fadeMs: 2500,
  ttlMs: 300_000,
};
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const revision = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const timestamp = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0;
/** Whitelists fields: backend order/customer data can never leak into game state. */
export function parseSnapshot(value: unknown): WorldSnapshot | null {
  if (
    !record(value) ||
    !revision(value["revision"]) ||
    !timestamp(value["generatedAt"]) ||
    !Array.isArray(value["events"]) ||
    value["events"].length > 3
  )
    return null;
  const events: WorldEvent[] = [];
  for (const v of value["events"]) {
    if (
      !record(v) ||
      typeof v["id"] !== "string" ||
      !/^[\w:-]{1,100}$/.test(v["id"]) ||
      !EVENT_TYPES.includes(v["type"] as EventType) ||
      !["INACTIVE", "STARTING", "ACTIVE", "ENDING"].includes(String(v["status"])) ||
      typeof v["intensity"] !== "number" ||
      !Number.isFinite(v["intensity"]) ||
      v["intensity"] < 0 ||
      v["intensity"] > 1 ||
      !timestamp(v["startedAt"]) ||
      !timestamp(v["expiresAt"]) ||
      v["expiresAt"] <= v["startedAt"] ||
      !revision(v["revision"]) ||
      v["revision"] > value["revision"] ||
      !record(v["payload"])
    )
      return null;
    const p = v["payload"];
    if (
      p["parcelTier"] !== undefined &&
      !["LOW", "MEDIUM", "HIGH"].includes(String(p["parcelTier"]))
    )
      return null;
    if (
      p["courier"] !== undefined &&
      !["JNE", "GoSend", "Deliveree"].includes(String(p["courier"]))
    )
      return null;
    events.push({
      id: v["id"],
      type: v["type"] as EventType,
      status: v["status"] as EventStatus,
      intensity: v["intensity"],
      startedAt: v["startedAt"],
      expiresAt: v["expiresAt"],
      revision: v["revision"],
      payload: {
        ...(p["parcelTier"]
          ? { parcelTier: p["parcelTier"] as WorldEvent["payload"]["parcelTier"] }
          : {}),
        ...(p["courier"] ? { courier: p["courier"] as WorldEvent["payload"]["courier"] } : {}),
      },
    } as WorldEvent);
  }
  if (
    new Set(events.map((e) => e.type)).size !== events.length ||
    new Set(events.map((e) => e.id)).size !== events.length
  )
    return null;
  return { revision: value["revision"], generatedAt: value["generatedAt"], events };
}
export function acceptSnapshot(previous: WorldSnapshot | null, next: WorldSnapshot, now: number) {
  if (next.generatedAt > now + 30_000 || next.generatedAt < now - CONFIG.leaseMs) return false;
  if (!previous) return true;
  if (next.revision < previous.revision || next.generatedAt < previous.generatedAt) return false;
  if (
    next.revision === previous.revision &&
    JSON.stringify(next.events) !== JSON.stringify(previous.events)
  )
    return false;
  return next.events.every((e) => {
    const old = previous.events.find((p) => p.id === e.id);
    return (
      !old ||
      (e.revision >= old.revision &&
        (e.revision !== old.revision || JSON.stringify(e) === JSON.stringify(old)))
    );
  });
}
export function activeEvents(snapshot: WorldSnapshot | null, confirmedAt: number, now: number) {
  if (!snapshot || now - confirmedAt > CONFIG.leaseMs) return [];
  return snapshot.events.filter(
    (e) =>
      e.startedAt <= now && e.expiresAt > now && (e.status === "STARTING" || e.status === "ACTIVE"),
  );
}
export function customerCount(intensity: number, low: boolean) {
  return intensity <= 0 ? 0 : low ? (intensity < 0.5 ? 1 : 2) : 2 + Math.round(intensity * 2);
}
export interface PickupRun {
  eventId: string;
  stage: "incoming" | "pickup" | "returning" | "leaving" | "done";
  stageAt: number;
}
export function validPickup(v: unknown): v is PickupRun | null {
  return (
    v === null ||
    (record(v) &&
      typeof v["eventId"] === "string" &&
      /^[\w:-]{1,100}$/.test(v["eventId"]) &&
      ["incoming", "pickup", "returning", "leaving", "done"].includes(String(v["stage"])) &&
      timestamp(v["stageAt"]))
  );
}
