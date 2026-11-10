import { isMountainPosition } from "./model";
import { MOUNTAIN_OUTFITS, type MountainOutfitId } from "./outfits";
import { useMountain } from "./store";
import { useSummitLeaderboard } from "./leaderboard";

export type MountainGearPose = { mountainOutfit: MountainOutfitId | null; summitBoard: boolean };
/** Only these free loan looks are accepted; pose data can never grant account equipment. */
export function sanitizeMountainGear(raw: unknown, x: number, z: number): MountainGearPose {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (!isMountainPosition(x, z)) return { mountainOutfit: null, summitBoard: false };
  const outfit = MOUNTAIN_OUTFITS.find((p) => p.id === data["mountainOutfit"]);
  return { mountainOutfit: outfit?.id ?? null, summitBoard: data["summitBoard"] === true };
}
export function localMountainGear(position: readonly number[]): MountainGearPose {
  const state = useMountain.getState(),
    leaderboard = useSummitLeaderboard.getState();
  return sanitizeMountainGear(
    {
      mountainOutfit: state.outfit,
      summitBoard:
        state.summitBoardEquipped &&
        leaderboard.loaded &&
        leaderboard.ownSummits > 0 &&
        !state.flight,
    },
    position[0]!,
    position[2]!,
  );
}
