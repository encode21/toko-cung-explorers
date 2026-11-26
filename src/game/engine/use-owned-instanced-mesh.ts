import { useCallback, useRef } from "react";
import type { InstancedMesh } from "three";

/** Release per-instance GPU buffers while retaining shared geometry and materials. */
export function useOwnedInstancedMesh() {
  const ref = useRef<InstancedMesh | null>(null);
  const attach = useCallback((mesh: InstancedMesh | null) => {
    if (ref.current === mesh) return;
    // Callback refs also detach when R3F replaces an object after its args change.
    // StrictMode can reattach it: Three rebuilds instance buffers on the next draw.
    ref.current?.dispose();
    ref.current = mesh;
  }, []);
  return [ref, attach] as const;
}
