/** @jsxImportSource @/game/jsx */
import { useGame } from "@/state/game-store";
import { doorWalkActive } from "@/state/game-ui-store";
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
  disabled = false,
  npcId,
}: {
  target: RefObject<THREE.Object3D | null>;
  y?: number;
  escapeOverlap?: boolean;
  disabled?: boolean;
  /** Tags the capsule so a player-driven vehicle's sweep can knock this NPC over. */
  npcId?: string;
}) {
  const body = useRef<RapierRigidBody>(null);
  const escaping = useRef(false);

  useFrame(() => {
    const g = target.current;
    const rb = body.current;
    if (!g || !rb) return;
    rb.setEnabled(g.visible && !disabled);
    if (!g.visible || disabled) return;
    if (escapeOverlap) {
      const [x, localY, z] = useGame.getState().playerPos;
      escaping.current = overlapEscape(
        escaping.current,
        Math.hypot(x - g.position.x, z - g.position.z),
        localY - (g.position.y + y),
      );
      // Remote peers: a guided door walk passes through whoever stands or queues in the doorway.
      rb.collider(0).setSensor(escaping.current || doorWalkActive());
    }
    rb.setNextKinematicTranslation({ x: g.position.x, y: g.position.y + y, z: g.position.z });
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      canSleep={false}
      userData={{ cameraPassThrough: true, npcId }}
    >
      <CapsuleCollider args={[0.42, 0.34]} />
    </RigidBody>
  );
}
