import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, Vector3 } from "three";
import { useGame } from "@/state/game-store";
import { STORE, WAREHOUSE } from "@/game/world/layout";
import { useRenderBudget } from "./render-budget";

export function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}
/** Hide only interior visuals at distance; mounted colliders and gameplay are unchanged. */
export function InteriorVisibility({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  useFrame(({ camera }, dt) => {
    elapsed.current += dt;
    if (!group.current || elapsed.current < 0.25) return;
    elapsed.current = 0;
    const dx = Math.max(0, STORE.minX - camera.position.x, camera.position.x - STORE.maxX);
    const dz = Math.max(0, WAREHOUSE.minZ - camera.position.z, camera.position.z - STORE.maxZ);
    const [px, , pz] = useGame.getState().playerPos;
    const playerInside =
      px >= STORE.minX - 3 &&
      px <= STORE.maxX + 3 &&
      pz >= WAREHOUSE.minZ - 3 &&
      pz <= STORE.maxZ + 3;
    const tier = useRenderBudget.getState().tier;
    const range = tier === "LOW" ? 12 : tier === "MEDIUM" ? 18 : 30;
    group.current.visible = playerInside || dx * dx + dz * dz < range * range;
  });
  return <group ref={group}>{children}</group>;
}
/** Limit expensive shadow passes, preserving every object's normal visual and collider. */
export function ShadowBudget() {
  const originals = useRef(new Map<Mesh, boolean>());
  const position = useRef(new Vector3());
  const elapsed = useRef(0);
  useEffect(
    () => () => {
      for (const [mesh, casts] of originals.current) mesh.castShadow = casts;
      originals.current.clear();
    },
    [],
  );
  useFrame(({ scene, camera }, dt) => {
    elapsed.current += dt;
    if (elapsed.current < 0.5) return;
    elapsed.current = 0;
    const tier = useRenderBudget.getState().tier;
    const range = tier === "LOW" ? 0 : tier === "MEDIUM" ? 22 : 36;
    const alive = new Set<Mesh>();
    scene.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      alive.add(node);
      if (!originals.current.has(node)) originals.current.set(node, node.castShadow);
      if (!originals.current.get(node)) return;
      node.getWorldPosition(position.current);
      // Instanced groups may span the origin; keep their shadow rather than drop a nearby instance.
      node.castShadow =
        range > 0 &&
        ("isInstancedMesh" in node ||
          position.current.distanceToSquared(camera.position) < range * range);
    });
    for (const mesh of originals.current.keys())
      if (!alive.has(mesh)) originals.current.delete(mesh);
  });
  return null;
}
