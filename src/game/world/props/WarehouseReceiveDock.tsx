/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { WORLD_WAREHOUSE_DOCK } from "@/game/world/landmarks";
import { useDungeon } from "@/game/dungeon/store";

/** Rear warehouse receiving mark for dungeon DELIVER `world-warehouse`. */
export function WarehouseReceiveDock() {
  const active = useDungeon((s) => {
    const i = s.data?.instance;
    const c = s.data?.config;
    if (!i || i.status !== "ACTIVE" || (i.realm ?? "DUNGEON") !== "WORLD" || !c) return false;
    const index = c.objectives.findIndex((o, n) => (i.progress[n] ?? 0) < o.required);
    return (index >= 0 ? c.objectives[index]?.target : undefined) === "world-warehouse";
  });

  return (
    <group position={WORLD_WAREHOUSE_DOCK} name="warehouse-receive-dock">
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.06, 1.6]} />
        <meshStandardMaterial color={active ? "#3d5c4a" : "#4a5560"} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.15, -0.55]} castShadow>
        <boxGeometry args={[1.8, 0.55, 0.1]} />
        <meshStandardMaterial color="#173746" roughness={0.5} />
      </mesh>
      <Text position={[0, 1.22, -0.61]} fontSize={0.14} color="#ffdf7d" anchorX="center" maxWidth={1.7}>
        PENERIMAAN GUDANG
      </Text>
      <Text position={[0, 1.05, -0.61]} fontSize={0.09} color="#fff6e6" anchorX="center" maxWidth={1.7}>
        TOKO CUNG · BELAKANG
      </Text>
      {active && (
        <mesh position={[0, 1.8, 0]}>
          <octahedronGeometry args={[0.2]} />
          <meshStandardMaterial color="#f6c453" emissive="#b97714" emissiveIntensity={0.5} />
        </mesh>
      )}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.1, 0.35, 0.15]} position={[0, 0.9, -0.55]} />
      </RigidBody>
    </group>
  );
}
