import { prologProgress } from "@/game/prolog/progress";
import { useProlog } from "@/game/prolog/store";
import { useHud } from "@/state/hud-store";
import { HudMenuArtwork } from "./HudMenuArtwork";
import "./delivery-shortcut.css";

export function PrologShortcut({ className = "" }: { className?: string }) {
  const expanded = useHud((s) => s.prologOpen);
  const sheet = useHud((s) => s.sheet);
  const data = useProlog((s) => s.data);
  const progress = prologProgress(data);
  const description = [
    progress ? "prolog-shortcut-progress" : "",
    !expanded && !sheet ? "prolog-task-tooltip" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={`mmo-side-button ${className} ${expanded ? "is-active" : ""}`}
      data-hud-control
      data-side-action="prolog"
      aria-label="Prolog"
      aria-expanded={expanded}
      aria-controls={expanded ? "prolog-task-panel" : undefined}
      aria-describedby={description || undefined}
      onClick={() => useHud.getState().setPrologOpen(!expanded)}
      onKeyDown={(event) => {
        if (event.code === "Space") event.stopPropagation();
        if (event.key === "Escape" && expanded) {
          event.stopPropagation();
          useHud.getState().setPrologOpen(false);
        }
      }}
    >
      <HudMenuArtwork kind="prolog" />
      {progress && (
        <>
          <span className="mmo-prolog-progress mmo-delivery-timer" aria-hidden="true">
            {progress.current}/{progress.total}
          </span>
          <span className="sr-only" id="prolog-shortcut-progress">
            Langkah {progress.current} dari {progress.total}
          </span>
        </>
      )}
    </button>
  );
}
