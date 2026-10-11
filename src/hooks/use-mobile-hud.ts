import { useIsMobile } from "@/hooks/use-mobile";
import { useTouchControls } from "@/hooks/use-touch";

/**
 * Mobile portrait HUD layout: narrow viewport (≤767px) and/or touch controls.
 * Joystick/camera still gated by `touch` alone.
 */
export function useMobileHudLayout() {
  const touch = useTouchControls();
  const narrow = useIsMobile();
  return { touch, narrow, mobile: touch || narrow };
}
