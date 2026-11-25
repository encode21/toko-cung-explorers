/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { ArchitectureBatch } from "./ArchitectureBatch";
import { bridgeParts, bridgeSection } from "./bridges";

export function CoastalBridge({ length, roadWidth = 6.4 }: { length: number; roadWidth?: number }) {
  const parts = useMemo(() => bridgeParts(length, roadWidth), [length, roadWidth]);
  const section = bridgeSection(roadWidth);
  return (
    <group name="CoastalBridge">
      <ArchitectureBatch items={parts.stone} surface="masonry" />
      <ArchitectureBatch items={parts.iron} surface="trim" />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[section.deckHalf, 0.3, length / 2 + 0.2]}
          position={[0, -0.35, length / 2]}
        />
        {[-section.railX, section.railX].map((x) => (
          <CuboidCollider key={x} args={[0.08, 0.6, length / 2]} position={[x, 0.65, length / 2]} />
        ))}
        {[12, 52].flatMap((z) =>
          [-section.towerX, section.towerX].map((x) => (
            <CuboidCollider key={`${x}:${z}`} args={[1.55, 7.7, 2.05]} position={[x, 2.7, z]} />
          )),
        )}
        {Array.from({ length: Math.floor(length / 20) + 1 }, (_, i) =>
          [-section.pierX, section.pierX].map((x) => (
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
