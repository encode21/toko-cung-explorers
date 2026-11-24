// Usaha lanjutan (Warteg, Kos-kosan) — types mirror POST /api/world/usaha (see docs/warteg-kos.md).
import { BUILDING_LOTS } from "../world/outdoor-layout";
import { WARUNG_ORIGIN, WARUNG_SLOT_SPACING, warungSlotAt } from "../warung/model";

export type UsahaKind = "warteg" | "kos";
/** Warteg waits for the next update (server `world-usaha.warteg_enabled`): no prompt, map pin or purchase. */
export const WARTEG_OPEN = false;
export const usahaOpen = (kind: UsahaKind) => kind !== "warteg" || WARTEG_OPEN;

export interface WartegBahan {
  id: string;
  name: string;
  cost: number;
  color: string;
}
export interface WartegResep {
  id: string;
  name: string;
  bahan: Record<string, number>;
  porsi: number;
  market: number;
  weight: number;
  color: string;
}
export interface KosQuality {
  name: string;
  cost: number;
  market_rent: number;
}
export interface UsahaSnapshot {
  kas: number | null;
  catalog: {
    wartegPrice: number;
    kosPrice: number;
    bahan: WartegBahan[];
    resep: WartegResep[];
    dailyPortionCap: number;
    maxBahan: number;
    kosQuality: Record<string, KosQuality>;
    roomCost: number;
    maxRooms: number;
  };
  warteg: {
    // PHP sends [] when empty, an object otherwise.
    bahan: Record<string, number> | [];
    menu: { recipeId: string; portions: number; price: number }[];
    cookedToday: number;
  } | null;
  kos: {
    rooms: number;
    quality: number;
    qualityName: string;
    rent: number;
    marketRent: number;
    tenants: number;
    reputation: number;
    event: { kind: "telat" | "keluhan"; npc: string; amount: number } | null;
  } | null;
  settled: {
    warteg: { minutes: number; diners: number; revenue: number; wasted: number } | null;
    kos: { days: number; counted: number; income: number; movedIn: number; left: number } | null;
  } | null;
}

/** City ruko lots used as entrances (warteg = "Warung Nusantara", kos = "Toko Sepatu" row). */
export const USAHA_LOTS: Record<UsahaKind, (typeof BUILDING_LOTS)[number]> = {
  warteg: BUILDING_LOTS.find((l) => l.id === "infill-south-1")!,
  kos: BUILDING_LOTS.find((l) => l.id === "infill-south-3")!,
};

// Rooms sit inside the warung slot grid (x offset 22, last two slots) so Player/RemotePlayers
// already treat them as off-grid rooms (exact teleport, no walkway snap).
const ROOM_X = WARUNG_ORIGIN[0] + 22;
const ROOM_SLOT: Record<UsahaKind, number> = { warteg: 30, kos: 31 };
export function usahaOrigin(kind: UsahaKind): [number, number, number] {
  return [ROOM_X, WARUNG_ORIGIN[1], WARUNG_ORIGIN[2] + ROOM_SLOT[kind] * WARUNG_SLOT_SPACING];
}
/** True inside a usaha room; such rooms are private, remote players are hidden there. */
export function isUsahaRoom(x: number, z: number) {
  const slot = warungSlotAt(x, z);
  return (slot === ROOM_SLOT.warteg || slot === ROOM_SLOT.kos) && Math.abs(x - ROOM_X) <= 8;
}

export function bahanOf(snap: UsahaSnapshot, id: string) {
  const b = snap.warteg?.bahan;
  return b && !Array.isArray(b) ? (b[id] ?? 0) : 0;
}
