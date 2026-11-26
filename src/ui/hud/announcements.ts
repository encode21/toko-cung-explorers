/** "New map" announcement: shown once per user (banner slide + minimap badge until the map is opened). */
export const MAP_ANNOUNCEMENT = "map-mountain";
export const BEGINNER_GUIDE_TOOLTIP = "beginner-guide-tooltip-v1";
// Falls back to memory when storage is blocked, so one-time hints still clear for this page.
const seen = new Set<string>();
const key = (uid: string, announcement: string) => `tc:seen:${uid}:${announcement}`;

function announcementSeen(uid: string, announcement: string) {
  const storageKey = key(uid, announcement);
  if (seen.has(storageKey)) return true;
  try {
    if (localStorage.getItem(storageKey) !== "1") return false;
    seen.add(storageKey);
    return true;
  } catch {
    return false;
  }
}

function markAnnouncementSeen(uid: string, announcement: string) {
  const storageKey = key(uid, announcement);
  seen.add(storageKey);
  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    // Private mode / blocked storage: the in-memory set covers this page.
  }
}

export function mapAnnouncementSeen(uid: string | null | undefined) {
  if (!uid) return true;
  return announcementSeen(uid, MAP_ANNOUNCEMENT);
}

export function markMapAnnouncementSeen(uid: string | null | undefined) {
  if (!uid) return;
  markAnnouncementSeen(uid, MAP_ANNOUNCEMENT);
}

/** Returns true only for the first presentation on this account and device. */
export function claimBeginnerGuideTooltip(uid: string | null | undefined) {
  if (!uid || announcementSeen(uid, BEGINNER_GUIDE_TOOLTIP)) return false;
  markAnnouncementSeen(uid, BEGINNER_GUIDE_TOOLTIP);
  return true;
}
