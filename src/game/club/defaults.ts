import type { WorldTarget } from "@/game/editor/store";

/** Stable V1 club entities — same IDs/positions as the Laravel world_clubs seed. */
export const DEFAULT_CLUB_TARGETS: WorldTarget[] = (
  [
    ["club_entrance", "CLUB_ENTRANCE", "Cung Underground · Masuk", 10.4, 0, 3.8, 3],
    ["club_exit", "CLUB_ENTRANCE", "Keluar ke kota", 0, -14, 9, 3],
    ["club_booth", "DJ_BOOTH", "DJ Booth", 0, -14, -7, 3],
    ["club_dance", "DANCE_ZONE", "Dance Floor", 0, -14, 0, 5],
    // Wall above the booth (y higher than floor −14) so the screen does not cover DJ Console.
    ["club_screen", "MUSIC_SCREEN", "Now Playing", 0, -11.35, -8.85, 3],
    ["club_spawn", "CLUB_SPAWN", "Club Spawn", 0, -14, 6, 3],
    ["club_lights", "LIGHT_CONTROLLER", "Club Lights", 0, -9, 0, 3],
  ] as const
).map(([id, type, name, x, y, z, radius]) => ({
  id,
  name,
  type,
  scene: "toko-cung-world",
  position: { x, y, z },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  radius,
  interactionType: "INTERACT",
  tags: id === "club_exit" ? ["club-exit"] : ["club"],
  active: true,
}));

/** Fill missing club IDs so the outdoor entrance stays visible before DB seed/migration. */
export function ensureClubTargets(targets: WorldTarget[]): WorldTarget[] {
  const ids = new Set(targets.map((t) => t.id));
  const missing = DEFAULT_CLUB_TARGETS.filter((t) => !ids.has(t.id));
  let next = missing.length ? [...targets, ...missing] : targets;
  // Migrate older screen seed that sat too low and visually covered the DJ booth.
  next = next.map((t) => {
    if (t.id !== "club_screen") return t;
    const legacy = t.position.y === -10 && Math.abs(t.position.z - -9) < 0.05;
    if (!legacy) return t;
    const fresh = DEFAULT_CLUB_TARGETS.find((d) => d.id === "club_screen")!;
    return { ...t, position: { ...fresh.position } };
  });
  return next;
}
