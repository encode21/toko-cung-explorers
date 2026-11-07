import { useGame } from "@/state/game-store";
import { playerId, remoteStates } from "./useWorldChannel";

export type ChatChannel = "nearby" | "world";
export const CHAT_CHANNEL_LABELS: Record<ChatChannel, string> = {
  nearby: "Sekitar",
  world: "Dunia",
};

const NEARBY_RADIUS = 18;

/** Share the nearby filter between the drawer and its collapsed preview. */
export function isNearbyChatSender(from: string) {
  // GM greetings from the admin dashboard have no position and must reach every tab.
  if (from === playerId || from === "gm") return true;
  const remote = remoteStates.get(from);
  if (!remote) return false;
  const [x, , z] = useGame.getState().playerPos;
  return Math.hypot(remote.x - x, remote.z - z) < NEARBY_RADIUS;
}
