/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { useMemo } from "react";
import { ArchitectureBatch } from "./ArchitectureBatch";
import { cityArchitecture } from "./city-architecture";
import type { BuildingLot as Lot } from "./outdoor-layout";

/** Indonesian shop-houses and homes share solid, unaltered lot footprints. */
export function BuildingLot({ lot, label = lot.label }: { lot: Lot; label?: string }) {
  const parts = useMemo(() => cityArchitecture({ ...lot, label }), [lot, label]);
  return (
    <group name={lot.id} position={[lot.x, 0, lot.z]} rotation-y={lot.rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[lot.width / 2, lot.height / 2, lot.depth / 2]}
          position={[0, lot.height / 2, 0]}
        />
      </RigidBody>
      <ArchitectureBatch items={parts.masonry} surface="masonry" />
      <ArchitectureBatch items={parts.trim} surface="trim" />
      <ArchitectureBatch items={parts.glazing} surface="glazing" />
      {parts.signs.map((sign, index) => (
        <Text
          key={index}
          position={sign.p}
          fontSize={sign.size}
          maxWidth={sign.width}
          color={sign.color}
        >
          {sign.text}
        </Text>
      ))}
    </group>
  );
}
