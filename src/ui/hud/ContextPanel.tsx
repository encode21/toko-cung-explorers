import { useQuestInteraction } from "@/hooks/use-quest-interaction";
import { Armchair, Hand, LogIn, Monitor, Package, ShoppingCart } from "lucide-react";
import { useGame } from "@/state/game-store";
import { nearbyActionPosition } from "@/game/interactions/action-position";
import { WorldActionAnchor } from "./WorldActionAnchor";
import { NpcQuestionIcon } from "./NpcQuestionIcon";

const META = {
  door: { verb: "Buka pintu", Icon: LogIn },
  mission: { verb: "Ambil Paket", Icon: Package },
  kiosk: { verb: "Gunakan Quest Board", Icon: Monitor },
  world: { verb: "Masuk Gedung", Icon: LogIn },
  npc: { verb: "Ajak bicara", Icon: Hand },
  shelf: { verb: "Scan Barang", Icon: ShoppingCart },
  cashier: { verb: "Scan Barang", Icon: ShoppingCart },
  bench: { verb: "Duduk", Icon: Armchair },
  player: { verb: "Sapa", Icon: Hand },
} as const;

/** Reachable world action above the target. Punch uses the jump-adjacent mobile button / G. */
export function ContextPanel({ touch }: { touch: boolean }) {
  const questAction = useQuestInteraction();
  const target = useGame((s) => s.nearby);
  const sitting = useGame((s) => s.sitting);
  if (sitting || !target || questAction) return null;
  const meta = META[target.kind];
  const verb =
    target.kind === "mission" && target.label.toLowerCase().includes("taruh")
      ? "Taruh Paket"
      : meta.verb;
  const Icon = meta.Icon;
  const act = () => {
    const game = useGame.getState();
    if (game.sitting) return;
    if (game.nearby?.id !== target.id || game.nearby.kind !== target.kind) return;
    if (target.kind === "player") game.socialAct("wave");
    else game.interact();
  };
  return (
    <WorldActionAnchor position={() => nearbyActionPosition(target)}>
      <div data-context-panel className="world-action-buttons">
        <button
          type="button"
          data-hud-control
          className="world-action-button"
          aria-label={`${verb} · ${target.label}`}
          title={`${verb} · ${target.label}`}
          onClick={act}
        >
          {target.kind === "npc" ? (
            <NpcQuestionIcon />
          ) : target.kind === "player" ? (
            <img
              className="world-action-sapa-icon"
              src="/assets/hud/sapa-icon.svg"
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          ) : (
            <Icon aria-hidden />
          )}
          {!touch && <kbd aria-hidden>F</kbd>}
        </button>
      </div>
    </WorldActionAnchor>
  );
}
