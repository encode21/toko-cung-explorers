import { LOW_QUALITY } from "@/game/engine/quality";

/** Mobile / coarse pointer: keep YouTube in a HUD dock (3D Html covers the scene). */
export function clubHudPlayer(): boolean {
  if (typeof window === "undefined") return false;
  return (
    LOW_QUALITY ||
    window.matchMedia("(max-width: 900px)").matches ||
    (window.matchMedia("(pointer: coarse)").matches &&
      Math.min(window.innerWidth, window.innerHeight) < 900)
  );
}
