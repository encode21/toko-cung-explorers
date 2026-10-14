export type SpawnPoint = { x: number; y: number; z: number };
export type SpawnPeer = SpawnPoint & { id: string };
export const SPAWN_SPACING = 1.1;

/** Stable preference per connection; occupancy remains authoritative for placement. */
export function spawnPreference(id: string, count: number) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % count;
}

export function chooseSpawn(
  id: string,
  candidates: SpawnPoint[],
  peers: SpawnPeer[],
  blocked: (point: SpawnPoint) => boolean = () => false,
): SpawnPoint | undefined {
  const start = spawnPreference(id, candidates.length);
  for (let i = 0; i < candidates.length; i++) {
    const point = candidates[(start + i) % candidates.length]!;
    if (
      peers.some(
        (peer) =>
          peer.id !== id &&
          Math.abs(peer.y - point.y) < 1.5 &&
          Math.hypot(peer.x - point.x, peer.z - point.z) < SPAWN_SPACING,
      ) ||
      blocked(point)
    )
      continue;
    return point;
  }
  return undefined;
}

/** Only one participant yields when simultaneous arrivals discover the same slot. */
export function shouldYieldSpawn(id: string, point: SpawnPoint, peers: SpawnPeer[]) {
  return peers.some(
    (peer) =>
      peer.id < id &&
      Math.abs(peer.y - point.y) < 1.5 &&
      Math.hypot(peer.x - point.x, peer.z - point.z) < SPAWN_SPACING,
  );
}

/** Hysteresis keeps an overlapping remote capsule passable until fully separated. */
export function overlapEscape(wasEscaping: boolean, distance: number, height: number) {
  return Math.abs(height) < 1.7 && distance < (wasEscaping ? 1 : 0.68);
}
