/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NpcLabel } from "@/game/world/NpcLabel";
import { SUPPLIER_TEMP_POST } from "@/game/world/landmarks";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { useDungeon } from "@/game/dungeon/store";

export { SUPPLIER_TEMP_POST };

function useSupplierObjectiveActive() {
  const data = useDungeon((s) => s.data);
  const i = data?.instance;
  const c = data?.config;
  if (!i || i.status !== "ACTIVE" || (i.realm ?? "DUNGEON") !== "WORLD" || !c) return false;
  const index = c.objectives.findIndex((o, n) => (i.progress[n] ?? 0) < o.required);
  const o = index >= 0 ? c.objectives[index] : undefined;
  return o?.target === "supplier-confirm";
}

/**
 * Temporary supplier booth west of Toko Cung.
 * Group yaw −90°: local +Z (desk / Bima facing) points toward store plaza (+X).
 */
export function SupplierTempPost() {
  const showBima = useSupplierObjectiveActive();

  return (
    <group
      position={SUPPLIER_TEMP_POST}
      rotation={[0, -Math.PI / 2, 0]}
      name="supplier-temp-post"
    >
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.35, 20]} />
        <meshStandardMaterial color="#6b7a62" roughness={0.95} />
      </mesh>
      {(
        [
          [-0.85, 0, -0.65],
          [0.85, 0, -0.65],
          [-0.85, 0, 0.65],
          [0.85, 0, 0.65],
        ] as [number, number, number][]
      ).map((p) => (
        <mesh key={p.join(",")} position={[p[0], 1.0, p[2]]} castShadow>
          <cylinderGeometry args={[0.045, 0.05, 2.0, 6]} />
          <meshStandardMaterial color="#5c4a38" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 2.05, 0]} castShadow>
        <boxGeometry args={[2.0, 0.07, 1.7]} />
        <meshStandardMaterial color="#2f7d59" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.7, 0.15]} castShadow>
        <boxGeometry args={[1.25, 0.09, 0.55]} />
        <meshStandardMaterial color="#c4a574" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.45, -0.85]} castShadow>
        <boxGeometry args={[1.55, 0.42, 0.07]} />
        <meshStandardMaterial color="#173746" roughness={0.55} />
      </mesh>
      <Text position={[0, 1.52, -0.9]} fontSize={0.13} color="#ffdf7d" anchorX="center" maxWidth={1.5}>
        POS SUPPLIER
      </Text>
      <Text position={[0, 1.36, -0.9]} fontSize={0.09} color="#fff6e6" anchorX="center" maxWidth={1.5}>
        SEMENTARA
      </Text>

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.65, 0.4, 0.3]} position={[0, 0.4, 0.15]} />
      </RigidBody>

      {showBima && (
        // Behind the desk (not inside it). Booth yaw maps local +Z → plaza; π flips GLB to +Z.
        <group position={[0, 0, -0.55]} rotation={[0, Math.PI, 0]}>
          <BaseAvatarV2
            avatar={{ ...DEFAULT_AVATAR, outfit: "driver", hair: "cap", outfitColor: "#3d6b52" }}
            speed={0}
          />
          <NpcLabel text="Bima · Supplier" />
        </group>
      )}
    </group>
  );
}
