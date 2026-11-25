import { create } from "zustand";
import { pathLength, sampleRide, advanceBus, angleDelta } from "./bus-motion";
import type { BusStop, RidePoint } from "./bus-routes";
export { sampleRide } from "./bus-motion";
export type { RidePoint } from "./bus-routes";
export type BusLeg = {
  compact?: boolean;
  path: RidePoint[];
  stop?: BusStop;
  transfer?: () => Promise<boolean>;
};
type Job = {
  legs: BusLeg[];
  index: number;
  length: number;
  arrive: () => Promise<boolean>;
  resolve: (ok: boolean) => void;
};
export const busPose = {
  x: 0,
  z: 0,
  yaw: 0,
  speed: 0,
  steer: 0,
  wheelAngle: 0,
  door: 0,
  stopElapsed: 0,
  serial: 0,
};
export const useBusRide = create<{
  active: boolean;
  riding: boolean;
  ready: boolean;
  compact: boolean;
  title: string;
  fade: number;
  phase: "driving" | "boarding" | "transfer";
  stop: BusStop | null;
  waiting: number;
  departureIn: number;
  boarded: number;
  queues: { stop: BusStop; count: number; boarded: boolean }[];
}>(() => ({
  active: false,
  riding: false,
  ready: false,
  compact: false,
  title: "",
  fade: 0,
  phase: "driving",
  stop: null,
  waiting: 0,
  departureIn: 0,
  boarded: 0,
  queues: [],
}));
let job: Job | null = null;
let distance = 0,
  dwell = 0,
  transition = 0,
  fadeOut = 0;
let transferPending = false,
  skip = false;

