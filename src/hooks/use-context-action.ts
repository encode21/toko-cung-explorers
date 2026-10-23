import { useTruckRoom } from "@/game/missions/truck-state";
import { useMobility } from "@/game/mobility/store";
import { useChannels } from "@/net/channel-store";
import { useMissionFocus } from "@/state/mission-focus";
import { useSyncExternalStore } from "react";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useGameUi } from "@/state/game-ui-store";
import { useControls } from "@/game/player/control-state";
import { useWorldEditor } from "@/game/editor/store";
import { useGameCore } from "@/game/core/store";
import { useDaily } from "@/game/daily/store";
import { useDungeon } from "@/game/dungeon/store";
import { useDungeonDialogue } from "@/game/dungeon/dialogue-store";
import { useQuestGiverDialogue } from "@/game/daily/quest-giver-dialogue";
import { useSecretQuest } from "@/game/secret/store";
import { useClub } from "@/game/club/store";
import { useFishing } from "@/game/fishing/store";
import { useMissions } from "@/game/missions/store";
import { contextActions, useContextActionState } from "@/game/interactions/context-action";
// Subscribe without allocating an unstable snapshot on every React render.
const stores = [
  useTruckRoom,
  useMobility,
  useChannels,
  useMissionFocus,
  useGame,
  useHud,
  useGameUi,
  useControls,
  useWorldEditor,
  useGameCore,
  useDaily,
  useDungeon,
  useDungeonDialogue,
  useQuestGiverDialogue,
  useSecretQuest,
  useClub,
  useFishing,
  useMissions,
  useContextActionState,
];
let revision = 0;
for (const store of stores)
  store.subscribe(() => {
    revision++;
  });
const subscribe = (notify: () => void) => {
  const stops = stores.map((store) => store.subscribe(notify));
  return () => stops.forEach((stop) => stop());
};
export function useContextActions() {
  useSyncExternalStore(
    subscribe,
    () => revision,
    () => 0,
  );
  return contextActions();
}
export function useContextAction() {
  return useContextActions()[0] ?? null;
}
