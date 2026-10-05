/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { RetailShelf } from "./RetailShelf";
import { Refrigerator } from "./RetailFixtures";
import type { Category } from "./StoreProps";
import type { ShelfId, ShelfZone } from "./layout";
import { useGame } from "@/state/game-store";
const CATEGORY: Record<ShelfId, Category> = {
  "shelf-instant-noodle": "instant",
  "shelf-snack": "household",
  "shelf-drink": "drink",
  "shelf-fresh": "sembako",
};
/** Interaction ids and catalog remain stable; visuals and collider share one footprint. */
export function Shelf({ zone }: { zone: ShelfZone }) {
  const highlighted = useGame((s) => s.waypoint === zone.id || s.nearby?.id === zone.id);
  const height = zone.kind === "fridge" ? 2.1 : 1.7;
  return (
    <group position={zone.position} rotation-y={zone.rotationY}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.5, height / 2, 1.85]} position={[0, height / 2, 0]} />
      </RigidBody>
      {zone.kind === "fridge" ? (
        <Refrigerator />
      ) : (
        <RetailShelf category={CATEGORY[zone.id]} label={zone.label} highlight={highlighted} />
      )}
    </group>
  );
}
