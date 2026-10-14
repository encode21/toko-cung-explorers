import { create } from "zustand";
import {
  acceptSnapshot,
  activeEvents,
  CONFIG,
  parseSnapshot,
  type WorldSnapshot,
  type WorldEvent,
} from "./model";
export type WorldSource = "OFF" | "MOCK" | "LIVE";
export const WORLD_SOURCE: WorldSource =
  import.meta.env["VITE_REACTIVE_WORLD_SOURCE"] === "OFF"
    ? "OFF"
    : import.meta.env.DEV && import.meta.env["VITE_REACTIVE_WORLD_SOURCE"] === "MOCK"
      ? "MOCK"
      : "LIVE";
export const useReactiveWorld = create(() => ({
  source: WORLD_SOURCE,
  snapshot: null as WorldSnapshot | null,
  confirmedAt: 0,
  events: [] as WorldEvent[],
  store: 0,
  warehouse: 0,
  error: "",
  host: false,
  customers: 0,
  workers: 0,
}));
const eventRevisions = new Map<string, WorldEvent>();
export function resetWorldHistory() {
  eventRevisions.clear();
}
export function receiveWorldSnapshot(value: unknown, now = Date.now()) {
  const next = parseSnapshot(value);
  if (!next || !acceptSnapshot(useReactiveWorld.getState().snapshot, next, now)) return false;
  for (const event of next.events) {
    const old = eventRevisions.get(event.id);
    if (
      old &&
      (event.revision < old.revision ||
        (event.revision === old.revision && JSON.stringify(event) !== JSON.stringify(old)))
    )
      return false;
  }
  for (const event of next.events) eventRevisions.set(event.id, event);
  useReactiveWorld.setState({ snapshot: next, confirmedAt: now, error: "" });
  return true;
}
export function advanceWorld(now: number, elapsed: number) {
  const s = useReactiveWorld.getState();
  const events = activeEvents(s.snapshot, s.confirmedAt, now);
  const intensity = (type: WorldEvent["type"]) =>
    events.find((e) => e.type === type)?.intensity ?? 0;
  const approach = (v: number, target: number) =>
    Math.abs(target - v) < 0.005
      ? target
      : v + Math.sign(target - v) * Math.min(Math.abs(target - v), elapsed / CONFIG.fadeMs);
  const store = approach(s.store, intensity("STORE_RUSH"));
  const warehouse = approach(s.warehouse, intensity("WAREHOUSE_RUSH"));
  if (
    store !== s.store ||
    warehouse !== s.warehouse ||
    events.length !== s.events.length ||
    events.some((e, i) => e !== s.events[i])
  )
    useReactiveWorld.setState({ events, store, warehouse });
}
export function parcelCount(intensity: number, tier?: WorldEvent["payload"]["parcelTier"]) {
  return intensity <= 0
    ? 0
    : tier === "HIGH"
      ? 8
      : tier === "MEDIUM"
        ? 5
        : tier === "LOW"
          ? 2
          : intensity < 0.34
            ? 2
            : intensity < 0.67
              ? 5
              : 8;
}
