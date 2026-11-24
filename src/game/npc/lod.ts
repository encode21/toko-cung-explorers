/** Pure near/far LOD selection for NPC avatars: hysteresis, cap, nearest-first. */
export const LOD_ENTER = 12;
export const LOD_LEAVE = 15;

export type LodTier = "LOW" | "MEDIUM" | "HIGH";
export const lodCap = (tier: LodTier) => (tier === "LOW" ? 4 : tier === "MEDIUM" ? 6 : 10);

export interface LodCandidate {
  id: string;
  x: number;
  z: number;
}

/** Ids that should use the rich rig now. Previous members stay until beyond `leave`; the cap keeps the nearest. */
export function selectNear(
  player: { x: number; z: number },
  candidates: readonly LodCandidate[],
  previous: ReadonlySet<string>,
  cap: number,
  enter = LOD_ENTER,
  leave = LOD_LEAVE,
): Set<string> {
  return new Set(
    candidates
      .map((c) => ({ id: c.id, d: Math.hypot(c.x - player.x, c.z - player.z) }))
      .filter((c) => c.d < (previous.has(c.id) ? leave : enter))
      .sort((a, b) => a.d - b.d)
      .slice(0, Math.max(0, cap))
      .map((c) => c.id),
  );
}
