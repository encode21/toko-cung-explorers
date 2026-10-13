import { useEffect } from "react";
import { useCameraZoom } from "./camera-zoom";
import { gameUiBlocked } from "@/state/game-ui-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useChannels } from "@/net/channel-store";
import { useDungeon } from "@/game/dungeon/store";
import { useWorldEditor } from "@/game/editor/store";

/** Bound only to the live player's canvas, never menu/avatar preview canvases. */
export function useGameplayZoom(canvas: HTMLCanvasElement | null) {
  useEffect(() => {
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (
        event.ctrlKey ||
        gameUiBlocked() ||
        useGame.getState().overlay !== "none" ||
        useHud.getState().sheet ||
        useHud.getState().principalPanel ||
        !useChannels.getState().playing ||
        useDungeon.getState().transition ||
        useWorldEditor.getState().mode === "EDITOR"
      )
        return;
      event.preventDefault();
      const pixels =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
      useCameraZoom.getState().adjust(Math.exp(Math.max(-150, Math.min(150, pixels)) * 0.0015));
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [canvas]);
}
