/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useProfile } from "@/identity/profile-store";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { DungeonSceneV2 } from "./DungeonSceneV2";
import { DungeonStaff } from "./DungeonStaff";
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
const STONE = "#6b7781",
  STONE_DARK = "#4a5560",
  STONE_LIGHT = "#8794a0",
  ROOF = "#173746";
const stone = (
  p: [number, number, number],
  s: [number, number, number],
  color = STONE,
  shape: Shape = "bevel",
  finish: Finish = "concrete",
): AssetPart => ({ p, s, color, shape, finish });
// Local +Z is the street front. The keep fills partner lot 4 plus the empty grass around it
// (world x 27.5–42.5, z 26.9–43.5); the gate stays on the server-configured entrance.
const KEEP: AssetPart[] = [
  stone([0, 0.3, -2.2], [11.8, 0.6, 12.2], STONE_DARK),
  stone([0, 3.4, -2.2], [11, 6.2, 11.6]),
  stone([0, 6.6, -2.2], [11.4, 0.4, 12], STONE_DARK),
  // Battlements along the front and both sides.
  ...[-4.2, -2.8, 2.8, 4.2].map((x) => stone([x, 7.2, 3.3], [0.9, 0.9, 0.6], STONE_LIGHT)),
  ...[-6.4, -4.6, -2.8, -1, 0.8].flatMap((z) =>
    [-5.4, 5.4].map((x) => stone([x, 7.2, z], [0.6, 0.9, 0.9], STONE_LIGHT)),
  ),
  // Corner towers with conical roofs.
  ...[-1, 1].flatMap((s) => [
    stone([s * 5.7, 4.3, 3.1], [3.3, 8.6, 3.3], STONE_LIGHT, "cylinder"),
    stone([s * 5.7, 8.7, 3.1], [3.9, 0.7, 3.9], STONE_DARK, "cylinder"),
    stone([s * 5.7, 10.4, 3.1], [4.1, 2.8, 4.1], ROOF, "cone", "paint"),
    stone([s * 5.7, 3.7, -7.5], [2.8, 7.4, 2.8], STONE_LIGHT, "cylinder"),
    stone([s * 5.7, 7.5, -7.5], [3.3, 0.6, 3.3], STONE_DARK, "cylinder"),
    stone([s * 5.7, 8.9, -7.5], [3.5, 2.2, 3.5], ROOF, "cone", "paint"),
  ]),
  // Gatehouse, arch and raised portcullis.
  stone([0, 3.9, 3.9], [5.4, 7.8, 1.5], STONE_LIGHT),
  stone([0, 8, 3.9], [5.8, 0.5, 1.9], STONE_DARK),
  ...[-2.2, -0.75, 0.75, 2.2].map((x) => stone([x, 8.65, 4.4], [0.9, 0.8, 0.6], STONE_LIGHT)),
  stone([0, 1.55, 4.6], [3, 3.1, 0.2], "#0b1116", "box"),
  stone([0, 3.1, 4.62], [3.45, 3.3, 2.6], STONE_DARK, "arch"),
  ...[-1.5, 1.5].map((x) => stone([x, 1.55, 4.72], [0.5, 3.1, 0.4], STONE_DARK)),
  ...[-1, -0.5, 0, 0.5, 1].map((x) =>
    stone([x, 3.25, 4.78], [0.09, 1.1, 0.09], "#20262b", "cylinder", "metal"),
  ),
  stone([0, 3.1, 4.78], [2.5, 0.09, 0.09], "#20262b", "box", "metal"),
  // Worn blocks break up the flat walls.
  ...[
    [-4.1, 1.5],
    [-3.3, 4.6],
    [3.6, 2.4],
    [4.2, 5.2],
    [-4.4, 3.2],
    [3.2, 0.9],
  ].map(([x, y]) => stone([x!, y!, 3.62], [1.3, 0.6, 0.12], STONE_DARK)),
  ...[
    [-2.2, 5.6],
    [2.1, 6.9],
    [-2, 1],
    [2.2, 3.4],
  ].map(([x, y]) => stone([x!, y!, 4.67], [0.9, 0.45, 0.1], STONE)),
  // Steps, sign plaque, torch brackets and braziers.
  stone([0, 0.2, 5.3], [4.6, 0.4, 1.5], STONE_DARK),
  stone([0, 0.1, 6.2], [5.4, 0.2, 1.3], STONE_DARK),
  stone([0, 5.75, 4.68], [4.7, 1.5, 0.14], "#10181d", "bevel", "paint"),
  ...[-2.25, 2.25].flatMap((x) => [
    stone([x, 2.5, 4.8], [0.12, 0.7, 0.12], "#20262b", "cylinder", "metal"),
    stone([x, 2.9, 4.8], [0.3, 0.16, 0.3], "#20262b", "cone", "metal"),
    stone([x * 1.35, 0.55, 6.3], [0.9, 1.1, 0.9], STONE_DARK, "cylinder"),
    stone([x * 1.35, 1.15, 6.3], [1.15, 0.22, 1.15], "#20262b", "cylinder", "metal"),
  ]),
];
const FLAMES: [number, number, number, number][] = [
  [-2.25, 3.15, 4.8, 0.2],
  [2.25, 3.15, 4.8, 0.2],
  [-3.04, 1.5, 6.3, 0.42],
  [3.04, 1.5, 6.3, 0.42],
];
const SLITS: [number, number, number][] = [
  [-5.7, 5.2, 4.72],
  [5.7, 5.2, 4.72],
  [-5.7, 2.8, 4.72],
  [5.7, 2.8, 4.72],
  [-3.4, 4.9, 3.62],
  [3.4, 4.9, 3.62],
];
/** Stone keep on partner lot 4, widened into the grass around it; the gate is the entrance. */
export function PrincipalBuilding() {
  const accent = useDungeon((s) => s.data?.config.assets.primaryColor) ?? "#168b91";
  return (
    <group position={[35, 0, 35]} rotation-y={Math.PI} name="principal-dungeon">
      <StyledBatch items={KEEP} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[5.5, 3.5, 5.8]} position={[0, 3.5, -2.2]} />
        <CuboidCollider args={[2.7, 4, 0.5]} position={[0, 4, 4.1]} />
        {[-5.7, 5.7].flatMap((x) => [
          <CuboidCollider key={`f${x}`} args={[1.5, 4.3, 1.5]} position={[x, 4.3, 3.1]} />,
          <CuboidCollider key={`b${x}`} args={[1.3, 3.7, 1.3]} position={[x, 3.7, -7.5]} />,
        ])}
      </RigidBody>
      {/* Portal glow behind the portcullis and hanging banners take the dungeon's colour. */}
      <mesh position={[0, 1.5, 4.71]}>
        <planeGeometry args={[2.5, 3]} />
        <meshStandardMaterial color="#7fe3df" emissive={accent} emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[0, 3, 4.71]}>
        <circleGeometry args={[1.25, 20, 0, Math.PI]} />
        <meshStandardMaterial color="#7fe3df" emissive={accent} emissiveIntensity={1.1} />
      </mesh>
      {[-2.25, 2.25].map((x) => (
        <group key={x} position={[x, 5.2, 4.72]}>
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.7, 2, 0.05]} />
            <meshStandardMaterial color={accent} roughness={0.95} />
          </mesh>
          <mesh position={[0, -1.3, 0]} rotation-z={Math.PI / 4}>
            <boxGeometry args={[0.5, 0.5, 0.05]} />
            <meshStandardMaterial color={accent} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.25, 0.04]} rotation-z={Math.PI / 4}>
            <boxGeometry args={[0.26, 0.26, 0.03]} />
            <meshStandardMaterial color="#ffcc66" emissive="#ffcc66" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
      {FLAMES.map(([x, y, z, size]) => (
        <mesh key={`${x}${z}`} position={[x, y, z]} scale={[size, size * 1.7, size]}>
          <coneGeometry args={[1, 1, 7]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff7a1a" emissiveIntensity={2.2} />
        </mesh>
      ))}
      {SLITS.map(([x, y, z]) => (
        <mesh key={`${x}${y}`} position={[x, y, z]}>
          <boxGeometry args={[0.22, 0.9, 0.08]} />
          <meshStandardMaterial color="#ffd89a" emissive="#ffb347" emissiveIntensity={1.4} />
        </mesh>
      ))}
      <Sign position={[0, 6.05, 4.78]}>PRINCIPAL DUNGEON</Sign>
      <Sign position={[0, 5.42, 4.78]} color="#ffffff">
        DISTRIBUTION CENTER
      </Sign>
      <mesh position={[0, 4.3, 6.2]}>
        <octahedronGeometry args={[0.4]} />
        <meshStandardMaterial color="#ffcc66" emissive="#ffcc66" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.03, 8]} rotation-x={-Math.PI / 2}>
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
      <DungeonStaff legacy />
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
