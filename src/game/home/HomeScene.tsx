/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { GAME_ASSETS } from "@/assets/game-assets";
import { Model } from "@/game/world/Model";
import { useProlog } from "@/game/prolog/store";
import { HOME_ORIGIN, HOME_ROOM, HOME_SPOTS } from "./model";
import { useHome } from "./store";

const { w, d, h } = HOME_ROOM;
type Box = { p: [number, number, number]; s: [number, number, number]; color: string };
// Door gap on the +z wall at HOME_SPOTS.door; window opening on the -z wall at HOME_SPOTS.window.
const WALLS: Box[] = [
  { p: [0, h / 2, -d / 2], s: [w, h, 0.2], color: "#d9ccb0" },
  { p: [-w / 2, h / 2, 0], s: [0.2, h, d], color: "#d4c6a8" },
  { p: [w / 2, h / 2, 0], s: [0.2, h, d], color: "#d4c6a8" },
  { p: [-1.1, h / 2, d / 2], s: [w - 2.2, h, 0.2], color: "#d9ccb0" },
  { p: [3.4, h / 2, d / 2], s: [1.2, h, 0.2], color: "#d9ccb0" },
  { p: [1.8, h - 0.4, d / 2], s: [2, 0.8, 0.2], color: "#d9ccb0" },
];
function Block({ p, s, color }: Box) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/** Placeholder geometry (kasur, foto, jendela) until real assets exist; kardus & perabot are Kenney GLBs. */
export function HomeScene() {
  const windowOpen = useHome((s) => s.windowOpen);
  const step = useProlog((s) => s.data?.step);
  const dusty = step === "wake" || step === "window";
  const [wx, wz] = HOME_SPOTS.window,
    [bx, bz] = HOME_SPOTS.box,
    [kx, kz] = HOME_SPOTS.bed;
  return (
    <group position={HOME_ORIGIN} name="HomeScene">
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#a27c58" />
      </mesh>
      {/* Teras outside the door, a hint of the gang. */}
      <mesh position={[0, -0.06, d / 2 + 2]}>
        <boxGeometry args={[w + 4, 0.1, 4]} />
        <meshStandardMaterial color="#8ca87b" />
      </mesh>
      {WALLS.map((b, i) => (
        <Block key={i} {...b} />
      ))}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, 0.05, d / 2]} position={[0, -0.05, 0]} />
        {WALLS.map((b, i) => (
          <CuboidCollider key={i} args={[b.s[0] / 2, b.s[1] / 2, b.s[2] / 2]} position={b.p} />
        ))}
        {/* Kasur & kardus block walking through them. */}
        <CuboidCollider args={[1, 0.3, 1.1]} position={[kx, 0.3, kz]} />
        <CuboidCollider args={[0.4, 0.3, 0.4]} position={[bx, 0.3, bz]} />
        {/* The door gap stays open; this stops walking past the teras. */}
        <CuboidCollider args={[w / 2 + 2, 2, 0.2]} position={[0, 2, d / 2 + 3.6]} />
      </RigidBody>
      {/* Jendela: two panes swing open. */}
      <group position={[wx, 1.5, -d / 2 + 0.12]}>
        <mesh>
          <boxGeometry args={[1.6, 1.2, 0.05]} />
          <meshStandardMaterial
            color={windowOpen ? "#fff3c4" : "#a9b8b5"}
            emissive={windowOpen ? "#ffe9a8" : "#000000"}
            emissiveIntensity={windowOpen ? 0.9 : 0}
          />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * (windowOpen ? 0.95 : 0.4), 0, windowOpen ? 0.35 : 0.04]}
            rotation-y={windowOpen ? side * -1.2 : 0}
          >
            <boxGeometry args={[0.78, 1.18, 0.05]} />
            <meshStandardMaterial color="#7b5a3c" transparent opacity={0.9} />
          </mesh>
        ))}
      </group>
      {/* Sinar pagi dari jendela. */}
      <mesh position={[wx + 0.4, 0.9, -d / 2 + 1.6]} rotation={[-0.75, 0.2, 0]}>
        <planeGeometry args={[1.5, 3.2]} />
        <meshBasicMaterial
          color="#fff2c2"
          transparent
          opacity={windowOpen ? 0.28 : 0.1}
          depthWrite={false}
        />
      </mesh>
      {dusty && (
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[w - 0.4, 2.6, d - 0.4]} />
          <meshBasicMaterial color="#e8dcc0" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      )}
      {/* Kardus "Barang Mbah". */}
      <Model url={GAME_ASSETS.boxOpen} height={0.6} position={[bx, 0, bz]} rotationY={0.4} />
      <Text position={[bx, 0.85, bz + 0.4]} fontSize={0.14} color="#3c2f22">
        Barang Mbah
      </Text>
      {/* Kasur (placeholder). */}
      <group position={[kx, 0, kz]}>
        <Block p={[0, 0.18, 0]} s={[1.9, 0.36, 2.1]} color="#6e4f35" />
        <Block p={[0, 0.42, 0.05]} s={[1.75, 0.16, 1.95]} color="#e8e1d2" />
        <Block p={[0, 0.56, -0.75]} s={[1.2, 0.14, 0.4]} color="#f6f2e6" />
        <Block p={[0, 0.52, 0.35]} s={[1.75, 0.08, 1.2]} color="#7d9bb3" />
      </group>
      {/* Foto Mbah di dinding (placeholder bingkai). */}
      <group position={[w / 2 - 0.12, 1.7, -1]} rotation-y={-Math.PI / 2}>
        <Block p={[0, 0, 0]} s={[0.7, 0.55, 0.04]} color="#5a3d24" />
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.58, 0.43]} />
          <meshStandardMaterial color="#c9b48d" />
        </mesh>
      </group>
      <Model
        url={GAME_ASSETS.desk}
        height={0.8}
        position={[2.9, 0, 1.2]}
        rotationY={-Math.PI / 2}
      />
      <Model
        url={GAME_ASSETS.radio}
        height={0.3}
        position={[2.9, 0.8, 1.2]}
        rotationY={-Math.PI / 2}
      />
      <Model url={GAME_ASSETS.shelfLow} height={1} position={[0.6, 0, -3.1]} />
      <Model url={GAME_ASSETS.doormat} height={0.03} position={[1.8, 0, 2.7]} />
      <Model url={GAME_ASSETS.plantSmall} height={0.5} position={[-3.5, 0, 3]} />
      <pointLight
        position={[0, 2.6, 0]}
        intensity={windowOpen ? 6 : 3}
        distance={9}
        color="#ffe6bf"
      />
    </group>
  );
}
