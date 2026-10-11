import { CONFIG, EVENT_TYPES, type EventType, type WorldEvent, type WorldSnapshot } from "./model";
import { receiveWorldSnapshot, useReactiveWorld } from "./store";
import { createId } from "@/lib/id";
import { isTrafficHost } from "@/game/traffic/traffic-sync";
let demoAt = 0;
let demoStep = -1;
function write(events: WorldEvent[], now = Date.now()) {
  const revision = (useReactiveWorld.getState().snapshot?.revision ?? 0) + 1;
  return receiveWorldSnapshot({
    revision,
    generatedAt: now,
    events: events.map((e) => ({ ...e, revision })),
  });
}
export function activate(type: EventType, intensity = 0.7, payload: WorldEvent["payload"] = {}) {
  if (!import.meta.env.DEV || !isTrafficHost() || useReactiveWorld.getState().source !== "MOCK")
    return "Kontrol MOCK hanya tersedia untuk host.";
  const now = Date.now();
  const events = useReactiveWorld.getState().snapshot?.events ?? [];
  const old = events.find((e) => e.type === type);
  if (
    old &&
    (old.status === "INACTIVE" || old.status === "ENDING" || old.expiresAt <= now) &&
    now - old.expiresAt < CONFIG.cooldownMs
  )
    return `Cooldown: tunggu ${Math.ceil((CONFIG.cooldownMs - (now - old.expiresAt)) / 1000)} detik.`;
  const continuing = old && ["ACTIVE", "STARTING"].includes(old.status) && old.expiresAt > now;
  const event: WorldEvent = {
    id: continuing ? old.id : createId(),
    type,
    status: continuing ? old.status : "STARTING",
    intensity,
    startedAt: continuing ? old.startedAt : now,
    expiresAt: now + CONFIG.ttlMs,
    revision: 0,
    payload,
  };
  return write([...events.filter((e) => e.type !== type), event])
    ? `${type} aktif. Efek mulai diterapkan.`
    : "Aktivasi gagal: snapshot ditolak.";
}
export function deactivate(type: EventType, force = false) {
  if (!import.meta.env.DEV || !isTrafficHost() || useReactiveWorld.getState().source !== "MOCK")
    return;
  const now = Date.now();
  const events = useReactiveWorld.getState().snapshot?.events ?? [];
  write(
    events.map((e) =>
      e.type !== type
        ? e
        : {
            ...e,
            expiresAt: force
              ? Math.max(now, e.startedAt + 1)
              : Math.max(now, e.startedAt + CONFIG.minDurationMs),
          },
    ),
  );
}
export function reset() {
  if (!import.meta.env.DEV || !isTrafficHost() || useReactiveWorld.getState().source !== "MOCK")
    return;
  demoAt = 0;
  demoStep = -1;
  write([]);
}
export function startDemo() {
  if (!isTrafficHost()) return;
  reset();
  demoAt = Date.now();
  demoStep = 0;
}
export function demoState() {
  return { demoAt, demoStep };
}
export function adoptDemo(value: unknown) {
  const d = value as { demoAt?: number; demoStep?: number } | null;
  if (
    d &&
    Number.isSafeInteger(d.demoAt) &&
    Number.isSafeInteger(d.demoStep) &&
    d.demoAt! >= 0 &&
    d.demoStep! >= -1 &&
    d.demoStep! <= 4
  ) {
    demoAt = d.demoAt!;
    demoStep = d.demoStep!;
  }
}
export function tickMock(now: number): WorldSnapshot {
  const elapsed = now - demoAt;
  if (demoAt) {
    const times = [30_000, 90_000, 150_000];
    for (let i = 0; i < times.length; i++)
      if (demoStep === i && elapsed >= times[i]!) {
        activate(EVENT_TYPES[i]!, 0.85);
        demoStep++;
      }
    if (elapsed >= 240_000) reset();
  }
  const s = useReactiveWorld.getState().snapshot;
  const events = (s?.events ?? []).map((e) =>
    e.expiresAt <= now && e.status !== "INACTIVE"
      ? {
          ...e,
          status: now - e.expiresAt < CONFIG.fadeMs ? ("ENDING" as const) : ("INACTIVE" as const),
        }
      : e.status === "STARTING" && now - e.startedAt >= CONFIG.fadeMs
        ? { ...e, status: "ACTIVE" as const }
        : e,
  );
  if (JSON.stringify(events) !== JSON.stringify(s?.events ?? [])) write(events, now);
  const current = useReactiveWorld.getState().snapshot;
  return { revision: current?.revision ?? 0, generatedAt: now, events: current?.events ?? [] };
}
