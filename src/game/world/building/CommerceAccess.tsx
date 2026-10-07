/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Box } from "../RetailFixtures";
import { OutdoorBatch, type OutdoorPart } from "../OutdoorBatch";
import { FLOORS, LIFT, WORLD_POINTS } from "./plan";

const loading: OutdoorPart[] = [];
for (const x of [-6, 6]) {
  for (const side of [-1, 1])
    loading.push({ p: [x + side * 1.5, 0.09, -26], s: [0.08, 0.02, 4], color: "#efc35a" });
  loading.push({ p: [x, 0.09, -24], s: [3, 0.02, 0.08], color: "#efc35a" });
}
for (let z = -27.5; z < -22; z += 0.7)
  loading.push({ p: [0, 0.095, z], s: [2.6, 0.02, 0.2], color: "#e8d5a2" });

export function CommerceAccess() {
  return (
    <group name="CommerceAccess">
      <group name="LiftCore" position={LIFT}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[1.25, 1.5, 1]} position={[0, 1.5, 0]} />
        </RigidBody>
        <Box p={[0, 1.5, 0]} s={[2.5, 3, 2]} color="#59656b" />
        <Box p={[0, 1.25, 1.02]} s={[1.8, 2.4, 0.04]} color="#abb8bd" />
        <Box p={[0, 1.25, 1.05]} s={[0.035, 2.4, 0.02]} color="#3e4d54" />
        <Text position={[0, 2.7, 1.06]} fontSize={0.15} color="#ffffff">
          LIFT · 02 / 03
        </Text>
        <Text position={[0, 1.65, 1.06]} fontSize={0.12} color="#283b42">
          SEGERA HADIR
        </Text>
      </group>
      <group position={[2.7, 0, 5]} name="FloorDirectory">
        <Box p={[0, 1.2, 0]} s={[1.65, 1.8, 0.15]} color="#33494f" />
        <Box p={[0, 0.2, 0]} s={[0.18, 0.4, 0.18]} color="#33494f" />
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.825, 1.05, 0.075]} position={[0, 1.05, 0]} />
        </RigidBody>
        <Text position={[0, 1.87, 0.09]} fontSize={0.17} color="#ffffff">
          TOKO CUNG
        </Text>
        {FLOORS.map((floor, i) => (
          <Text
            key={floor.id}
            position={[0, 1.48 - i * 0.3, 0.09]}
            fontSize={0.095}
            color={i ? "#c8d1d3" : "#f4cc68"}
          >
            {floor.label}
          </Text>
        ))}
        <Text position={[0, 0.47, 0.09]} fontSize={0.085} color="#f4cc68">
          02 / 03 · SEGERA HADIR
        </Text>
      </group>
      <OutdoorBatch items={loading} shadows={false} />
      <Text position={[-6, 0.12, -26]} rotation-x={-Math.PI / 2} fontSize={0.3} color="#ffdf84">
        BONGKAR MUAT
      </Text>
      <Text position={[6, 0.12, -26]} rotation-x={-Math.PI / 2} fontSize={0.3} color="#ffdf84">
        VAN · DELIVERY
      </Text>
      <Text position={[0, 2.65, -22.2]} rotation-y={Math.PI} fontSize={0.22} color="#ffffff">
        GUDANG · AKSES LOADING
      </Text>
      {WORLD_POINTS.map((point) => (
        <mesh
          key={point.id}
          name={`marker-${point.id}`}
          position={[point.position[0], 0.11, point.position[2]]}
          rotation-x={-Math.PI / 2}
        >
          <ringGeometry args={[0.36, 0.44, 16]} />
          <meshBasicMaterial color="#e5b34f" />
        </mesh>
      ))}
    </group>
  );
}
