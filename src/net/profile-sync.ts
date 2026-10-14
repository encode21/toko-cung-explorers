import { normalizeAvatar } from "@/identity/avatar";
import { worldRequest } from "@/services/world/client";
import type { PlayerProfile } from "@/identity/profile-store";
import { useNet } from "./net-store";
const pending = new Map<string, { promise: Promise<void>; dirty: boolean }>();
/** Coalesce a burst into one in-flight read plus one latest read, never an unbounded promise queue. */
export function refreshRemoteProfile(connection: string) {
  const existing = pending.get(connection);
  if (existing) {
    existing.dirty = true;
    return existing.promise;
  }
  const room = useNet.getState().room;
  const entry = { promise: Promise.resolve(), dirty: false };
  const task = async () => {
    do {
      entry.dirty = false;
      if (room !== useNet.getState().room) return;
      try {
        const profile = await worldRequest<PlayerProfile>("connection-profile", {
          id: connection,
          channel: room,
        });
        const state = useNet.getState();
        if (room !== state.room || !state.roster.some((p) => p.id === connection)) return;
        useNet.setState({
          roster: state.roster.map((p) =>
            p.id !== connection
              ? p
              : {
                  ...p,
                  userId: profile.id,
                  name: profile.displayName,
                  role: profile.role,
                  avatar: normalizeAvatar(profile.avatar),
                  character: profile.equippedCharacter,
                  profileRevision: profile.updatedAt,
                  level: profile.level ?? 1,
                  title: profile.title ?? "Pendatang",
                },
          ),
        });
      } catch {
        // Failed reads don't grant roles, and a retry burst must not hammer an unavailable server.
        return;
      }
    } while (entry.dirty);
  };
  pending.set(connection, entry);
  entry.promise = task().finally(() => {
    if (pending.get(connection) === entry) pending.delete(connection);
  });
  return entry.promise;
}
