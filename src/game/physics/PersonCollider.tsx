/** @jsxImportSource @/game/jsx */
import { useGame } from "@/state/game-store";
import { overlapEscape } from "@/game/player/spawn";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useRef, type RefObject } from "react";
import type * as THREE from "three";

/** Capsule kinematic yang mengikuti group orang (NPC / remote) supaya tidak bisa ditembus. */
export function PersonCollider({
  target,
  y = 0.83,
  escapeOverlap = false,
}: {
  target: RefObject<THREE.Object3D | null>;
  y?: number;
  escapeOverlap?: boolean;
}) {
  const body = useRef<RapierRigidBody>(null);
  const escaping = useRef(false);

  useFrame(() => {
    const g = target.current;
    const rb = body.current;
    if (!g || !rb) return;
    rb.setEnabled(g.visible);
    if (!g.visible) return;
    if (escapeOverlap) {
      const [x, localY, z] = useGame.getState().playerPos;
      escaping.current = overlapEscape(
        escaping.current,
        Math.hypot(x - g.position.x, z - g.position.z),
        localY - (g.position.y + y),
      );
      rb.collider(0).setSensor(escaping.current);
    }
    rb.setNextKinematicTranslation({ x: g.position.x, y: g.position.y + y, z: g.position.z });
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} canSleep={false}>
      <CapsuleCollider args={[0.42, 0.34]} />
    </RigidBody>
  );
}
