import { useEffect } from "react";
import { useCameraZoom } from "./camera-zoom";

/**
 * Gameplay camera stays at the authored default distance.
 * Wheel/trackpad zoom stays disabled; touch pinch on the right look area lives in MobileControls.
 */
export function useGameplayZoom(_canvas: HTMLCanvasElement | null) {
  useEffect(() => {
    useCameraZoom.setState({ distance: 1 });
  }, []);
}
