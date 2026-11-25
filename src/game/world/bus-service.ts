import { create } from "zustand";
import { createId } from "@/lib/id";
import { worldRequest } from "@/services/world/client";
import { busPose, useBusRide } from "./bus-ride";
import { advanceBus, angleDelta, pathLength, sampleRide, type BusObstacle } from "./bus-motion";
import {
  BUS_STOPS,
  cityBusLegs,
  kampungBusStop,
  type BusStop,
  type BusStopId,
  type RidePoint,
} from "./bus-routes";
import { BUS_TIMETABLE, busWindow, type BusTimetable } from "./bus-timetable";

export type BusServiceScene = "city" | { origin: readonly number[]; end: number } | null;
export const useBusService = create(() => ({
  synced: false,
  now: 0,
  stop: null as BusStopId | null,
  departureAt: 0,
  arrivalAt: 0,
  boardingToken: "",
}));
let timetable: BusTimetable = BUS_TIMETABLE;
let clockOffset = 0,
  lastSync = -Infinity,
  nextSync = 0,
  pending: Promise<void> | null = null;
export const busNow = () => performance.now() + clockOffset;
export function syncBusService() {
  if (pending) return pending;
  const sent = performance.now();
  nextSync = sent + 30_000;
  pending = worldRequest<{ serverNow: number; timetable: BusTimetable }>("bus", { action: "read" })
    .then((r) => {
      clockOffset = r.serverNow + (performance.now() - sent) / 2 - performance.now();
      timetable = r.timetable;
      lastSync = performance.now();
      useBusService.setState({ synced: true, now: busNow() });
    })
    .catch(() => {
      useBusService.setState({ synced: false });
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
export const serviceWindow = (_stop: BusStop) => ({
  arrivalAt: busNow(),
  departureAt: busNow() + timetable.dwellMs,
});
export function busBoarding(stop: BusStopId) {
  const state = useBusService.getState(),
    now = busNow();
  const atStop = state.stop === stop && useBusRide.getState().ready;
  const window = atStop
    ? { arrivalAt: state.arrivalAt, departureAt: state.departureAt }
    : busWindow(stop, now, timetable);
  const canBoard =
    state.synced &&
    performance.now() - lastSync < 120_000 &&
    !useBusRide.getState().riding &&
    atStop &&
    !!state.boardingToken &&
    now < window.departureAt - 600;
  return {
    canBoard,
    atStop,
    ...window,
    boardingToken: state.boardingToken,
    now,
    synced: state.synced,
  };
}
let held = false;
export function holdBusBoarding(stop: BusStopId) {
  if (held || !busBoarding(stop).canBoard) return false;
  held = true;
  return true;
}
export function releaseBusBoarding() {
  held = false;
}

type Leg = { path: RidePoint[]; stop?: BusStop };
let sceneKey = "",
  legs: Leg[] = [],
  index = 0,
  distance = 0,
  length = 0;
let stopped: BusStop | null = null,
  window: { arrivalAt: number; departureAt: number } | null = null;
let resume: BusStop | null = null;
let arrivalId = "",
  arrivalPending = false,
  arrivalRetryAt = 0;
export function resumeBusService(stop: BusStop) {
  resume = stop;
  sceneKey = "";
}
function atStop(stop: BusStop, departure?: number) {
  stopped = stop;
  window = departure
    ? { arrivalAt: departure - timetable.dwellMs, departureAt: departure }
    : serviceWindow(stop);
  busPose.speed = busPose.steer = busPose.stopElapsed = busPose.door = 0;
  useBusRide.setState({
    phase: "boarding",
    stop,
    waiting: 2,
    queues: [{ stop, count: 2, boarded: false }],
  });
  arrivalId = createId();
  arrivalRetryAt = 0;
  useBusService.setState({ stop: stop.id, ...window, boardingToken: "" });
}
function setLeg() {
  distance = 0;
  length = pathLength(legs[index]!.path);
  stopped = null;
  window = null;
  useBusRide.setState({ phase: "driving", stop: null, queues: [] });
  arrivalId = "";
  useBusService.setState({ stop: null, departureAt: 0, arrivalAt: 0, boardingToken: "" });
}
function initialize(scene: Exclude<BusServiceScene, null>) {
  const now = busNow();
  if (scene === "city") {
    legs = cityBusLegs("kota", "keliling");
    const stops = [BUS_STOPS.kota, BUS_STOPS.gerbang, BUS_STOPS.pasar];
    const phase = now % timetable.cycleMs;
    index = stops.reduce((at, s, i) => (phase >= timetable.offsets[s.id] ? i : at), 0);
    if (resume && resume.id !== "kampung") index = stops.findIndex((s) => s.id === resume!.id);
    setLeg();
    const origin = stops[index]!;
    Object.assign(busPose, sampleRide(legs[index]!.path, 0), { speed: 0, door: 0 });
    const departure =
      Math.floor(now / timetable.cycleMs) * timetable.cycleMs +
      timetable.offsets[origin.id] +
      timetable.dwellMs;
    if (resume || now < departure) atStop(origin);
    else {
      // Only seed position on scene entry; ongoing movement always obeys collisions.
      for (let t = 0; t < (now - departure) / 1000 && distance < length - 0.025; t += 0.05)
        move(0.05);
      if (distance >= length - 0.025) {
        const stop = legs[index]!.stop!;
        index = (index + 1) % legs.length;
        setLeg();
        atStop(stop);
      }
    }
  } else {
    const stop = kampungBusStop(scene.origin);
    const entry = { x: stop.pose.x, z: scene.origin[2]! + scene.end + 145 };
    const exit = { x: stop.pose.x, z: scene.origin[2]! - 165 };
    legs = [{ path: [entry, stop.pose], stop }, { path: [stop.pose, exit] }];
    index = 0;
    setLeg();
    Object.assign(busPose, sampleRide(legs[0]!.path, 0), { speed: 0, door: 0 });
    const w = busWindow(stop.id, now, timetable);
    const sinceArrival = now - (w.arrivalAt > now ? w.arrivalAt - timetable.cycleMs : w.arrivalAt);
    if (resume || sinceArrival < timetable.dwellMs) {
      index = 1;
      setLeg();
      Object.assign(busPose, stop.pose, { yaw: stop.yaw });
      atStop(stop);
    }
  }
  resume = null;
  busPose.serial++;
  useBusRide.setState({ active: true, ready: false, compact: scene !== "city", boarded: 0 });
}
function move(dt: number, blocked?: BusObstacle) {
  const next = advanceBus(legs[index]!.path, distance, length, busPose.speed, dt, blocked);
  busPose.steer = Math.max(
    -0.5,
    Math.min(0.5, (angleDelta(busPose.yaw, next.pose.yaw) * 6) / Math.max(next.step, 0.05)),
  );
  distance = next.distance;
  Object.assign(busPose, next.pose, { speed: next.speed });
  busPose.wheelAngle += next.step / 0.55;
}
export function tickBusService(
  scene: BusServiceScene,
  delta: number,
  blocked: BusObstacle,
  player: readonly number[],
  visible: (point: RidePoint) => boolean = () => false,
) {
  if (useBusRide.getState().riding) {
    sceneKey = "";
    return;
  }
  if (!scene) {
    sceneKey = "";
    if (useBusRide.getState().active) useBusRide.setState({ active: false, ready: false });
    if (useBusService.getState().stop) useBusService.setState({ stop: null });
    return;
  }
  if (performance.now() >= nextSync && !pending) void syncBusService();
  if (!useBusService.getState().synced) return;
  const now = busNow();
  if (Math.abs(now - useBusService.getState().now) >= 250) useBusService.setState({ now });
  const key = scene === "city" ? "city" : `kampung:${scene.origin.join(":")}:${scene.end}`;
  if (key !== sceneKey) {
    sceneKey = key;
    initialize(scene);
    return;
  }
  if (!useBusRide.getState().ready) {
    if (blocked(busPose)) return;
    useBusRide.setState({ ready: true });
  }
  if (held) return;
  if (stopped && window) {
    if (!useBusService.getState().boardingToken) {
      if (!arrivalPending && performance.now() >= arrivalRetryAt) {
        const id = arrivalId;
        arrivalPending = true;
        void worldRequest<{ arrivalAt: number; departureAt: number; boardingToken: string }>(
          "bus",
          {
            action: "arrive",
            from: stopped.id,
            requestId: id,
          },
        )
          .then((r) => {
            if (arrivalId !== id || !stopped) return;
            window = { arrivalAt: r.arrivalAt, departureAt: r.departureAt };
            useBusService.setState({ ...r, stop: stopped.id });
          })
          .catch(() => {
            arrivalRetryAt = performance.now() + 3000;
          })
          .finally(() => {
            arrivalPending = false;
          });
      }
      busPose.door = Math.min(1, busPose.door + delta * 2);
      return;
    }
    busPose.stopElapsed = Math.max(0, (now - window.arrivalAt) / 1000);
    busPose.door = Math.min(
      1,
      busPose.stopElapsed / 0.55,
      Math.max(0, (window.departureAt - now) / 600),
    );
    if (now < window.departureAt) return;
    busPose.door = 0;
    setLeg();
  }
  move(Math.min(delta, 0.05), blocked);
  if (distance < length - 0.025) return;
  const stop = legs[index]!.stop;
  if (!stop && scene !== "city") {
    // The finite kampung road reconnects offscreen at the far bridge.
    const entry = legs[0]!.path[0]!;
    if (
      Math.hypot(player[0]! - busPose.x, player[2]! - busPose.z) < 130 ||
      Math.hypot(player[0]! - entry.x, player[2]! - entry.z) < 130 ||
      visible(busPose) ||
      visible(entry)
    )
      return;
    index = 0;
    setLeg();
    Object.assign(busPose, sampleRide(legs[0]!.path, 0), { speed: 0 });
    useBusRide.setState({ ready: false });
  } else {
    index = (index + 1) % legs.length;
    setLeg();
    if (stop) atStop(stop);
  }
}