function board(stop: BusStop) {
  const queue = useBusRide.getState().queues.find((q) => q.stop.id === stop.id);
  const waiting = queue && !queue.boarded ? queue.count : 0;
  busPose.stopElapsed = 0;
  // Allow each NPC to finish walking aboard, then close the doors for 0.6 seconds.
  dwell = 1.2 + waiting * 1.2;
  useBusRide.setState({ phase: "boarding", stop, waiting, departureIn: Math.ceil(dwell) });
}
function setLeg() {
  if (!job) return;
  const leg = job.legs[job.index]!;
  job.length = pathLength(leg.path);
  useBusRide.setState({ compact: !!leg.compact });
  distance = 0;
  const start = sampleRide(leg.path, 0);
  if (Math.hypot(start.x - busPose.x, start.z - busPose.z) > 20)
    useBusRide.setState({ ready: false });
  Object.assign(busPose, start, { speed: 0, steer: 0 });
  busPose.serial++;
}
function finish(ok: boolean) {
  const current = job;
  job = null;
  transferPending = false;
  busPose.speed = busPose.door = 0;
  useBusRide.setState({
    active: false,
    riding: false,
    ready: false,
    stop: null,
    departureIn: 0,
    fade: 1,
  });
  fadeOut = 0.5;
  current?.resolve(ok);
}
async function advance() {
  if (!job || transferPending) return;
  transferPending = true;
  const current = job,
    leg = current.legs[current.index]!;
  try {
    if (!skip && leg.transfer && !(await leg.transfer())) {
      finish(false);
      return;
    }
    if (skip || current.index === current.legs.length - 1) {
      finish(await current.arrive());
      return;
    }
    current.index++;
    setLeg();
    useBusRide.setState({ phase: "driving", stop: null });
    fadeOut = 0.45;
  } catch {
    finish(false);
  } finally {
    transferPending = false;
  }
}
/** Acceleration, braking, dwell and scene fades share one clock; no wall-clock travel timers. */
export function tickBusRide(
  delta: number,
  blocked?: (pose: { x: number; z: number; yaw: number }) => boolean,
) {
  const dt = Math.min(delta, 0.05);
  if (fadeOut > 0) {
    fadeOut = Math.max(0, fadeOut - dt);
    useBusRide.setState({ fade: fadeOut / 0.5 });
  }
  if (!job || transferPending) return;
  const state = useBusRide.getState();
  if (skip && state.phase !== "transfer") {
    transition = 0;
    useBusRide.setState({ phase: "transfer" });
    return;
  }
  if (state.phase === "transfer") {
    transition += dt;
    useBusRide.setState({ fade: Math.min(1, transition / 0.4) });
    if (transition >= 0.4) void advance();
    return;
  }
  // A newly summoned bus must not materialize inside traffic already occupying the stop.
  if (!state.ready) {
    if (blocked?.(busPose)) return;
    useBusRide.setState({ ready: true });
  }
  if (state.phase === "boarding") {
    busPose.stopElapsed += dt;
    const departureIn = Math.max(0, Math.ceil(dwell - busPose.stopElapsed));
    if (departureIn !== state.departureIn) useBusRide.setState({ departureIn });
    busPose.door = Math.min(
      1,
      busPose.stopElapsed / 0.55,
      Math.max(0, (dwell - busPose.stopElapsed) / 0.6),
    );
    if (busPose.stopElapsed < dwell) return;
    useBusRide.setState({
      queues: state.queues.map((q) => (q.stop.id === state.stop?.id ? { ...q, boarded: true } : q)),
      boarded: state.boarded + state.waiting,
      stop: null,
      waiting: 0,
      phase: "driving",
    });
    busPose.door = 0;
    // Initial boarding happens before the first metre; later boarding completes a leg.
    if (distance >= job.length - 0.03) {
      const leg = job.legs[job.index]!;
      if (leg.transfer || job.index === job.legs.length - 1) {
        transition = 0;
        useBusRide.setState({ phase: "transfer" });
      } else {
        job.index++;
        setLeg();
      }
    }
    return;
  }
  const path = job.legs[job.index]!.path;
  const next = advanceBus(path, distance, job.length, busPose.speed, dt, blocked);
  distance = next.distance;
  busPose.speed = next.speed;
  const { step, pose } = next;
  busPose.steer = Math.max(
    -0.5,
    Math.min(0.5, (angleDelta(busPose.yaw, pose.yaw) * 6) / Math.max(step, 0.05)),
  );
  Object.assign(busPose, pose);
  busPose.wheelAngle += step / 0.55;
  if (job.length - distance <= 0.025) {
    distance = job.length;
    busPose.speed = busPose.steer = 0;
    const stop = job.legs[job.index]!.stop;
    if (stop) board(stop);
    else {
      transition = 0;
      useBusRide.setState({ phase: "transfer" });
    }
  }
}
export function startBusRide(opts: {
  title: string;
  from?: BusStop;
  legs: BusLeg[];
  arrive: () => Promise<boolean>;
}) {
  if (
    job ||
    opts.legs.length === 0 ||
    opts.legs.some((leg) => leg.path.length < 2 || pathLength(leg.path) < 1)
  )
    return Promise.resolve(false);
  skip = false;
  fadeOut = 0;
  const stops = [opts.from, ...opts.legs.map((leg) => leg.stop)].filter(
    (stop): stop is BusStop => !!stop,
  );
  const queues = [...new Map(stops.map((stop) => [stop.id, stop])).values()].map((stop) => ({
    stop,
    count: Math.floor(Math.random() * 4),
    boarded: false,
  }));
  useBusRide.setState({
    queues,
    active: true,
    riding: true,
    ready: false,
    title: opts.title,
    fade: 0,
    phase: "driving",
    stop: null,
    boarded: 0,
    waiting: 0,
    departureIn: 0,
  });
  return new Promise<boolean>((resolve) => {
    job = {
      legs: opts.legs,
      index: 0,
      length: 0,
      arrive: opts.arrive,
      resolve,
    };
    setLeg();
    if (opts.from) board(opts.from);
  });
}
export function skipBusRide() {
  skip = true;
}
export function cancelBusRide() {
  if (job) finish(false);
}
