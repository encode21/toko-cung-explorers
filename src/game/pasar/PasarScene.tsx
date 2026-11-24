/** @jsxImportSource @/game/jsx */
import { useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { SpeechBubble } from "@/game/net/PlayerChatBubble";
import { NpcLabel } from "@/game/world/NpcLabel";
import { Plang } from "@/game/world/Plang";
import { NPC_AVATARS } from "@/identity/characters";
import { useGame } from "@/state/game-store";
import { EXTRA_STALLS, KIOSKS, type Kiosk } from "./model";
import { usePasar } from "./store";

type P3 = [number, number, number];
const WOOD = "#9b6b3f",
  DARK = "#5a3922",
  AWNINGS = [
    "#c4553d",
    "#3d8fb8",
    "#e8a33d",
    "#5a9a4a",
    "#9a5ab0",
    "#d9738a",
    "#2f8f8a",
    "#c9a227",
  ];

const Ball = ({ p, r, c }: { p: P3; r: number; c: string }) => (
  <mesh position={p} castShadow>
    <sphereGeometry args={[r, 10, 8]} />
    <meshStandardMaterial color={c} roughness={0.7} />
  </mesh>
);
const Box = ({ p, s, c, ry = 0 }: { p: P3; s: P3; c: string; ry?: number }) => (
  <mesh position={p} rotation-y={ry} castShadow>
    <boxGeometry args={s} />
    <meshStandardMaterial color={c} roughness={0.8} />
  </mesh>
);
const Cyl = ({ p, r, h, c }: { p: P3; r: number; h: number; c: string }) => (
  <mesh position={p} castShadow>
    <cylinderGeometry args={[r, r, h, 12]} />
    <meshStandardMaterial color={c} roughness={0.7} />
  </mesh>
);
/** Triangular heap of balls (rows of 3, 2, 1) centred on `at`. */
const Pyramid = ({ at, r, c }: { at: P3; r: number; c: string }) => (
  <group position={at}>
    {[-1, 0, 1].map((i) => (
      <Ball key={i} p={[i * r * 2, r, 0]} r={r} c={c} />
    ))}
    {[-0.5, 0.5].map((i) => (
      <Ball key={i} p={[i * r * 2, r * 2.6, 0]} r={r} c={c} />
    ))}
    <Ball p={[0, r * 4.2, 0]} r={r} c={c} />
  </group>
);
/** Round basket heaped with balls. */
const Basket = ({ at, c, r = 0.09 }: { at: P3; c: string; r?: number }) => (
  <group position={at}>
    <Cyl p={[0, 0.1, 0]} r={0.28} h={0.2} c="#b98a4e" />
    {[
      [-0.1, 0],
      [0.1, 0.05],
      [0, -0.1],
      [0, 0.1],
      [0.05, 0],
    ].map(([x, z], i) => (
      <Ball key={i} p={[x!, 0.24 + (i % 2) * 0.05, z!]} r={r} c={c} />
    ))}
  </group>
);
const Crate = ({ at, c }: { at: P3; c?: string }) => (
  <group position={at}>
    <Box p={[0, 0.22, 0]} s={[0.6, 0.44, 0.5]} c="#c8a063" />
    {c && <Basket at={[0, 0.4, 0]} c={c} r={0.07} />}
  </group>
);

/** What lies on the table (local y 1.0 = tabletop). */
function Goods({ kind }: { kind: string }) {
  const T = 1.0;
  switch (kind) {
    case "gorengan":
      return (
        <group position={[0, T, 0]}>
          <Cyl p={[-0.8, 0.15, 0]} r={0.22} h={0.3} c="#3a3a3a" />
          <mesh position={[-0.8, 0.45, 0]} castShadow>
            <sphereGeometry args={[0.4, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#222" metalness={0.5} roughness={0.5} side={2} />
          </mesh>
          <Cyl p={[-0.8, 0.5, 0]} r={0.34} h={0.02} c="#e0a52a" />
          <Box p={[0.55, 0.3, 0]} s={[1.3, 0.6, 0.7]} c="#cfe8f0" />
          {[-0.2, 0.2, 0.55, 0.9].map((x, i) => (
            <Ball
              key={i}
              p={[x + 0.1, 0.65, (i % 2) * 0.15 - 0.08]}
              r={0.12}
              c={["#d99a2b", "#e8b84a", "#c98322", "#e8b84a"][i]!}
            />
          ))}
        </group>
      );
    case "martabak":
      return (
        <group position={[0, T, 0]}>
          <Box p={[-0.7, 0.25, 0]} s={[0.9, 0.5, 0.8]} c="#555" />
          <Cyl p={[-0.7, 0.53, 0]} r={0.38} h={0.06} c="#1d1d1d" />
          <Cyl p={[-0.7, 0.6, 0]} r={0.3} h={0.05} c="#e3b040" />
          {[0, 1, 2].map((i) => (
            <Box key={i} p={[0.55, 0.06 + i * 0.12, 0]} s={[0.7, 0.12, 0.7]} c="#f4efe2" />
          ))}
          <Cyl p={[1.15, 0.2, 0.1]} r={0.2} h={0.4} c="#e8c06a" />
        </group>
      );
    case "buah":
      return (
        <group position={[0, T, 0]}>
          <Pyramid at={[-1, 0, 0]} r={0.12} c="#e87a1d" />
          <Pyramid at={[0.1, 0, 0.05]} r={0.12} c="#d8413a" />
          <Pyramid at={[1.05, 0, 0]} r={0.12} c="#e8b82a" />
          <Box p={[0.55, 0.05, 0.3]} s={[0.5, 0.08, 0.2]} c="#f2d34a" ry={0.2} />
          <Box p={[-0.5, 0.05, 0.3]} s={[0.45, 0.08, 0.18]} c="#f2d34a" ry={-0.3} />
        </group>
      );
    case "ikan":
      return (
        <group position={[0, T, 0]}>
          <Box p={[-0.6, 0.06, 0]} s={[1.2, 0.12, 0.8]} c="#d6ecf5" />
          {[-1, -0.7, -0.4, -0.1].map((x, i) => (
            <mesh
              key={i}
              position={[x, 0.17, (i % 2) * 0.2 - 0.1]}
              scale={[1, 0.45, 0.5]}
              rotation-y={0.3 * (i - 1.5)}
              castShadow
            >
              <sphereGeometry args={[0.17, 10, 8]} />
              <meshStandardMaterial
                color={["#9db4c0", "#c0c8cc", "#8aa0ae", "#b4c2c8"][i]!}
                metalness={0.4}
                roughness={0.35}
              />
            </mesh>
          ))}
          <Cyl p={[0.4, 0.04, 0]} r={0.2} h={0.08} c="#777" />
          <Box p={[0.4, 0.3, 0]} s={[0.06, 0.5, 0.06]} c="#777" />
          <Box p={[0.4, 0.55, 0]} s={[0.6, 0.04, 0.05]} c="#999" />
          <Cyl p={[1.15, 0.2, 0.1]} r={0.2} h={0.4} c="#2f6fb0" />
        </group>
      );
    case "telur":
      return (
        <group position={[0, T, 0]}>
          {[-0.8, 0, 0.8].map((x) => (
            <group key={x}>
              <Box p={[x, 0.04, 0]} s={[0.7, 0.08, 0.5]} c="#c9b28a" />
              {[-0.2, 0, 0.2].map((e) => (
                <Ball key={e} p={[x + e, 0.14, 0]} r={0.08} c="#f2e3c4" />
              ))}
            </group>
          ))}
        </group>
      );
    case "beras":
      return (
        <group position={[0, T, 0]}>
          {[-0.9, 0, 0.9].map((x, i) => (
            <Box
              key={x}
              p={[x, 0.22, 0]}
              s={[0.6, 0.44, 0.4]}
              c={["#e6d8b4", "#d8c79a", "#efe3c4"][i]!}
              ry={0.1 * i}
            />
          ))}
        </group>
      );
    case "bumbu":
      return (
        <group position={[0, T, 0]}>
          <Basket at={[-0.9, 0, 0]} c="#d8413a" />
          <Basket at={[-0.2, 0, 0]} c="#7aa63a" />
          <Basket at={[0.5, 0, 0]} c="#e8d9a0" />
          <Basket at={[1.1, 0, 0]} c="#7b3a6a" r={0.08} />
        </group>
      );
    default:
      return (
        <group position={[0, T, 0]}>
          <Basket at={[-0.9, 0, 0]} c="#4f9a3d" r={0.11} />
          <Basket at={[-0.1, 0, 0]} c="#d8413a" />
          <Basket at={[0.7, 0, 0]} c="#e8872a" />
        </group>
      );
  }
}

/** One wooden stall: table, posts, striped awning, crates, goods and a name board. Local +z is the customer side. */
function Stall({
  x,
  z,
  facing,
  label,
  goods,
  tone,
}: {
  x: number;
  z: number;
  facing: number;
  label: string;
  goods: string;
  tone: number;
}) {
  const awning = AWNINGS[tone % AWNINGS.length]!;
  return (
    <group position={[x, 0, z]} rotation-y={facing}>
      <Box p={[0, 0.5, 0]} s={[3.2, 1, 1.2]} c={WOOD} />
      <Box p={[0, 1.02, 0]} s={[3.3, 0.06, 1.3]} c="#b88550" />
      {[-1.65, 1.65].flatMap((px) =>
        [0.85, -0.6].map((pz) => (
          <Box key={`${px}${pz}`} p={[px, 1.2, pz]} s={[0.08, 2.4, 0.08]} c={DARK} />
        )),
      )}
      {/* Striped cloth awning, tilted down toward the customer. */}
      <group position={[0, 2.35, 0.1]} rotation-x={0.14}>
        {Array.from({ length: 8 }, (_, i) => (
          <Box
            key={i}
            p={[-1.75 + i * 0.5, 0, 0]}
            s={[0.5, 0.05, 2.1]}
            c={i % 2 ? "#f5efe0" : awning}
          />
        ))}
      </group>
      <Box p={[0, 2.22, 1.15]} s={[3.6, 0.22, 0.04]} c={awning} />
      <Goods kind={goods} />
      <Crate at={[-2.1, 0, 0.1]} c="#e8872a" />
      <Crate at={[-2.1, 0.44, 0.1]} />
      <Crate at={[2.1, 0, 0.1]} c="#7aa63a" />
      <Basket at={[2.1, 0.44, 0.1]} c="#d8413a" />
      <Plang text={label} position={[0, 1.75, 1.3]} size={0.2} board={DARK} textColor="#ffe9b8" />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.6, 0.5, 0.6]} position={[0, 0.5, 0]} />
      </RigidBody>
    </group>
  );
}

/** Standing vendor: idles, waves or talks now and then, never moves. Barks in a speech bubble after a sale. */
function Vendor({ k }: { k: Kiosk }) {
  const animation = useRef<AvatarAnimation | undefined>("Idle");
  const [say, setSay] = useState<string | null>(null);
  const bark = usePasar((s) => s.bark);
  const open = usePasar((s) => s.open);
  useFrame(({ clock }) => {
    const p = useGame.getState().playerPos;
    const near = Math.hypot(p[0] - k.table[0], p[2] - k.table[1]) < 7;
    const talking = bark?.kiosk === k.id && bark.until > Date.now();
    const text = talking ? bark.text : null;
    if (text !== say) setSay(text);
    const phase = Math.floor(clock.elapsedTime / 4 + k.table[0]) % 3;
    animation.current = talking || open === k.id ? "Talk" : near && phase === 0 ? "Wave" : "Idle";
  });
  // Behind the table, facing the customer lane.
  const dz = k.facing === 0 ? -1.5 : 1.5;
  return (
    <group position={[k.table[0], 0, k.table[1] + dz]} rotation-y={k.facing}>
      <BaseAvatarV2 avatar={NPC_AVATARS[k.vendorId]!} animation={animation} playerAvatar />
      <NpcLabel text={k.name} />
      {say && <SpeechBubble senderId={k.vendorId} text={say} height={2.3} />}
    </group>
  );
}

export function PasarScene(): ReactNode {
  const stalls = [
    ...KIOSKS.map((k) => ({
      x: k.table[0],
      z: k.table[1],
      facing: k.facing,
      label: k.name.toUpperCase(),
      goods: k.id,
    })),
    ...EXTRA_STALLS,
  ];
  return (
    <group>
      {stalls.map((s, i) => (
        <Stall key={i} {...s} tone={i} />
      ))}
      {KIOSKS.map((k) => (
        <Vendor key={k.id} k={k} />
      ))}
    </group>
  );
}
