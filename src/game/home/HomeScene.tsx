/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { Plang } from "@/game/world/Plang";
import { useFrame, useThree } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { GAME_ASSETS } from "@/assets/game-assets";
import { Model } from "@/game/world/Model";
import { useProlog } from "@/game/prolog/store";
import { useGame } from "@/state/game-store";
import { HOME_BED, HOME_ORIGIN, HOME_ROOM, HOME_SPOTS } from "./model";
import { leaveHome, useHome } from "./store";
import { EntryRing } from "./EntryRing";

const { w, d, h } = HOME_ROOM;
const [doorX] = HOME_SPOTS.door;
const DOOR_W = 1.3;
const BACKDROP = "#2a1f18";
type Box = { p: [number, number, number]; s: [number, number, number]; color: string };
// Back (-z) and left (-x) walls stand full height; the front (+z) and right (+x) walls are low
// cut-aways for the dollhouse camera. The front wall has an open doorway: walking through it leaves.
const T = 0.3;
const frontLeft = doorX - DOOR_W / 2 + w / 2,
  frontRight = w / 2 - (doorX + DOOR_W / 2);
const WALLS: Box[] = [
  { p: [0, h / 2, -d / 2 - T / 2], s: [w + T * 2, h, T], color: "#e9d3a8" },
  { p: [-w / 2 - T / 2, h / 2, 0], s: [T, h, d], color: "#e2c99c" },
  { p: [w / 2 + T / 2, h / 2, 0], s: [T, h, d], color: "#e2c99c" },
  { p: [-w / 2 + frontLeft / 2, h / 2, d / 2 + T / 2], s: [frontLeft, h, T], color: "#e9d3a8" },
  { p: [w / 2 - frontRight / 2, h / 2, d / 2 + T / 2], s: [frontRight, h, T], color: "#e9d3a8" },
];
function cutaway(b: Box): Box {
  const front = b.p[2] > d / 2,
    right = b.p[0] > w / 2;
  if (!front && !right) return b;
  const low = 0.5;
  return { ...b, p: [b.p[0], low / 2, b.p[2]], s: [b.s[0], low, b.s[2]] };
}
function Block({ p, s, color }: Box) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
function Flat({
  p,
  s,
  color,
  y = 0.005,
}: {
  p: [number, number];
  s: [number, number];
  color: string;
  y?: number;
}) {
  return (
    <mesh position={[p[0], y, p[1]]} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={s} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
/** Lantai keramik: one 1 m tile with grout, repeated over the floor. */
function useTileTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "#cfc6b8";
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = "#b5ab9c";
    g.fillRect(0, 0, 64, 2);
    g.fillRect(0, 0, 2, 64);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(w, d);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}
/** The room is a world of its own: no sky or fog around it, just a warm dark surround. */
function Backdrop() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const background = scene.background,
      fog = scene.fog;
    scene.background = new THREE.Color(BACKDROP);
    scene.fog = null;
    return () => {
      scene.background = background;
      scene.fog = fog;
    };
  }, [scene]);
  return null;
}
/** Stepping past the doorway is the same as pressing "Keluar". */
function DoorwayExit() {
  useFrame(() => {
    const p = useGame.getState().playerPos;
    const local = p[2] - HOME_ORIGIN[2];
    if (local > d / 2 + 0.35 && Math.abs(p[0] - HOME_ORIGIN[0] - doorX) < DOOR_W) {
      const home = useHome.getState();
      if (home.inside && !home.leaving) void leaveHome();
    }
  });
  return null;
}

