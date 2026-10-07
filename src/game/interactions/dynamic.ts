import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import type { Interactable, NpcRole } from "@/game/interactions/interactables";

/**
 * Registry interaktif untuk NPC yang bergerak (pejalan/pengunjung).
 * Posisinya di-update setiap frame dari group Three.js masing-masing NPC.
 */
const registry = new Map<string, Interactable>();

export function dynamicInteractables(): Interactable[] {
  return Array.from(registry.values());
}

export function dynamicInteractableById(id: string) {
  return registry.get(id);
}

/** Daftarkan NPC bergerak supaya bisa disapa (E) seperti NPC statis. */
export function useMovingInteractable(
  ref: React.RefObject<THREE.Group | null>,
  meta: { id: string; label: string; persona: string; role: NpcRole; radius?: number },
  enabled?: React.RefObject<boolean>,
) {
  const entry = useRef<Interactable>({
    id: meta.id,
    label: meta.label,
    kind: "npc",
    position: [0, 0, 0],
    radius: meta.radius ?? 2.4,
    persona: meta.persona,
    role: meta.role,
  });

  useEffect(() => {
    const e = entry.current;
    e.label = meta.label;
    e.persona = meta.persona;
    e.role = meta.role;
    registry.set(meta.id, e);
    return () => {
      registry.delete(meta.id);
    };
  }, [meta.id, meta.label, meta.persona, meta.role]);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    entry.current.radius = enabled?.current === false ? 0 : (meta.radius ?? 2.4);
    entry.current.position[0] = g.position.x;
    entry.current.position[2] = g.position.z;
  });
}
