import { useEffect } from "react";
import { useCameraZoom } from "./camera-zoom";

/**
 * Gameplay camera stays at the authored default distance.
 * Pinch / ctrl+wheel / trackpad zoom are intentionally disabled — look is drag-only.
 */
export function useGameplayZoom(_canvas: HTMLCanvasElement | null) {
  useEffect(() => {
    useCameraZoom.setState({ distance: 1 });
  }, []);
}
