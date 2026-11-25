import type { ChannelLease } from "@/services/world/contracts";
import { useGame } from "@/state/game-store";
import { enterGang, isGangPosition } from "@/game/gang/store";
import { enterHome } from "@/game/home/store";
import { isHomeRoom } from "@/game/home/model";
import { isMountainPosition } from "@/game/mountain/model";
import { useDungeon } from "@/game/dungeon/store";
import { useProlog } from "@/game/prolog/store";
import { IN_ROOM_STEPS } from "@/game/prolog/pulang/steps";

let resumedFor: string | null = null;

/**
 * Masuk lagi: put the player back in the last scene/spot the server remembers (it already turned a long
 * absence or an unrebuildable scene into "home"). Once per account per page load; channel switches keep the
 * live position. City spots go through pendingTeleport, which snaps to the nearest walkable point.
 */
export async function applyResume(lease: ChannelLease) {
  const r = lease.resume;
  if (!r || resumedFor === lease.playerId) return;
  resumedFor = lease.playerId;
  if (useDungeon.getState().spawn) return;
  // The prolog places room and gang steps itself.
  const p = useProlog.getState().data;
  if (p?.version === 2 && !p.completedAt && (IN_ROOM_STEPS.has(p.step) || p.step === "gang")) return;
  const pos = r.position;
  if (r.scene === "home") {
    enterHome();
    if (pos && isHomeRoom(pos[0], pos[2])) useGame.setState({ pendingTeleport: pos });
  } else if (r.scene === "gang") {
    // shortcut: a player who left while visiting another gang resumes in their own gang.
    if ((await enterGang()) && pos && isGangPosition(pos[0], pos[2]))
      useGame.setState({ pendingTeleport: pos });
  } else if (pos && !isMountainPosition(pos[0], pos[2])) {
    useGame.setState({ waypoint: null, pendingTeleport: [pos[0], pos[1], pos[2]] });
  }
}
