import { useIsMobile } from "@/hooks/use-mobile";
import { useTouchControls } from "@/hooks/use-touch";

/**
 * Compact game controls: touch devices or narrow desktop windows. Portrait touch gameplay is guarded.
 * Joystick/camera still gated by `touch` alone.
 */
export function useMobileHudLayout() {
  const touch = useTouchControls();
  const narrow = useIsMobile();
  return { touch, narrow, mobile: touch || narrow };
}
