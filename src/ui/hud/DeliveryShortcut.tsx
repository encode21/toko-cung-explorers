import { useHud } from "@/state/hud-store";
import { HudMenuArtwork } from "./HudMenuArtwork";
import { useDeliveryStatus } from "./use-delivery-status";
import "./delivery-shortcut.css";

export function DeliveryShortcut() {
  const { active, boxes, left, countdown, description } = useDeliveryStatus();
  const expanded = useHud((s) => s.sheet === "delivery");
  if (!active) return null;

  return (
    <button
      type="button"
      className="mmo-side-button mmo-delivery-shortcut"
      data-hud-control
      data-side-action="delivery"
      aria-label={description}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      title={description}
      onClick={() => useHud.getState().setSheet("delivery")}
    >
      <span className="mmo-delivery-art" aria-hidden="true">
        <HudMenuArtwork kind="delivery" />
        <span className="mmo-delivery-count">{boxes > 99 ? "99+" : boxes}</span>
      </span>
      <span className="mmo-delivery-timer" aria-hidden="true">
        {left > 0 ? countdown : "Tiba"}
      </span>
    </button>
  );
}
