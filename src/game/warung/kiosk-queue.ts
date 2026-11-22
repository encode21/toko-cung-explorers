import { create } from "zustand";
import type { RosterEntry } from "@/net/net-store";

/**
 * Kiosk kulakan queue, shared through channel presence (`kioskSince` in each player's presence):
 * the earliest `kioskSince` in the channel uses the kiosk, everyone else waits in line.
 * shortcut: entries older than KIOSK_STALE_MS are ignored so an idle player can't hog the kiosk;
 * move to a server lock if players start gaming it.
 */
export const KIOSK_STALE_MS = 3 * 60_000;

export const useKioskQueue = create<{ since: number | null }>(() => ({ since: null }));

export function joinKioskQueue() {
  if (useKioskQueue.getState().since === null) useKioskQueue.setState({ since: Date.now() });
}

export function leaveKioskQueue() {
  if (useKioskQueue.getState().since !== null) useKioskQueue.setState({ since: null });
}

/** Players in line, front first; my own entry uses the local timestamp so it shows instantly. */
export function kioskLine(
  roster: RosterEntry[],
  myId: string,
  mySince: number | null,
  now = Date.now(),
) {
  const line = roster
    .filter((p) => p.id !== myId && p.kioskSince !== undefined)
    .map((p) => ({ id: p.id, name: p.name, since: p.kioskSince! }));
  if (mySince !== null) line.push({ id: myId, name: "Kamu", since: mySince });
  return line
    .filter((p) => now - p.since < KIOSK_STALE_MS || p.id === myId)
    .sort((a, b) => a.since - b.since || a.id.localeCompare(b.id));
}
