import { supabase } from "@/integrations/supabase/client";
import { PROFILE_COLUMNS, newerRevision, profileFromRow } from "@/identity/profile-data";
import { useNet } from "./net-store";
const pending = new Map<string, Promise<void>>();
/** Broadcast/presence only invalidate. Staff roles and collectibles are read from the database. */
export function refreshRemoteProfile(userId: string) {
  const task = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .single();
    if (error || !data) return;
    const profile = profileFromRow(data);
    useNet.setState((state) => ({
      roster: state.roster.map((p) => {
        if (
          p.userId !== userId ||
          (p.profileRevision &&
            !newerRevision(profile.updatedAt, p.profileRevision) &&
            profile.updatedAt !== p.profileRevision)
        )
          return p;
        return {
          ...p,
          name: profile.displayName,
          role: profile.role,
          avatar: profile.avatar,
          character: profile.equippedCharacter,
          profileRevision: profile.updatedAt,
        };
      }),
    }));
  };
  // Serialize invalidations, rather than dropping a save notification behind an older in-flight read.
  const result = (pending.get(userId) ?? Promise.resolve()).then(task, task);
  pending.set(userId, result);
  void result.finally(() => {
    if (pending.get(userId) === result) pending.delete(userId);
  });
  return result;
}
