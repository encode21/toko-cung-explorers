/** @jsxImportSource @/game/jsx */
import { useEffect, useRef, type ReactNode } from "react";
import type { Group, Object3D } from "three";
import { useGame } from "@/state/game-store";

type Drawable = Object3D & {
  isMesh?: boolean;
  isPoints?: boolean;
  isLine?: boolean;
  isSprite?: boolean;
};

/**
 * Stops drawing outdoor content while the player is inside Toko Cung: three.js has no occlusion
 * culling, so the city behind the store walls was still drawn (8 FPS / 571 draw calls on a phone).
 * Only drawables are hidden — lights stay in the scene, because changing the light count makes
 * three.js recompile every shader (a freeze on each store entry/exit). Colliders and simulations
 * keep running; nothing remounts.
 */
export function HiddenIndoors({ children }: { children: ReactNode }) {
  const inside = useGame((s) => s.inside);
  const ref = useRef<Group>(null);
  useEffect(() => {
    const group = ref.current;
    if (!group || !inside) return;
    const hidden: Object3D[] = [];
    group.traverse((o) => {
      const d = o as Drawable;
      if ((d.isMesh || d.isPoints || d.isLine || d.isSprite) && d.visible) {
        d.visible = false;
        hidden.push(d);
      }
    });
    // shortcut: restores only what it hid; a mesh a component hides while the player is inside
    // reappears on exit until that component updates it again.
    return () => hidden.forEach((o) => (o.visible = true));
  }, [inside]);
  return <group ref={ref}>{children}</group>;
}
