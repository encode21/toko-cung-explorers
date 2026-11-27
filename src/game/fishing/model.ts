import { beachApproach } from "../swimming/model.ts";
export const FISHING_SPOT: [number, number, number] = [-78, 0.2, -66];
export const FISHING_RADIUS = 2.4;
export const FISHING_DESTINATION = {
  id: "venue-fishing",
  label: "Fishing Spot",
  position: FISHING_SPOT,
  detail: "Dermaga laut di belakang Halte Gerbang Kampung",
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
/** Second spot registered by the gang scene when that gang has an empang; null elsewhere. */
let extraSpot: [number, number, number] | null = null;
export const setFishingExtraSpot = (p: [number, number, number] | null) => void (extraSpot = p);
export const fishingExtraSpot = () => extraSpot;
export function atFishingSpot(p: readonly number[]) {
  return [FISHING_SPOT, extraSpot].some(
    (s) =>
      s && Math.hypot(p[0]! - s[0], p[2]! - s[2]) <= FISHING_RADIUS && Math.abs(p[1]! - 1.03) < 1.1,
  );
}
export function fishingPhase(cast: FishingCast | null, now: number) {
  if (!cast) return "ready";
  if (cast.status !== "waiting") return cast.status;
  return now > cast.expiresAt ? "missed" : now >= cast.biteAt ? "bite" : "waiting";
}

/** Reach the gate sidewalk, cross the apron, then follow the pier's connected decks. */
export function fishingApproach(p: readonly number[]): [number, number, number] {
  if (p[0]! > -34) {
    if (p[0]! > 27.1 && p[2]! < -32) return [26.2, 0, -34];
    if (p[0]! > -26) return beachApproach(p);
    return [-35.4, 0, p[2]!];
  }
  if (p[0]! < -54 && p[2]! > -38) return [-35.4, 0, 10.8];
  if (p[0]! > -52.8) return Math.abs(p[2]! + 43) > 0.6 ? [p[0]!, 0, -43] : [-53.2, 0, -43];
  if (p[0]! > -64) return Math.abs(p[2]! + 47) > 1.2 ? [p[0]!, 0, -47] : [-66, 0.2, -47];
  if (p[0]! > -75.6 && p[2]! < -54) return [-66, 0.2, -47];
  if (p[2]! > -54 && Math.abs(p[0]! + 78) > 0.6) return [-78, 0.2, -47];
  return FISHING_SPOT;
}

/** Cosmetic sequence starts only after the authoritative catch receipt. */
export const CATCH_REVEAL_MS = 2400;
export function catchRevealing(started: number | null, now: number) {
  return started !== null && now - started < CATCH_REVEAL_MS;
}
