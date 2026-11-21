/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { useMemo } from "react";
import { WARUNG_LOTS } from "@/game/warung/lots";
import { useWarung } from "@/game/warung/store";
import { ArchitectureBatch } from "./ArchitectureBatch";
import { cityArchitecture } from "./city-architecture";
import type { BuildingLot as Lot } from "./outdoor-layout";

const WARUNG_LOT_INDEX = new Map(WARUNG_LOTS.map((l, i) => [l.id, i]));

/** Indonesian shop-houses and homes; house lots occupied by a player's warung are replaced by WarungLots. */
export function BuildingLot({ lot, label = lot.label }: { lot: Lot; label?: string }) {
  const warungIdx = WARUNG_LOT_INDEX.get(lot.id) ?? -1;
  const occupiedByWarung = useWarung(
    (s) => warungIdx >= 0 && s.lots.some((c) => c.lot === warungIdx),
  );
  const parts = useMemo(() => cityArchitecture({ ...lot, label }), [lot, label]);
  if (occupiedByWarung) return null;

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
