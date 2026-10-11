import { normalizeAvatar } from "@/identity/avatar";
import { worldRequest } from "@/services/world/client";
import type { PlayerProfile } from "@/identity/profile-store";
import { useNet } from "./net-store";
const pending = new Map<string, Promise<void>>();
/** Resolve identity from Laravel's connection lease, never a peer-supplied account ID. */
export function refreshRemoteProfile(connection: string) {
  const task = async () => {
    const room = useNet.getState().room;
    try {
      const profile = await worldRequest<PlayerProfile>("connection-profile", {
        id: connection,
        channel: room,
      });
      if (room !== useNet.getState().room) return;
      useNet.setState((s) => ({
        roster: s.roster.map((p) =>
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
      }));
    } catch {
      /* An expired/unverified connection never grants roles or account data. */
    }
  };
  const result = (pending.get(connection) ?? Promise.resolve()).then(task, task);
  pending.set(connection, result);
  void result.finally(() => {
    if (pending.get(connection) === result) pending.delete(connection);
  });
  return result;
}
