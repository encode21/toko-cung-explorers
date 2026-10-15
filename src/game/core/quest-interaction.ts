import { useControls } from "@/game/player/control-state";
import { useGameCore, command } from "./store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { gameUiBlocked } from "@/state/game-ui-store";
import { useDungeon } from "@/game/dungeon/store";
import { useClub } from "@/game/club/store";
import { useWorldEditor } from "@/game/editor/store";
import { resolveObjective } from "@/game/editor/resolve";
import { worldLandmarkFor } from "@/game/world/landmarks";
import { useSecretQuest } from "@/game/secret/store";
import { PLAYER_VISUAL_DROP } from "@/game/world/street-props";

/** Re-evaluate at interaction time so stale UI cannot submit a remote/finished objective. */
export function nearbyQuestAction() {
  const { snapshot } = useGameCore.getState();
  const game = useGame.getState();
  const hud = useHud.getState();
  const run = snapshot?.active;
  if (
    !useControls.getState().playerReady ||
    !run ||
    !["ACTIVE", "ACCEPTED"].includes(run.status) ||
    game.overlay !== "none" ||
    game.sitting ||
    gameUiBlocked() ||
    hud.sheet ||
    hud.principalPanel ||
    useSecretQuest.getState().open ||
    useDungeon.getState().data?.instance ||
    (useClub.getState().inside && !useClub.getState().outdoor) ||
    useWorldEditor.getState().mode !== "PLAYER"
  )
    return null;
  const quest = snapshot?.quests.find((q) => q.id === run.quest_id);
  if (!quest) return null;
  const index = quest.objectives.findIndex((o, i) => (run.progress[i] ?? 0) < o.required);
  const raw = quest.objectives[index];
  // All objectives done → GameCoreRuntime auto-calls `complete` (no ✓ turn-in).
  if (!raw) return null;
  if (raw.realm === "DUNGEON" || (quest.dungeon_id && raw.realm !== "WORLD")) return null;
  const resolved = resolveObjective(raw);
  const objective = {
    ...resolved,
    position: resolved.targetId
      ? resolved.position
      : worldLandmarkFor(resolved.target, resolved.position),
  };
  const [x, y, z] = objective.position;
  const pos = game.playerPos;
  if (
    ![x, y, z, objective.radius].every(Number.isFinite) ||
    Math.hypot(pos[0] - x, pos[2] - z) > objective.radius ||
    Math.abs(pos[1] - PLAYER_VISUAL_DROP - y) >= (objective.secret ? 5 : 1.8)
  )
    return null;
  return {
    run,
    index,
    objective,
    title: objective.label,
    label: objective.secret
      ? "Selidiki jejak"
      : objective.type === "TALK"
        ? "Sapa Nakama"
        : "Lakukan tujuan",
  };
}

export async function interactWithQuest() {
  const action = nearbyQuestAction();
  if (!action || useGameCore.getState().busy) return;
  const { objective, index, run } = action;
  if (objective?.secret) {
    useSecretQuest.getState().openDiscovery(index);
    return;
  }
  if (!objective) return;
  const result = await command("objective", { objective: index });
  const next = useGameCore.getState().snapshot?.active;
  if (
    result.ok &&
    objective.type === "TALK" &&
    next?.id === run.id &&
    (next.progress[index] ?? 0) > (run.progress[index] ?? 0)
  ) {
    useGame.setState({ overlay: "dialogue", activeNpc: objective.target, dialogue: [] });
  }
}
