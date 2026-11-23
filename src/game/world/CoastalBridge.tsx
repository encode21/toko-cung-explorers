/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { ArchitectureBatch } from "./ArchitectureBatch";
import { bridgeParts } from "./bridges";

export function CoastalBridge({ length }: { length: number }) {
  const parts = useMemo(() => bridgeParts(length), [length]);
  return (
    <group name="CoastalBridge">
      <ArchitectureBatch items={parts.stone} surface="masonry" />
      <ArchitectureBatch items={parts.iron} surface="trim" />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[5.6, 0.3, length / 2 + 0.2]} position={[0, -0.35, length / 2]} />
        {[-5.5, 5.5].map((x) => (
          <CuboidCollider key={x} args={[0.08, 0.6, length / 2]} position={[x, 0.65, length / 2]} />
        ))}
        {[12, 52].flatMap((z) =>
          [-6.9, 6.9].map((x) => (
            <CuboidCollider key={`${x}:${z}`} args={[1.55, 7.7, 2.05]} position={[x, 2.7, z]} />
          )),
        )}
        {Array.from({ length: Math.floor(length / 20) + 1 }, (_, i) =>
          [-4.3, 4.3].map((x) => (
            <CuboidCollider
              key={`${x}:${i}`}
              args={[0.7, 2.15, 0.95]}
              position={[x, -2.9, i * 20]}
            />
          )),
        )}
      </RigidBody>
    </group>
  );
}
