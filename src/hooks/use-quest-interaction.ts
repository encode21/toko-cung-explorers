import { useControls } from "@/game/player/control-state";
import { nearbyQuestAction } from "@/game/core/quest-interaction";
import { useGameCore } from "@/game/core/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useGameUi } from "@/state/game-ui-store";
import { useWorldEditor } from "@/game/editor/store";
import { useDungeon } from "@/game/dungeon/store";
import { useClub } from "@/game/club/store";
import { useSecretQuest } from "@/game/secret/store";

export function useQuestInteraction() {
  useControls((s) => s.playerReady);
  useGameCore((s) => s.snapshot);
  useGame((s) => s.playerPos);
  useGame((s) => s.overlay);
  useGame((s) => s.sitting);
  useHud((s) => s.sheet);
  useHud((s) => s.principalPanel);
  useGameUi((s) => s.panels);
  useGameUi((s) => s.portrait);
  useWorldEditor((s) => s.saved);
  useWorldEditor((s) => s.mode);
  useDungeon((s) => s.data);
  useClub((s) => s.inside);
  useSecretQuest((s) => s.open);
  return nearbyQuestAction();
}
