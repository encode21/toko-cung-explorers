export type CarryPose = { x: number; y: number; z: number; ry: number };
type Snap = CarryPose & { t: number };
type Sample = { pose: CarryPose; frame: number; buf: Snap[] };
const poses = new Map<string, Sample>();
/** Render this far behind the newest packet so there are two snapshots to blend (sender is 8Hz). */
const DELAY = 0.15;

const same = (a: CarryPose, b: CarryPose) =>
  a.x === b.x && a.y === b.y && a.z === b.z && a.ry === b.ry;
const lerpAngle = (a: number, b: number, k: number) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

/**
 * One sample per render frame, shared by carrier and local passenger. Packets are buffered and the
 * pose is interpolated between the two around `frame - DELAY`, like NPCs moving at a steady pace,
 * instead of chasing the latest packet (surge-then-stall). `frame` is clock time in seconds.
 */
export function remoteRenderPose(id: string, target: CarryPose, frame: number, delta: number) {
  let sample = poses.get(id);
  if (!sample || frame < sample.frame || frame - sample.frame > 1) {
    sample = { pose: { ...target }, frame, buf: [{ ...target, t: frame }] };
    poses.set(id, sample);
    return sample.pose;
  }
  if (sample.frame === frame) return sample.pose;
  sample.frame = frame;
  const buf = sample.buf,
    last = buf[buf.length - 1]!;
  if (!same(last, target)) {
    // After standing still, restart the segment one tick ago so the first step doesn't jump.
    if (frame - last.t > DELAY * 2) buf.push({ ...last, t: frame - 0.125 });
    buf.push({ ...target, t: frame });
    while (buf.length > 4) buf.shift();
  }
  const p = sample.pose,
    rt = frame - DELAY;
  let i = buf.length - 1;
  while (i > 0 && buf[i - 1]!.t > rt) i--;
  const a = buf[Math.max(0, i - 1)]!,
    b = buf[i]!;
  if (rt >= b.t || a === b) {
    // Packet late: ease onto the newest pose rather than extrapolating.
    const k = 1 - Math.exp(-12 * Math.min(delta, 0.05));
    p.x += (b.x - p.x) * k;
    p.y += (b.y - p.y) * k;
    p.z += (b.z - p.z) * k;
    p.ry = lerpAngle(p.ry, b.ry, k);
  } else if (Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 6) {
    Object.assign(p, { x: b.x, y: b.y, z: b.z, ry: b.ry }); // teleport
  } else {
    const k = Math.max(0, (rt - a.t) / (b.t - a.t));
    p.x = a.x + (b.x - a.x) * k;
    p.y = a.y + (b.y - a.y) * k;
    p.z = a.z + (b.z - a.z) * k;
    p.ry = lerpAngle(a.ry, b.ry, k);
  }
  if (Math.hypot(target.x - p.x, target.z - p.z) > 6) Object.assign(p, target); // never trail far behind
  return p;
}
export function pruneRenderPoses(ids: Iterable<string>) {
  const alive = new Set(ids);
  for (const id of poses.keys()) if (!alive.has(id)) poses.delete(id);
}
export function createCarryBlend() {
  return { id: null as string | null, x: 0, y: 0, z: 0, ry: 0 };
}
/** Ease onto the back once; following thereafter has no extra lag relative to the carrier. */
export function blendCarryMount(
  blend: ReturnType<typeof createCarryBlend>,
  id: string,
  current: CarryPose,
  target: CarryPose,
  delta: number,
): CarryPose {
  if (blend.id !== id) {
    blend.id = id;
    blend.x = current.x - target.x;
    blend.y = current.y - target.y;
    blend.z = current.z - target.z;
    blend.ry = Math.atan2(Math.sin(current.ry - target.ry), Math.cos(current.ry - target.ry));
  }
  const decay = Math.exp(-14 * Math.min(delta, 0.05));
  blend.x *= decay;
  blend.y *= decay;
  blend.z *= decay;
  blend.ry *= decay;
  return {
    x: target.x + blend.x,
    y: target.y + blend.y,
    z: target.z + blend.z,
    ry: target.ry + blend.ry,
  };
}
