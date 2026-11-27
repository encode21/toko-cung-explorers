import { Hand, LoaderCircle, Shirt, ShoppingCart } from "lucide-react";
import { useContextActions } from "@/hooks/use-context-action";
import {
  contextActions,
  currentContextAction,
  performContextAction,
  useContextActionState,
  type ContextAction,
} from "@/game/interactions/context-action";
import { WorldActionAnchor } from "./WorldActionAnchor";
import { ContextPanel } from "./ContextPanel";
import { NpcQuestionIcon } from "./NpcQuestionIcon";
import { useTouchControls } from "@/hooks/use-touch";
import "./context-actions.css";

function isShowroomVehicleAction(action: ContextAction) {
  return action.id.startsWith("showroom:vehicle:");
}

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
  const vehicle = isShowroomVehicleAction(action);
  return (
    <WorldActionAnchor
      position={
        vehicle && action.anchor
          ? action.anchor
          : () =>
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
            ) : vehicle || action.id === "showroom:gear" ? (
              <ShoppingCart aria-hidden />
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
  if (!actions.length) return null;
  const action = currentContextAction(actions);
  const conversation = action?.anchor
    ? action
    : actions.find((candidate) => candidate.anchor && !isShowroomVehicleAction(candidate));
  const overhead = actions.filter(
    (candidate) => candidate === conversation || isShowroomVehicleAction(candidate),
  );
  const busy = action?.busy || submitting;
  const label = action?.label === "Bicara" ? "Lanjut Kerja Sambilan" : action?.label;
  return (
    <>
      {overhead.map((candidate) => (
        <OverheadAction
          key={candidate.id}
          action={candidate}
          primary={candidate === action}
          submitting={submitting}
          touch={touch}
        />
      ))}
      {action && !action.anchor && (
        <div
          className="context-action"
          data-context-action
          data-vehicle-context-exit={action.id === "vehicle:exit" || undefined}
          data-hud-control
        >
          <button
            type="button"
            className="context-action-button"
            disabled={busy}
            aria-label={`${label} · ${action.title}`}
            onClick={() => void performContextAction(action.id)}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : action.id === "home:wardrobe" ? (
              <Shirt aria-hidden />
            ) : (
              <Hand aria-hidden />
            )}
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
      )}
    </>
  );
}
