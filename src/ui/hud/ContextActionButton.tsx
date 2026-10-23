import { Hand, LoaderCircle } from "lucide-react";
import { useContextActions } from "@/hooks/use-context-action";
import {
  contextActions,
  performContextAction,
  useContextActionState,
  type ContextAction,
} from "@/game/interactions/context-action";
import { WorldActionAnchor } from "./WorldActionAnchor";
import { ContextPanel } from "./ContextPanel";
import { NpcQuestionIcon } from "./NpcQuestionIcon";
import { useTouchControls } from "@/hooks/use-touch";
import "./context-actions.css";

function OverheadAction({
  action,
  primary,
  submitting,
  touch,
}: {
  action: ContextAction;
  primary: boolean;
  submitting: boolean;
  touch: boolean;
}) {
  const busy = action.busy || submitting;
  return (
    <WorldActionAnchor
      position={() =>
        contextActions()
          .find((candidate) => candidate.id === action.id)
          ?.anchor?.() ?? null
      }
    >
      <div data-context-action={primary || undefined} data-context-conversation data-hud-control>
        <div className="world-action-buttons">
          <button
            type="button"
            className="world-action-button"
            disabled={busy}
            aria-label={`${action.label} · ${action.title}`}
            title={`${action.label} · ${action.title}`}
            onClick={() => void performContextAction(action.id)}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : action.label === "Bicara" ? (
              <NpcQuestionIcon />
            ) : (
              <Hand aria-hidden />
            )}
            {!touch && primary && <kbd aria-hidden>F</kbd>}
          </button>
          {action.id.startsWith("world:player:") && <ContextPanel />}
        </div>
        {action.error && (
          <p role="status" className="world-action-error">
            {action.error}
          </p>
        )}
      </div>
    </WorldActionAnchor>
  );
}

/** Quest progress has a reachable control; ambient greetings stay above their actor. */
export function ContextActionButton() {
  const actions = useContextActions();
  const submitting = useContextActionState((s) => s.busy);
  const touch = useTouchControls();
  const action = actions[0];
  if (!action) return null;
  const conversation = actions.find((candidate) => candidate.anchor);
  if (action.anchor)
    return <OverheadAction action={action} primary submitting={submitting} touch={touch} />;
  const busy = action.busy || submitting;
  const label = action.label === "Bicara" ? "Lanjut Quest" : action.label;
  return (
    <>
      {conversation && (
        <OverheadAction
          action={conversation}
          primary={false}
          submitting={submitting}
          touch={touch}
        />
      )}
      <div className="context-action" data-context-action data-hud-control>
        <button
          type="button"
          className="context-action-button"
          disabled={busy}
          aria-label={`${label} · ${action.title}`}
          onClick={() => void performContextAction(action.id)}
        >
          {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Hand aria-hidden />}
          <span>{label}</span>
          <kbd>F</kbd>
        </button>
        <span className="context-action-target">{action.title}</span>
        {action.error && (
          <span role="status" className="context-action-error">
            {action.error}
          </span>
        )}
      </div>
    </>
  );
}
