import { Check, Hand, LoaderCircle, Search } from "lucide-react";
import { useQuestInteraction } from "@/hooks/use-quest-interaction";
import { interactWithQuest, nearbyQuestAction } from "@/game/core/quest-interaction";
import { useGameCore } from "@/game/core/store";
import { useGame } from "@/state/game-store";
import { useTouchControls } from "@/hooks/use-touch";
import { WorldActionAnchor } from "./WorldActionAnchor";
import { NpcQuestionIcon } from "./NpcQuestionIcon";

/** Keep the existing objective validation, with its prompt attached to the actual target. */
export function QuestInteraction() {
  const action = useQuestInteraction();
  const busy = useGameCore((s) => s.busy);
  const error = useGameCore((s) => s.error);
  const touch = useTouchControls();
  if (!action) return null;
  const position = (): [number, number, number] | null => {
    const current = nearbyQuestAction();
    if (!current || current.run.id !== action.run.id || current.index !== action.index) return null;
    const point = current.objective?.position;
    // Completing a quest has no world object: show its action above the player.
    if (!point) {
      const player = useGame.getState().playerPos;
      return [player[0], player[1] + 1.6, player[2]];
    }
    return [point[0], point[1] + (current.objective?.type === "TALK" ? 2.25 : 1.5), point[2]];
  };
  const Icon = busy
    ? LoaderCircle
    : !action.objective
      ? Check
      : action.objective.secret
        ? Search
        : Hand;
  return (
    <WorldActionAnchor position={position}>
      <div data-quest-interaction data-hud-control>
        <button
          type="button"
          className="world-action-button"
          disabled={busy}
          aria-label={action.label}
          title={`${action.label} · ${action.title}`}
          onClick={() => void interactWithQuest()}
        >
          {action.objective?.type === "TALK" && !busy ? (
            <NpcQuestionIcon />
          ) : (
            <Icon className={busy ? "animate-spin" : undefined} aria-hidden />
          )}
          {!touch && <kbd aria-hidden>F</kbd>}
        </button>
        {error && (
          <p role="status" className="world-action-error">
            {error}
          </p>
        )}
      </div>
    </WorldActionAnchor>
  );
}
