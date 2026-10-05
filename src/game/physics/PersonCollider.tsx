/** @jsxImportSource @/game/jsx */
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useRef, type RefObject } from "react";
import type * as THREE from "three";

/** Capsule kinematic yang mengikuti group orang (NPC / remote) supaya tidak bisa ditembus. */
export function PersonCollider({
  target,
  y = 0.83,
}: {
  target: RefObject<THREE.Object3D | null>;
  y?: number;
}) {
  const body = useRef<RapierRigidBody>(null);

  useFrame(() => {
    const g = target.current;
    const rb = body.current;
    if (!g || !rb) return;
    rb.setNextKinematicTranslation({ x: g.position.x, y: g.position.y + y, z: g.position.z });
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} canSleep={false}>
      <CapsuleCollider args={[0.42, 0.34]} />
    </RigidBody>
  );
}
