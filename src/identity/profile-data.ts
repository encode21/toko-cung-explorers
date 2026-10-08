import { normalizeAvatar } from "./avatar";
import type { RoleId } from "./roles";
import type { Database } from "@/integrations/supabase/types";
export const PROFILE_COLUMNS =
  "id, display_name, username, role, bio, avatar, equipped_character, created_at, updated_at";
export function profileFromRow(row: Database["public"]["Tables"]["profiles"]["Row"]) {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username ?? "",
    role: row.role as RoleId,
    bio: row.bio,
    avatar: normalizeAvatar(row.avatar),
    equippedCharacter: row.equipped_character,
    joinedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
/** ISO timestamps retain sub-millisecond ordering after their equal millisecond prefix. */
export function newerRevision(next: string, current: string) {
  const a = Date.parse(next),
    b = Date.parse(current);
  if (!Number.isFinite(a)) return false;
  if (!Number.isFinite(b)) return true;
  if (a !== b) return a > b;
  return (
    (next.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0") >
    (current.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0")
  );
}
