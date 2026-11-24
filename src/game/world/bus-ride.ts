import { create } from "zustand";

export type RidePoint = { x: number; z: number };

type Job = {
  path: RidePoint[];
  length: number;
  seconds: number;
  arrive: () => Promise<boolean>;
  resolve: (ok: boolean) => void;
};

/** Live pose for the chase camera. Not in React state — it updates every frame. */
export const busPose = { x: 0, z: 0, yaw: 0 };

export const useBusRide = create<{ riding: boolean; title: string; fade: number }>(() => ({
  riding: false,
  title: "",
  fade: 0,
}));

let job: Job | null = null;
let distance = 0;
let skip = false;
let finishing = false;

function pathLength(path: readonly RidePoint[]) {
  let n = 0;
  for (let i = 1; i < path.length; i++)
    n += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.z - path[i - 1]!.z);
  return n;
}

/** Yaw matches vehicle travel: forward is (sin yaw, cos yaw). */
export function sampleRide(path: readonly RidePoint[], travelled: number) {
  let left = Math.max(0, travelled);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!,
      b = path[i]!,
      len = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= len || i === path.length - 1) {
      const t = len < 0.0001 ? 1 : Math.min(1, left / len);
      const dx = b.x - a.x,
        dz = b.z - a.z;
      return {
        x: a.x + dx * t,
        z: a.z + dz * t,
        yaw: Math.atan2(dx, dz),
      };
    }
    left -= len;
  }
  const last = path[path.length - 1]!;
  return { x: last.x, z: last.z, yaw: 0 };
}

function fadeOut() {
  const start = performance.now();
  const step = (now: number) => {
    const t = (now - start) / 500;
    if (t >= 1) useBusRide.setState({ fade: 0 });
    else {
      useBusRide.setState({ fade: 1 - t });
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

/** Advance the ride. Called from the bus mesh each frame. */
export function tickBusRide(dt: number) {
  if (!job || finishing) return;
  const speed = job.length / job.seconds;
  distance += (skip ? speed * 6 : speed) * Math.min(dt, 0.05);
  const pose = sampleRide(job.path, Math.min(distance, job.length));
  busPose.x = pose.x;
  busPose.z = pose.z;
  busPose.yaw = pose.yaw;
  const fadeStart = job.length - speed * 0.7;
  const fade = distance < fadeStart ? 0 : Math.min(1, (distance - fadeStart) / (speed * 0.7));
  if (Math.abs(useBusRide.getState().fade - fade) > 0.04) useBusRide.setState({ fade });
  if (distance < job.length) return;
  finishing = true;
  const current = job;
  job = null;
  useBusRide.setState({ fade: 1 });
  void current.arrive().then(
    (ok) => {
      finishing = false;
      skip = false;
      distance = 0;
      useBusRide.setState({ riding: false, fade: 1 });
      fadeOut();
      current.resolve(ok);
    },
    () => {
      finishing = false;
      skip = false;
      distance = 0;
      useBusRide.setState({ riding: false, fade: 1 });
      fadeOut();
      current.resolve(false);
    },
  );
}

/**
 * GTA-style ride: the bus drives `path`, the chase camera follows, then `arrive` teleports.
 * Resolves after the drop-off. A second call while one is playing is ignored.
 */
export function startBusRide(opts: {
  title: string;
  path: RidePoint[];
  arrive: () => Promise<boolean>;
}) {
  if (job || finishing || opts.path.length < 2) return Promise.resolve(false);
  const length = pathLength(opts.path);
  if (length < 1) return Promise.resolve(false);
  const seconds = Math.min(8, Math.max(5.5, length / 14));
  const pose = sampleRide(opts.path, 0);
  busPose.x = pose.x;
  busPose.z = pose.z;
  busPose.yaw = pose.yaw;
  distance = 0;
  skip = false;
  useBusRide.setState({ riding: true, title: opts.title, fade: 0 });
  return new Promise<boolean>((resolve) => {
    job = { path: opts.path, length, seconds, arrive: opts.arrive, resolve };
  });
}

export function skipBusRide() {
  skip = true;
}
