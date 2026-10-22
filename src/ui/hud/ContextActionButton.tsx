import { Hand, LoaderCircle } from "lucide-react";
import { useContextAction } from "@/hooks/use-context-action";
import { performContextAction, useContextActionState } from "@/game/interactions/context-action";
import "./context-actions.css";
export function ContextActionButton() {
  const action = useContextAction();
  const submitting = useContextActionState((s) => s.busy);
  if (!action) return null;
  const busy = action.busy || submitting;
  return (
    <div className="context-action" data-context-action data-hud-control>
      <button
        type="button"
        className="context-action-button"
        disabled={busy}
        aria-label={`${action.label} · ${action.title}`}
        onClick={() => void performContextAction(action.id)}
      >
        {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Hand aria-hidden />}
        <span>{action.label}</span>
        <kbd>F</kbd>
      </button>
      <span className="context-action-target">{action.title}</span>
      {action.error && (
        <span role="status" className="context-action-error">
          {action.error}
        </span>
      )}
    </div>
  );
}
