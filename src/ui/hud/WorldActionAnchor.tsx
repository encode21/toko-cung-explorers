import { useLayoutEffect, useRef, type ReactNode } from "react";
import { registerActionAnchor, type ActionPosition } from "@/game/interactions/action-projection";
import { useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import { useGame } from "@/state/game-store";
import { useControls } from "@/game/player/control-state";
import { useWorldEditor } from "@/game/editor/store";
import "./world-actions.css";

export function WorldActionAnchor({
  position,
  children,
}: {
  position: () => ActionPosition | null;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const positionRef = useRef(position);
  const blocked = useGameUi((s) => s.portrait || s.panels > 0);
  const sheet = useHud((s) => s.sheet);
  const principal = useHud((s) => s.principalPanel);
  const overlay = useGame((s) => s.overlay);
  const ready = useControls((s) => s.playerReady);
  const editor = useWorldEditor((s) => s.mode !== "PLAYER");
  const visible = !blocked && !sheet && !principal && overlay === "none" && ready && !editor;
  useLayoutEffect(() => {
    positionRef.current = position;
  }, [position]);
  useLayoutEffect(() => {
    if (!visible || !ref.current) return;
    // Keep the anchor mounted when a parent supplies a new position callback.
    // Unregistering on every update hides the marker between animation frames.
    return registerActionAnchor(ref.current, () => positionRef.current());
  }, [visible]);
  if (!visible) return null;
  return (
    <div ref={ref} className="world-action-anchor" data-world-action-anchor>
      <div
        className="world-action-content"
        data-hud-control
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