/** Placeholder geometry for perabot until real assets exist; kardus, meja, radio, tanaman are Kenney GLBs. */
export function HomeScene() {
  const windowOpen = useHome((s) => s.windowOpen);
  const step = useProlog((s) => s.data?.step);
  const tiles = useTileTexture();
  const dusty = step === "wake" || step === "window";
  const [wx] = HOME_SPOTS.window,
    [bx, bz] = HOME_SPOTS.box,
    [kx, kz] = HOME_SPOTS.bed;
  return (
    <>
      {/* World coordinates, so it sits outside the room group. */}
      <EntryRing
        position={[HOME_ORIGIN[0] + doorX, 0, HOME_ORIGIN[2] + d / 2 - 0.6]}
        label="Keluar rumah"
        onEnter={leaveHome}
      />
      <group position={HOME_ORIGIN} name="HomeScene">
        <Backdrop />
        <DoorwayExit />
        <mesh position={[0, -0.05, 0]} receiveShadow>
          <boxGeometry args={[w, 0.1, d]} />
          <meshStandardMaterial map={tiles} />
        </mesh>
        {/* Tanah & teras around the house so the room never floats in a void. */}
        <mesh position={[0, -0.12, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#4a3a2b" />
        </mesh>
        <mesh position={[doorX, -0.06, d / 2 + 1.4]}>
          <boxGeometry args={[3, 0.1, 2.2]} />
          <meshStandardMaterial color="#8a7f70" />
        </mesh>
        {WALLS.map((b, i) => (
          <Block key={i} {...cutaway(b)} />
        ))}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[w / 2, 0.05, d / 2]} position={[0, -0.05, 0]} />
          <CuboidCollider args={[2, 0.05, 1.5]} position={[doorX, -0.05, d / 2 + 1]} />
          {WALLS.map((b, i) => (
            <CuboidCollider key={i} args={[b.s[0] / 2, b.s[1] / 2, b.s[2] / 2]} position={b.p} />
          ))}
          {/* Perabot block walking through them. */}
          <CuboidCollider
            args={[HOME_BED.halfWidth, HOME_BED.top / 2, HOME_BED.halfDepth]}
            position={[kx, HOME_BED.top / 2, kz]}
          />
          <CuboidCollider args={[0.4, 0.3, 0.4]} position={[bx, 0.3, bz]} />
          <CuboidCollider args={[0.85, 1.1, 0.35]} position={[2.6, 1.1, -d / 2 + 0.4]} />
          <CuboidCollider args={[0.3, 0.3, 1]} position={[-w / 2 + 0.35, 0.3, 0.6]} />
          <CuboidCollider args={[0.35, 0.4, 0.6]} position={[-w / 2 + 0.45, 0.4, -2.8]} />
        </RigidBody>

        {/* Jendela + gorden: two panes swing open. */}
        <group position={[wx, 1.6, -d / 2 + 0.06]}>
          <mesh>
            <boxGeometry args={[1.8, 1.3, 0.05]} />
            <meshStandardMaterial
              color={windowOpen ? "#fff3c4" : "#a9b8b5"}
              emissive={windowOpen ? "#ffe9a8" : "#000000"}
              emissiveIntensity={windowOpen ? 0.9 : 0}
            />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * (windowOpen ? 1.05 : 0.45), 0, windowOpen ? 0.38 : 0.04]}
              rotation-y={windowOpen ? side * -1.2 : 0}
            >
              <boxGeometry args={[0.88, 1.28, 0.05]} />
              <meshStandardMaterial color="#7b5a3c" transparent opacity={0.9} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <Block
              key={`g${side}`}
              p={[side * 1.25, -0.2, 0.12]}
              s={[0.4, 1.9, 0.06]}
              color="#2f6fa8"
            />
          ))}
        </group>
        {/* Sinar pagi dari jendela, jatuh di lantai. */}
        <mesh position={[wx + 1, 0.02, -d / 2 + 2.6]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.4, 3.6]} />
          <meshBasicMaterial
            color="#fff2c2"
            transparent
            opacity={windowOpen ? 0.35 : 0.12}
            depthWrite={false}
          />
        </mesh>
        {dusty && (
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[w - 0.4, 2.6, d - 0.4]} />
            <meshBasicMaterial color="#e8dcc0" transparent opacity={0.08} depthWrite={false} />
          </mesh>
        )}

        {/* Tikar pandan di tengah. */}
        <Flat p={[-0.6, 0.9]} s={[4.2, 3.2]} color="#2f5d3a" y={0.004} />
        <Flat p={[-0.6, 0.9]} s={[4, 3]} color="#c9a25a" y={0.006} />
        {[-1.2, -0.6, 0, 0.6, 1.2].map((dz) => (
          <Flat key={dz} p={[-0.6, 0.9 + dz]} s={[4, 0.06]} color="#a98443" y={0.008} />
        ))}
        {/* Sajadah. */}
        <Flat p={[3.4, 1.2]} s={[1.2, 2]} color="#c8a24a" y={0.004} />
        <Flat p={[3.4, 1.2]} s={[1.05, 1.85]} color="#2f6b45" y={0.006} />
        <Flat p={[3.4, 0.75]} s={[0.5, 0.6]} color="#1f4a30" y={0.008} />

        {/* Kardus "Barang Mbah". */}
        <Model url={GAME_ASSETS.boxOpen} height={0.6} position={[bx, 0, bz]} rotationY={0.4} />
        <Plang
          mode="post"
          text="Barang Mbah"
          position={[bx, 0, bz + 0.4]}
          size={0.12}
          board="#5d4029"
          twoSided
        />
        {/* Kasur kayu menempel dinding belakang. */}
        <group position={[kx, 0, kz]}>
          <Block p={[0, 0.18, 0]} s={[1.9, 0.36, 2.1]} color="#6e4f35" />
          <Block p={[0, 0.6, -1.08]} s={[1.9, 0.9, 0.08]} color="#5d4029" />
          <Block p={[0, 0.42, 0.05]} s={[1.75, 0.16, 1.95]} color="#e8e1d2" />
          <Block p={[0, 0.56, -0.75]} s={[1.2, 0.14, 0.4]} color="#f6f2e6" />
          <Block p={[0, 0.52, 0.35]} s={[1.75, 0.08, 1.2]} color="#8c4a3a" />
        </group>
        {/* Lemari kayu. */}
        <group position={[2.6, 0, -d / 2 + 0.4]}>
          <Block p={[0, 1.1, 0]} s={[1.7, 2.2, 0.7]} color="#7a5232" />
          <Block p={[-0.42, 1.2, 0.36]} s={[0.78, 1.6, 0.03]} color="#8c6040" />
          <Block p={[0.42, 1.2, 0.36]} s={[0.78, 1.6, 0.03]} color="#8c6040" />
        </group>
        {/* Foto Mbah, kalender, jam dinding di dinding belakang. */}
        <group position={[-1.7, 1.85, -d / 2 + 0.03]}>
          <Block p={[0, 0, 0]} s={[0.7, 0.55, 0.04]} color="#5a3d24" />
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[0.58, 0.43]} />
            <meshStandardMaterial color="#c9b48d" />
          </mesh>
        </group>
        <group position={[1.4, 2, -d / 2 + 0.03]}>
          <Block p={[0, 0, 0]} s={[0.5, 0.7, 0.02]} color="#f4f1ea" />
          <Block p={[0, 0.22, 0.012]} s={[0.46, 0.2, 0.01]} color="#3f7a4d" />
        </group>
        <group position={[4.6, 2.2, -d / 2 + 0.04]} rotation-x={Math.PI / 2}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 24]} />
            <meshStandardMaterial color="#3a2a1d" />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.01, 24]} />
            <meshStandardMaterial color="#f7f3ea" />
          </mesh>
        </group>
        {/* Meja TV + TV di dinding kiri. */}
        <group position={[-w / 2 + 0.35, 0, 0.6]}>
          <Block p={[0, 0.3, 0]} s={[0.6, 0.6, 2]} color="#7a5232" />
          <Block p={[0.05, 0.95, 0]} s={[0.08, 0.7, 1.2]} color="#1d1f22" />
          <mesh position={[0.1, 0.95, 0]} rotation-y={Math.PI / 2}>
            <planeGeometry args={[1.1, 0.6]} />
            <meshStandardMaterial color="#27415a" emissive="#1b3550" emissiveIntensity={0.4} />
          </mesh>
        </group>
        {/* Meja kecil: radio & termos. */}
        <Model
          url={GAME_ASSETS.desk}
          height={0.8}
          position={[-w / 2 + 0.45, 0, -2.8]}
          rotationY={Math.PI / 2}
        />
        <Model
          url={GAME_ASSETS.radio}
          height={0.3}
          position={[-w / 2 + 0.45, 0.8, -2.6]}
          rotationY={Math.PI / 2}
        />
        <mesh position={[-w / 2 + 0.45, 1.0, -3.1]}>
          <cylinderGeometry args={[0.09, 0.09, 0.4, 12]} />
          <meshStandardMaterial color="#c7403a" />
        </mesh>
        <Model url={GAME_ASSETS.doormat} height={0.03} position={[doorX, 0, d / 2 - 0.5]} />
        <Model
          url={GAME_ASSETS.plantSmall}
          height={0.6}
          position={[-w / 2 + 0.5, 0, -d / 2 + 0.5]}
        />
        <Model url={GAME_ASSETS.plant} height={1.1} position={[w / 2 - 0.5, 0, -1.6]} />
        <pointLight
          position={[0, 2.6, 0]}
          intensity={windowOpen ? 8 : 4}
          distance={13}
          color="#ffe6bf"
        />
      </group>
    </>
  );
}
