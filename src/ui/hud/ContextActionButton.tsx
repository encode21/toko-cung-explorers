import {
  Armchair,
  BedDouble,
  Bike,
  CarFront,
  Hand,
  LoaderCircle,
  PackageOpen,
  ReceiptText,
  Shirt,
  ShoppingCart,
  Store,
} from "lucide-react";
import { useContextActions } from "@/hooks/use-context-action";
import { useVehicleBoarding } from "@/game/vehicles/runtime";
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

function ContextObjectIcon({ id, label, vehicleIcon }: ContextAction) {
  if (id === "pulang:window") {
    const opening = label === "Buka";
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M3 21h18M5 21V3h14v18" />
        {opening ? (
          <>
            <path d="m5 3 8 3v12l-8 3" />
            <path d="M5 12h8m0 0h6" />
          </>
        ) : (
          <path d="M12 3v18M5 12h14" />
        )}
      </svg>
    );
  }
  if (id === "pulang:box") return <PackageOpen aria-hidden />;
  if (id === "pulang:bed") return <BedDouble aria-hidden />;
  if (id === "vehicle:mount")
    return vehicleIcon === "motorcycle" ? <Bike aria-hidden /> : <CarFront aria-hidden />;
  if (id.startsWith("world:kiosk:")) return <Store aria-hidden />;
  if (id.startsWith("world:cashier:")) return <ReceiptText aria-hidden />;
  if (id.startsWith("world:bench:")) return <Armchair aria-hidden />;
  if (id === "home:wardrobe") return <Shirt aria-hidden />;
  return <Hand aria-hidden />;
}

/** Quest progress has a reachable control; ambient greetings stay above their actor. */
export function ContextActionButton() {
  const actions = useContextActions();
  const submitting = useContextActionState((s) => s.busy);
  const walkingToVehicle = useVehicleBoarding((s) => s.vehicleId !== null);
  const touch = useTouchControls();
  if (!actions.length) return null;
  const action = currentContextAction(actions);
  const conversation = action?.anchor
    ? action
    : actions.find((candidate) => candidate.anchor && !isShowroomVehicleAction(candidate));
  const overhead = actions.filter(
    (candidate) => candidate === conversation || isShowroomVehicleAction(candidate),
  );
  const approachingDoor = action?.id === "vehicle:mount" && walkingToVehicle;
  const busy = action?.busy || submitting || approachingDoor;
  const label = approachingDoor
    ? "Ke pintu"
    : action?.label === "Bicara"
      ? "Lanjut Kerja Sambilan"
      : action?.label;
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
            ) : (
              <ContextObjectIcon {...action} />
            )}
            <span>{label}</span>
            <kbd>F</kbd>
          </button>
          {/* <span className="context-action-target">{action.title}</span> */}
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
