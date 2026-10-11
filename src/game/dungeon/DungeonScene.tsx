/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useProfile } from "@/identity/profile-store";
import { DungeonSceneV2 } from "./DungeonSceneV2";
import { useDungeon } from "./store";
function Box({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}
function Sign({
  position,
  children,
  color = "#ffcc66",
}: {
  position: [number, number, number];
  children: string;
  color?: string;
}) {
  return (
    <Text
      position={position}
      fontSize={0.4}
      color={color}
      maxWidth={8}
      textAlign="center"
      outlineWidth={0.015}
      outlineColor="#122c35"
    >
      {children}
    </Text>
  );
}
/** Existing partner lot 4; its dimensions and neighboring buildings stay intact. */
export function PrincipalBuilding() {
  const config = useDungeon((s) => s.data?.config);
  return (
    <group position={[35, 0, 35]}>
      <Box
        position={[0, 2.7, 0]}
        size={[8, 5.4, 7]}
        color={config?.assets.primaryColor ?? "#168b91"}
      />
      <Box position={[0, 4.4, -3.6]} size={[8.5, 1.5, 0.3]} color="#173746" />
      <group rotation-y={Math.PI}>
        <Sign position={[0, 4.6, 3.8]}>PRINCIPAL DUNGEON</Sign>
        <Sign position={[0, 3.95, 3.8]} color="#ffffff">
          DISTRIBUTION CENTER
        </Sign>
      </group>
      <mesh position={[0, 1.3, -3.6]}>
        <boxGeometry args={[2.4, 2.6, 0.12]} />
        <meshStandardMaterial color="#7fe3df" emissive="#168b91" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 2.5, -6]}>
        <octahedronGeometry args={[0.4]} />
        <meshStandardMaterial color="#ffcc66" emissive="#ffcc66" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.03, -7]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.3, 1.6, 32]} />
        <meshStandardMaterial color="#ffcc66" />
      </mesh>
    </group>
  );
}
export function DungeonScene() {
  const data = useDungeon((s) => s.data);
  if (!data?.instance) return null;
  if ((data.config.version ?? 1) >= 2) return <DungeonSceneV2 />;
  const { config: c, instance: i } = data;
  return (
    <group>
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 12, 8]} intensity={1.8} />
      <RigidBody type="fixed" colliders={false} userData={{ cameraPassThrough: true }}>
        <mesh position={[0, -0.15, 0]} receiveShadow>
          <boxGeometry args={[24, 0.3, 24]} />
          <meshStandardMaterial color="#405765" />
        </mesh>
        <CuboidCollider args={[12, 0.15, 12]} position={[0, -0.15, 0]} />
        <CuboidCollider args={[0.3, 3, 12]} position={[-12, 3, 0]} />
        <CuboidCollider args={[0.3, 3, 12]} position={[12, 3, 0]} />
        <CuboidCollider args={[12, 3, 0.3]} position={[0, 3, -12]} />
        <CuboidCollider args={[12, 3, 0.3]} position={[0, 3, 12]} />
      </RigidBody>
      <Box position={[0, 2.5, -12]} size={[24, 5, 0.3]} color="#203e4d" />
      <Box position={[-12, 1.2, 0]} size={[0.3, 2.4, 24]} color="#203e4d" />
      <Box position={[12, 1.2, 0]} size={[0.3, 2.4, 24]} color="#203e4d" />
      <Sign position={[0, 4, -11.7]}>KIRIMAN YANG HILANG</Sign>
      <Sign position={[-7, 3, -9]}>B · STORAGE</Sign>
      <Sign position={[7, 3, -6]}>C · PROMO</Sign>
      <Sign position={[8, 2.8, 8]}>D · DISPATCH</Sign>
      <Sign position={[0, 2.4, 7]}>A · BRIEFING</Sign>
      {[-9, -5].flatMap((x) =>
        [-5, 3].map((z) => (
          <group key={`${x}-${z}`}>
            <Box position={[x, 0.65, z]} size={[2, 1.3, 2]} color="#a78660" />
            <Box position={[x, 1.65, z]} size={[1.5, 0.7, 1.5]} color="#c3a276" />
          </group>
        )),
      )}
      <Box position={[8, 0.4, 9]} size={[4, 0.8, 2]} color={c.assets.primaryColor} />
      <Box position={[0, 0.6, -9]} size={[2, 1.2, 1]} color={c.assets.primaryColor} />
      <mesh position={[0, 1.4, -8.8]} rotation-x={-0.3}>
        <boxGeometry args={[1.4, 0.8, 0.12]} />
        <meshStandardMaterial
          color={i.status === "COMPLETED" ? "#8cf5ac" : "#ffcc66"}
          emissive="#669988"
          emissiveIntensity={0.4}
        />
      </mesh>
      {c.objectives[1]?.positions?.map(
        (p, n) =>
          !i.found.includes(`clue-${n}`) && (
            <mesh key={n} position={[p[0], 0.4, p[2]]}>
              <boxGeometry args={[0.45, 0.65, 0.12]} />
              <meshStandardMaterial color="#ffcc66" />
            </mesh>
          ),
      )}
      {!i.progress[2] && (
        <Box position={[7, 0.4, -5]} size={[0.8, 0.8, 0.8]} color={c.assets.secondaryColor} />
      )}
      {!i.easterEgg && (
        <mesh position={[-10, 0.3, 9]}>
          <octahedronGeometry args={[0.22]} />
          <meshStandardMaterial color="#dfb32a" />
        </mesh>
      )}
      <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1, 17]} />
        <meshStandardMaterial color={c.assets.primaryColor} />
      </mesh>
    </group>
  );
}
export function DungeonParcel({ playerId }: { playerId?: string | undefined } = {}) {
  const localId = useProfile((s) => s.profile?.id);
  const carrying = useDungeon(
    (s) => !!s.data?.instance?.carrierId && s.data.instance.carrierId === (playerId ?? localId),
  );
  if (!carrying) return null;
  return (
    <mesh position={[0, 1, 0.5]}>
      <boxGeometry args={[0.45, 0.35, 0.4]} />
      <meshStandardMaterial color="#ffcc66" />
    </mesh>
  );
}
