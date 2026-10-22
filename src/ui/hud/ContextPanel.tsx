import { connectionId } from "@/net/channel-store";
import { mobilityCommand, useMobility } from "@/game/mobility/store";
import { Users } from "lucide-react";
import { useFishing } from "@/game/fishing/store";
import { useQuestInteraction } from "@/hooks/use-quest-interaction";
import { useGame } from "@/state/game-store";
import { nearbyActionPosition } from "@/game/interactions/action-position";
import { WorldActionAnchor } from "./WorldActionAnchor";
import { DanceSyncButton } from "./DanceSyncButton";

/** Reachable world action above the target. Punch uses the jump-adjacent mobile button / G. */
export function ContextPanel() {
  const questAction = useQuestInteraction();
  const target = useGame((s) => s.nearby);
  const fishing = useFishing((s) => s.open);
  const paired = useMobility((s) =>
    s.carries.some((p) => p.carrier === connectionId || p.passenger === connectionId),
  );
  const mobilityBusy = useMobility((s) => s.busy);
  const sitting = useGame((s) => s.sitting);
  if (sitting || !target || target.kind !== "player" || questAction || fishing) return null;
  return (
    <WorldActionAnchor position={() => nearbyActionPosition(target)}>
      <div data-context-panel className="world-action-buttons">
        {target.kind === "player" && !paired && (
          <button
            type="button"
            className="world-action-button"
            data-hud-control
            aria-label={`Gendong · ${target.label}`}
            title={`Gendong · ${target.label}`}
            disabled={mobilityBusy}
            onClick={() => void mobilityCommand("request", { target: target.id })}
          >
            <Users aria-hidden />
          </button>
        )}
        {target.kind === "player" && <DanceSyncButton playerId={target.id} name={target.label} />}
      </div>
    </WorldActionAnchor>
  );
}
