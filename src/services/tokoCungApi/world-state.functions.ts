import { worldRequest } from "@/services/world/client";
import { parseSnapshot } from "@/game/reactive-world/model";
/** Same authenticated Laravel account gateway as quests; no browser demo events in normal play. */
export async function getWorldState() {
  const result = await worldRequest<unknown>("state");
  const snapshot = parseSnapshot(result);
  if (!snapshot) throw new Error("World event response is invalid");
  return snapshot;
}
