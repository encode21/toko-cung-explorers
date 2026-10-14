export const GUIDANCE_TRAIL = {
  count: 18,
  spacing: 1.35,
  start: 0.75,
  speed: 1.4,
  maxLength: 24,
  targetGap: 0.6,
} as const;

/** Absolute time keeps the flowing markers equally fast at every frame rate. */
export function guidanceTrailDistance(index: number, elapsed: number, targetDistance = Infinity) {
  const end = targetDistance - GUIDANCE_TRAIL.targetGap;
  // A short final segment cannot fit a flowing pair. Keep one steady arrow so
  // the entire direction cue does not blink out between animation cycles.
  if (end < GUIDANCE_TRAIL.start + GUIDANCE_TRAIL.spacing) {
    return index === 0 ? (GUIDANCE_TRAIL.start + end) / 2 : GUIDANCE_TRAIL.maxLength;
  }
  const phase = (Math.max(0, elapsed) * GUIDANCE_TRAIL.speed) % GUIDANCE_TRAIL.spacing;
  return GUIDANCE_TRAIL.start + index * GUIDANCE_TRAIL.spacing + phase;
}

function smoothstep(from: number, to: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** Fade new arrows in at the feet and old ones out before the destination / view limit. */
export function guidanceTrailOpacity(along: number, targetDistance: number) {
  if (!Number.isFinite(along) || !Number.isFinite(targetDistance)) return 0;
  const end = Math.min(GUIDANCE_TRAIL.maxLength, targetDistance - GUIDANCE_TRAIL.targetGap);
  if (end <= GUIDANCE_TRAIL.start || along <= GUIDANCE_TRAIL.start || along >= end) return 0;
  return (
    smoothstep(GUIDANCE_TRAIL.start, GUIDANCE_TRAIL.start + 0.45, along) *
    (1 - smoothstep(Math.max(GUIDANCE_TRAIL.start, end - 1.6), end, along))
  );
}
