export const FISHING_SPOT: [number, number, number] = [35, 0.2, -40];
export const FISHING_RADIUS = 2.4;
export const FISHING_DESTINATION = {
  id: "venue-fishing",
  label: "Fishing Spot",
  position: FISHING_SPOT,
  detail: "Danau di belakang obby · ikuti jalur biru dari Plaza",
} as const;
export type FishTier = "Basic" | "Uncommon" | "Rare" | "Epic" | "Legendary";
export const TIER_COLORS: Record<FishTier, string> = {
  Basic: "#667a6d",
  Uncommon: "#378764",
  Rare: "#2483b0",
  Epic: "#9162b8",
  Legendary: "#b77c19",
};
export interface FishingRod {
  id: string;
  name: string;
  detail: string;
  window: number;
}
export interface Fish {
  id: string;
  name: string;
  tier: FishTier;
  minCm: number;
  maxCm: number;
}
export interface FishCatch {
  fishId: string;
  tier: FishTier;
  sizeCm: number;
}
export interface FishingCast {
  id: string;
  rodId: string;
  status: "waiting" | "caught" | "missed" | "cancelled";
  biteAt: number;
  expiresAt: number;
}
export interface FishingSnapshot {
  storage: "account";
  serverNow: number;
  rods: FishingRod[];
  ownedRods: string[];
  fish: Fish[];
  tiers: Record<FishTier, number>;
  collection: { fishId: string; tier: FishTier; count: number; bestCm: number }[];
  cast: FishingCast | null;
  catch: FishCatch | null;
}
export function atFishingSpot(p: readonly number[]) {
  return (
    Math.hypot(p[0]! - FISHING_SPOT[0], p[2]! - FISHING_SPOT[2]) <= FISHING_RADIUS &&
    Math.abs(p[1]! - 1.03) < 1.1
  );
}
export function fishingPhase(cast: FishingCast | null, now: number) {
  if (!cast) return "ready";
  if (cast.status !== "waiting") return cast.status;
  return now > cast.expiresAt ? "missed" : now >= cast.biteAt ? "bite" : "waiting";
}

/** Approach from Plaza via its west sidewalk, then turn behind the obby. */
export function fishingApproach(p: readonly number[]): [number, number, number] {
  if (p[2]! > -32) return p[0]! > 27.1 ? [26.2, 0, Math.max(-11.5, p[2]!)] : [26.2, 0, -34];
  if (p[0]! < 34) return [35, 0, -34];
  return FISHING_SPOT;
}
