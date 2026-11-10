import { useGame } from "@/state/game-store";
import { isMountainPosition } from "@/game/mountain/model";

/** Prepare the destination before Player consumes the teleport in the next physics frame. */
export function useMountainLocation() {
  return useGame((state) => {
    const position = state.pendingTeleport ?? state.playerPos;
    return isMountainPosition(position[0], position[2]);
  });
}
