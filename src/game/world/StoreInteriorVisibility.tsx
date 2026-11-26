/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { Group } from "three";
import { useWorldEditor } from "@/game/editor/store";
import { useGame } from "@/state/game-store";

/** Stop drawing the subtree while outside without remounting assets, physics, or simulation. */
export function StoreInteriorVisibility({ children, name }: { children: ReactNode; name: string }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    const update = () => {
      group.visible = useGame.getState().inside || useWorldEditor.getState().mode === "EDITOR";
    };
    update();
    // Scene frames publish the threshold crossing before Three renders the next view.
    const stopGame = useGame.subscribe((state, previous) => {
      if (state.inside !== previous.inside) update();
    });
    const stopEditor = useWorldEditor.subscribe((state, previous) => {
      if (state.mode !== previous.mode) update();
    });
    return () => {
      stopGame();
      stopEditor();
    };
  }, []);
  return (
    <group name={name} ref={ref} visible={false}>
      {children}
    </group>
  );
}
