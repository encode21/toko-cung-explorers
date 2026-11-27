import { useEffect } from "react";
import { useHome } from "@/game/home/store";
import { useGame } from "@/state/game-store";
import { gameUiBlocked } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import { useWorldEditor } from "@/game/editor/store";
import { useCameraZoom } from "./camera-zoom";

/** Wheel zoom is available on the room canvas. Touch uses the existing two-finger gesture. */
export function useGameplayZoom(canvas: HTMLCanvasElement | null) {
  useEffect(() => {
    useCameraZoom.setState({ distance: 1 });
  }, []);

  useEffect(() => {
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      const game = useGame.getState();
      const hud = useHud.getState();
      if (
        !useHome.getState().inside ||
        game.overlay !== "none" ||
        game.pendingTeleport ||
        gameUiBlocked() ||
        hud.sheet ||
        hud.principalPanel ||
        useWorldEditor.getState().mode !== "PLAYER" ||
        event.deltaY === 0
      )
        return;

      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1;
      const offset = Math.max(-160, Math.min(160, event.deltaY * unit));
      useCameraZoom.getState().adjust(Math.exp(offset * 0.002));
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [canvas]);
}
