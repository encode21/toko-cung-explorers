/** @jsxImportSource @/game/jsx */
import { useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { LodAvatar } from "@/game/npc/LodAvatar";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { SpeechBubble } from "@/game/net/PlayerChatBubble";
import { NpcLabel } from "@/game/world/NpcLabel";
import { Plang } from "@/game/world/Plang";
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

/** Every stall part lands in one of three instanced batches (was ~55 draw calls per stall). */
type Shape = "box" | "round" | "foliage";
type Part = OutdoorPart & { shape: Shape };
type Parts = Part[];
const add = (at: P3, parts: Parts) =>
  parts.map((it) => ({ ...it, p: [it.p[0] + at[0], it.p[1] + at[1], it.p[2] + at[2]] as P3 }));
const Ball = (p: P3, r: number, color: string): Part => ({
  shape: "foliage",
  p,
  s: [r * 2, r * 2, r * 2],
  color,
});
const Box = (p: P3, s: P3, color: string, ry = 0): Part => ({ shape: "box", p, s, color, ry });
const Cyl = (p: P3, r: number, h: number, color: string): Part => ({
  shape: "round",
  p,
  s: [r * 2, h, r * 2],
  color,
});
/** Triangular heap of balls (rows of 3, 2, 1) centred on `at`. */
const Pyramid = (at: P3, r: number, c: string) =>
  add(at, [
    ...[-1, 0, 1].map((i) => Ball([i * r * 2, r, 0], r, c)),
    ...[-0.5, 0.5].map((i) => Ball([i * r * 2, r * 2.6, 0], r, c)),
    Ball([0, r * 4.2, 0], r, c),
  ]);
/** Round basket heaped with balls. */
const Basket = (at: P3, c: string, r = 0.09) =>
  add(at, [
    Cyl([0, 0.1, 0], 0.28, 0.2, "#b98a4e"),
    ...[
      [-0.1, 0],
      [0.1, 0.05],
      [0, -0.1],
      [0, 0.1],
      [0.05, 0],
    ].map(([x, z], i) => Ball([x!, 0.24 + (i % 2) * 0.05, z!], r, c)),
  ]);
const Crate = (at: P3, c?: string) =>
  add(at, [
    Box([0, 0.22, 0], [0.6, 0.44, 0.5], "#c8a063"),
    ...(c ? Basket([0, 0.4, 0], c, 0.07) : []),
  ]);

/** What lies on the table (local y 1.0 = tabletop). */
function goods(kind: string): Parts {
  const T: P3 = [0, 1.0, 0];
  switch (kind) {
    case "gorengan":
      return add(T, [
        Cyl([-0.8, 0.15, 0], 0.22, 0.3, "#3a3a3a"),
        // Wok: a flattened dark bowl.
        { ...Ball([-0.8, 0.4, 0], 0.4, "#222"), s: [0.8, 0.3, 0.8] },
        Cyl([-0.8, 0.5, 0], 0.34, 0.02, "#e0a52a"),
        Box([0.55, 0.3, 0], [1.3, 0.6, 0.7], "#cfe8f0"),
        ...[-0.2, 0.2, 0.55, 0.9].map((x, i) =>
          Ball(
            [x + 0.1, 0.65, (i % 2) * 0.15 - 0.08],
            0.12,
            ["#d99a2b", "#e8b84a", "#c98322", "#e8b84a"][i]!,
          ),
        ),
      ]);
    case "martabak":
      return add(T, [
        Box([-0.7, 0.25, 0], [0.9, 0.5, 0.8], "#555"),
        Cyl([-0.7, 0.53, 0], 0.38, 0.06, "#1d1d1d"),
        Cyl([-0.7, 0.6, 0], 0.3, 0.05, "#e3b040"),
        ...[0, 1, 2].map((i) => Box([0.55, 0.06 + i * 0.12, 0], [0.7, 0.12, 0.7], "#f4efe2")),
        Cyl([1.15, 0.2, 0.1], 0.2, 0.4, "#e8c06a"),
      ]);
    case "buah":
      return add(T, [
        ...Pyramid([-1, 0, 0], 0.12, "#e87a1d"),
        ...Pyramid([0.1, 0, 0.05], 0.12, "#d8413a"),
        ...Pyramid([1.05, 0, 0], 0.12, "#e8b82a"),
        Box([0.55, 0.05, 0.3], [0.5, 0.08, 0.2], "#f2d34a", 0.2),
        Box([-0.5, 0.05, 0.3], [0.45, 0.08, 0.18], "#f2d34a", -0.3),
      ]);
    case "ikan":
      return add(T, [
        Box([-0.6, 0.06, 0], [1.2, 0.12, 0.8], "#d6ecf5"),
        ...[-1, -0.7, -0.4, -0.1].map((x, i): Part => ({
          ...Ball(
            [x, 0.17, (i % 2) * 0.2 - 0.1],
            0.17,
            ["#9db4c0", "#c0c8cc", "#8aa0ae", "#b4c2c8"][i]!,
          ),
          s: [0.34, 0.153, 0.17],
          ry: 0.3 * (i - 1.5),
        })),
        Cyl([0.4, 0.04, 0], 0.2, 0.08, "#777"),
        Box([0.4, 0.3, 0], [0.06, 0.5, 0.06], "#777"),
        Box([0.4, 0.55, 0], [0.6, 0.04, 0.05], "#999"),
        Cyl([1.15, 0.2, 0.1], 0.2, 0.4, "#2f6fb0"),
      ]);
    case "telur":
      return add(
        T,
        [-0.8, 0, 0.8].flatMap((x) => [
          Box([x, 0.04, 0], [0.7, 0.08, 0.5], "#c9b28a"),
          ...[-0.2, 0, 0.2].map((e) => Ball([x + e, 0.14, 0], 0.08, "#f2e3c4")),
        ]),
      );
    case "beras":
      return add(
        T,
        [-0.9, 0, 0.9].map((x, i) =>
          Box([x, 0.22, 0], [0.6, 0.44, 0.4], ["#e6d8b4", "#d8c79a", "#efe3c4"][i]!, 0.1 * i),
        ),
      );
    case "bumbu":
      return add(T, [
        ...Basket([-0.9, 0, 0], "#d8413a"),
        ...Basket([-0.2, 0, 0], "#7aa63a"),
        ...Basket([0.5, 0, 0], "#e8d9a0"),
        ...Basket([1.1, 0, 0], "#7b3a6a", 0.08),
      ]);
    default:
      return add(T, [
        ...Basket([-0.9, 0, 0], "#4f9a3d", 0.11),
        ...Basket([-0.1, 0, 0], "#d8413a"),
        ...Basket([0.7, 0, 0], "#e8872a"),
      ]);
  }
}

type StallSpec = { x: number; z: number; facing: number; label: string; goods: string };

/** One wooden stall: table, posts, striped awning, crates and goods, in world space. Local +z is the customer side. */
function stallParts({ x, z, facing, goods: kind }: StallSpec, tone: number): Parts {
  const awning = AWNINGS[tone % AWNINGS.length]!;
  const tilt = 0.14;
  const local: Parts = [
    Box([0, 0.5, 0], [3.2, 1, 1.2], WOOD),
    Box([0, 1.02, 0], [3.3, 0.06, 1.3], "#b88550"),
    ...[-1.65, 1.65].flatMap((px) =>
      [0.85, -0.6].map((pz) => Box([px, 1.2, pz], [0.08, 2.4, 0.08], DARK)),
    ),
    // Striped cloth awning, tilted down toward the customer.
    ...Array.from({ length: 8 }, (_, i): Part => ({
      ...Box([-1.75 + i * 0.5, 2.35, 0.1], [0.5, 0.05, 2.1], i % 2 ? "#f5efe0" : awning),
      rx: tilt,
    })),
    Box([0, 2.22, 1.15], [3.6, 0.22, 0.04], awning),
    ...goods(kind),
    ...Crate([-2.1, 0, 0.1], "#e8872a"),
    ...Crate([-2.1, 0.44, 0.1]),
    ...Crate([2.1, 0, 0.1], "#7aa63a"),
    ...Basket([2.1, 0.44, 0.1], "#d8413a"),
  ];
  // Facing is 0 or PI only, so turning a part is a mirror in x/z plus flipping its x tilt.
  const flip = Math.abs(facing) > 1 ? -1 : 1;
  return local.map((it) => ({
    ...it,
    p: [x + it.p[0] * flip, it.p[1], z + it.p[2] * flip],
    ry: (it.ry ?? 0) + facing,
    rx: (it.rx ?? 0) * flip,
  }));
}

function Stall({ x, z, facing, label }: StallSpec) {
  return (
    <group position={[x, 0, z]} rotation-y={facing}>
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
      {/* Light model from afar, Explorer twin up close (the pasar is in view from Toko Cung). */}
      <LodAvatar lodId={`pasar-${k.id}`} avatarId={k.vendorId} animation={animation} />
      <NpcLabel text={k.name} />
      {say && <SpeechBubble senderId={k.vendorId} text={say} height={2.3} />}
    </group>
  );
}

const STALLS: StallSpec[] = [
  ...KIOSKS.map((k) => ({
    x: k.table[0],
    z: k.table[1],
    facing: k.facing,
    label: k.name.toUpperCase(),
    goods: k.id,
  })),
  ...EXTRA_STALLS,
];
const PARTS = STALLS.flatMap((s, i) => stallParts(s, i));
const BATCHES = (["box", "round", "foliage"] as const).map(
  (shape) => [shape, PARTS.filter((it) => it.shape === shape)] as const,
);

export function PasarScene(): ReactNode {
  return (
    <group name="PasarScene">
      {BATCHES.map(([shape, items]) => (
        <OutdoorBatch key={shape} shape={shape} items={items} />
      ))}
      {STALLS.map((s, i) => (
        <Stall key={i} {...s} />
      ))}
      {KIOSKS.map((k) => (
        <Vendor key={k.id} k={k} />
      ))}
    </group>
  );
}
