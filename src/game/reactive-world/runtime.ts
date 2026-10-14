import { getActiveChannel, playerId } from "@/net/useWorldChannel";
import { createId } from "@/lib/id";
import { isTrafficHost, trafficAuthority } from "@/game/traffic/traffic-sync";
import { useOps } from "@/state/ops-store";
import { useGame } from "@/state/game-store";
import { useNet } from "@/net/net-store";
import { CONFIG, parseSnapshot } from "./model";
import {
  advanceWorld,
  receiveWorldSnapshot,
  resetWorldHistory,
  useReactiveWorld,
  WORLD_SOURCE,
} from "./store";
import { stepPickup } from "./pickup";
let roomKey = "";
let owner: string | null = null;
let epoch = "",
  sequence = 0,
  lastSent = 0,
  lastFetch = 0,
  generation = 0;
let accepted: { epoch: string; sequence: number } | null = null;
const retired = new Set<string>();
let mock: typeof import("./mock") | undefined;
let fetching = false;
export function worldRoom(room: string) {
  if (room === roomKey) return;
  roomKey = room;
  resetWorldHistory();
  generation++;
  owner = null;
  epoch = "";
  sequence = 0;
  accepted = null;
  retired.clear();
  lastFetch = 0;
  useReactiveWorld.setState({
    snapshot: null,
    confirmedAt: 0,
    events: [],
    store: 0,
    warehouse: 0,
    error: "",
  });
  useOps.setState({ pickup: null, courierAt: "" });
  mock?.adoptDemo({ demoAt: 0, demoStep: -1 });
}
export async function refreshLive() {
  if (WORLD_SOURCE !== "LIVE" || fetching || Date.now() - lastFetch < 5000) return;
  fetching = true;
  lastFetch = Date.now();
  const requestGeneration = generation;
  try {
    const { getWorldState } = await import("@/services/tokoCungApi/world-state.functions");
    const result = await getWorldState();
    if (requestGeneration !== generation) return;
    if (!result || !receiveWorldSnapshot(result))
      useReactiveWorld.setState({
        error: result ? "Invalid/stale world snapshot" : "LIVE adapter belum dikonfigurasi",
      });
  } catch {
    if (requestGeneration === generation)
      useReactiveWorld.setState({
        error: "World source unavailable; retaining last valid snapshot",
      });
  } finally {
    fetching = false;
  }
}
export function handleWorldSnapshot(value: unknown) {
  if (WORLD_SOURCE !== "MOCK" || !import.meta.env.DEV) return;
  const v = value as {
    host?: string;
    epoch?: string;
    sequence?: number;
    snapshot?: unknown;
    demo?: unknown;
  } | null;
  if (
    !v ||
    v.host !== trafficAuthority() ||
    v.host === playerId ||
    typeof v.epoch !== "string" ||
    v.epoch.length > 100 ||
    !Number.isSafeInteger(v.sequence) ||
    v.sequence! < 1 ||
    retired.has(v.epoch)
  )
    return;
  if (accepted?.epoch === v.epoch && v.sequence! <= accepted.sequence) return;
  if (!receiveWorldSnapshot(v.snapshot)) return;
  if (accepted && accepted.epoch !== v.epoch) retired.add(accepted.epoch);
  accepted = { epoch: v.epoch, sequence: v.sequence! };
  mock?.adoptDemo(v.demo);
}
export function publishWorld(force = false) {
  if (WORLD_SOURCE !== "MOCK" || !import.meta.env.DEV || !mock || !isTrafficHost()) return;
  const now = Date.now();
  if (!force && now - lastSent < 1000) return;
  if (owner !== playerId) {
    owner = playerId;
    epoch = createId();
    sequence = 0;
  }
  lastSent = now;
  const snapshot = mock.tickMock(now);
  receiveWorldSnapshot(snapshot, now);
  void getActiveChannel()?.send({
    type: "broadcast",
    event: "world_event_snapshot",
    payload: { host: playerId, epoch, sequence: ++sequence, snapshot, demo: mock.demoState() },
  });
}
let previousTick = Date.now();
export function tickReactiveWorld(now = Date.now()) {
  if (document.hidden) {
    previousTick = now;
    return;
  }
  const host = isTrafficHost();
  if (!host) owner = null;
  if (useReactiveWorld.getState().host !== host) useReactiveWorld.setState({ host });
  publishWorld();
  if (WORLD_SOURCE === "LIVE" && now - lastFetch >= CONFIG.pollMs) void refreshLive();
  advanceWorld(now, Math.min(1000, now - previousTick));
  previousTick = now;
  if (host) {
    const ops = useOps.getState();
    const event = useReactiveWorld.getState().events.find((e) => e.type === "COURIER_PICKUP");
    const next = stepPickup(
      ops.pickup,
      event,
      ops.truck,
      ops.packingBusy || ops.pendingOrders > 0,
      useGame.getState().activeNpc === "npc-courier" && useGame.getState().overlay === "dialogue"
        ? ""
        : ops.courierAt,
      now,
    );
    if (next.run !== ops.pickup)
      useOps.setState({
        pickup: next.run,
        courierAt: "",
        ...(next.truck ? { truck: next.truck } : {}),
      });
  }
}
export function startReactiveWorld() {
  let alive = true;
  if (import.meta.env.DEV && WORLD_SOURCE === "MOCK")
    void import("./mock").then((m) => {
      if (alive) mock = m;
    });
  const timer = window.setInterval(tickReactiveWorld, 200);
  const unsub = useNet.subscribe((s, old) => {
    if (s.connected && !old.connected) {
      lastFetch = 0;
      void refreshLive();
    }
  });
  const visible = () => {
    if (!document.hidden) {
      previousTick = Date.now();
      lastFetch = 0;
      void refreshLive();
    }
  };
  document.addEventListener("visibilitychange", visible);
  tickReactiveWorld();
  return () => {
    alive = false;
    clearInterval(timer);
    unsub();
    document.removeEventListener("visibilitychange", visible);
  };
}
/** Read-only diagnostics, also useful to isolated browser QA. */
export function worldDiagnostics() {
  const s = useReactiveWorld.getState();
  return {
    ...s,
    room: roomKey,
    authority: trafficAuthority(),
    valid: !s.snapshot || !!parseSnapshot(s.snapshot),
    pickup: useOps.getState().pickup,
  };
}
