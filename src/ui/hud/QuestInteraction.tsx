import { Hand, LoaderCircle } from "lucide-react";
import { useQuestInteraction } from "@/hooks/use-quest-interaction";
import { interactWithQuest } from "@/game/core/quest-interaction";
import { useGameCore } from "@/game/core/store";
import { useTouchControls } from "@/hooks/use-touch";

/** One contextual action by the right thumb, independent of the collapsible journal. */
export function QuestInteraction() {
  const action = useQuestInteraction();
  const busy = useGameCore((s) => s.busy);
  const error = useGameCore((s) => s.error);
  const touch = useTouchControls();
  if (!action) return null;
  return (
    <div data-quest-interaction data-hud-control className="mmo-quest-interaction">
      <button
        type="button"
        disabled={busy}
        aria-label={action.label}
        onClick={() => void interactWithQuest()}
      >
        <span className="mmo-quest-action-icon">
          {busy ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden />
          ) : (
            <Hand className="size-5" aria-hidden />
          )}
        </span>
        <span className="min-w-0">
          <strong className="block truncate">{busy ? "Memproses…" : action.label}</strong>
          <span className="block truncate text-[11px] opacity-80">{action.title}</span>
        </span>
        {!touch && <kbd className="ml-auto border border-current/30 rounded px-1.5">F</kbd>}
      </button>
      {error && (
        <p role="status" className="mt-1 rounded bg-slate-950/90 px-2 py-1 text-xs text-amber-100">
          {error}
        </p>
      )}
    </div>
  );
}
