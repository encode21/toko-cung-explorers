/** "New map" announcement: shown once per user (banner slide + minimap badge until the map is opened). */
export const MAP_ANNOUNCEMENT = "map-mountain";
// Falls back to memory when storage is blocked, so the badge still clears for this page.
const seen = new Set<string>();
const key = (uid: string) => `tc:seen:${uid}:${MAP_ANNOUNCEMENT}`;

export function mapAnnouncementSeen(uid: string | null | undefined) {
  if (!uid) return true;
  if (seen.has(uid)) return true;
  try {
    return localStorage.getItem(key(uid)) === "1";
  } catch {
    return false;
  }
}

export function markMapAnnouncementSeen(uid: string | null | undefined) {
  if (!uid) return;
  seen.add(uid);
  try {
    localStorage.setItem(key(uid), "1");
  } catch {
    // Private mode / blocked storage: the in-memory set covers this page.
  }
}
