/** @jsxImportSource @/game/jsx */
import type { ReactNode } from "react";
import { useGame } from "@/state/game-store";

/**
 * Stops drawing (not mounting) outdoor content while the player is inside Toko Cung.
 * three.js has no occlusion culling, so the whole city behind the store walls was still drawn
 * (8 FPS / 571 draw calls on a phone). Colliders and simulations keep running.
 */
export function HiddenIndoors({ children }: { children: ReactNode }) {
  const inside = useGame((s) => s.inside);
  return <group visible={!inside}>{children}</group>;
}
