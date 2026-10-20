export type CarryPose = { x: number; y: number; z: number; ry: number };
type Sample = { pose: CarryPose; frame: number };
const poses = new Map<string, Sample>();

/** One interpolation sample per render frame, shared by carrier and local passenger. */
export function remoteRenderPose(id: string, target: CarryPose, frame: number, delta: number) {
  let sample = poses.get(id);
  if (!sample || frame < sample.frame || frame - sample.frame > 1) {
    sample = { pose: { ...target }, frame };
    poses.set(id, sample);
    return sample.pose;
  }
  if (sample.frame === frame) return sample.pose;
  sample.frame = frame;
  const p = sample.pose;
  const alpha =
    Math.hypot(target.x - p.x, target.y - p.y, target.z - p.z) > 6
      ? 1
      : 1 - Math.exp(-12 * Math.min(delta, 0.05));
  p.x += (target.x - p.x) * alpha;
  p.y += (target.y - p.y) * alpha;
  p.z += (target.z - p.z) * alpha;
  p.ry += Math.atan2(Math.sin(target.ry - p.ry), Math.cos(target.ry - p.ry)) * alpha;
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
