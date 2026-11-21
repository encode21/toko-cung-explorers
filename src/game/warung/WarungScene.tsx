/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { useWarung } from "./store";
import { warungOrigin, type PublicWarung, type WarungItem } from "./model";

const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
): AssetPart => ({ p, s, color, shape: "bevel", finish: "paint" });

// Wall / awning colors grow with the warung level (Gerobak → Minimarket).
const LEVEL_LOOK = [
  { wall: "#e9d6b0", awning: "#e0623d" },
  { wall: "#f1e2bf", awning: "#3fa7c9" },
  { wall: "#f4e8cc", awning: "#59b36a" },
  { wall: "#f7efdc", awning: "#d24a5c" },
  { wall: "#fbf6ea", awning: "#2f7fd0" },
];
const SHELF_X = [-4, 0, 4];
const CUSTOMERS = ["npc-shopper-1", "npc-shopper-2", "npc-shopper-3", "npc-pedestrian-1"];

function roomParts(level: number): AssetPart[] {
  const look = LEVEL_LOOK[Math.min(level, 5) - 1]!;
  return [
    part([0, -0.2, 0], [12, 0.4, 10], "#cdb89a"),
    part([-6, 1.8, 0], [0.3, 3.6, 10], look.wall),
    part([6, 1.8, 0], [0.3, 3.6, 10], look.wall),
    part([0, 1.8, -5], [12, 3.6, 0.3], look.wall),
    // Front wall with a door gap in the middle.
    part([-3.9, 1.8, 5], [4.2, 3.6, 0.3], look.wall),
    part([3.9, 1.8, 5], [4.2, 3.6, 0.3], look.wall),
    part([0, 3.75, 4.6], [12.4, 0.3, 1.2], look.awning),
    // Counter (etalase) the owner serves from.
    part([0, 0.5, -1], [4.4, 1, 0.9], "#9b6b45"),
    part([0, 1.05, -1], [4.6, 0.1, 1], "#d9c3a0"),
    ...SHELF_X.flatMap((x) => [
      part([x, 1.3, -4.5], [3, 2.6, 0.6], "#a77b52"),
      part([x, 0.55, -4.25], [2.9, 0.06, 0.5], "#c99a6a"),
      part([x, 1.25, -4.25], [2.9, 0.06, 0.5], "#c99a6a"),
      part([x, 1.95, -4.25], [2.9, 0.06, 0.5], "#c99a6a"),
    ]),
  ];
}

/** Each stocked item gets one shelf cell; box count shows how full that rack is. */
function productParts(
  w: PublicWarung,
  catalog: Map<string, WarungItem>,
  maxStock: number,
): AssetPart[] {
  const parts: AssetPart[] = [];
  w.stock
    .filter((s) => s.qty > 0)
    .slice(0, 9)
    .forEach((s, i) => {
      const x = SHELF_X[i % 3]!;
      const y = [0.75, 1.45, 2.15][Math.floor(i / 3)]!;
      const boxes = Math.max(1, Math.min(4, Math.ceil((s.qty / maxStock) * 4)));
      for (let b = 0; b < boxes; b++)
        parts.push(
          part(
            [x - 1.05 + b * 0.7, y, -4.2],
            [0.5, 0.36, 0.36],
            catalog.get(s.itemId)?.color ?? "#ccc",
          ),
        );
    });
  return parts;
}

export function WarungScene() {
  const w = useWarung((s) => s.inside);
  const data = useWarung((s) => s.data);
  const order = useWarung((s) => s.order);
  const catalog = useMemo(
    () => new Map((data?.catalog ?? []).map((i) => [i.id, i])),
    [data?.catalog],
  );
  const maxStock = data?.levels[String(w?.level ?? 1)]?.maxStock ?? 20;
  const room = useMemo(() => roomParts(w?.level ?? 1), [w?.level]);
  const products = useMemo(
    () => (w ? productParts(w, catalog, maxStock) : []),
    [w, catalog, maxStock],
  );
  if (!w) return null;
  const customer = CUSTOMERS[w.id % CUSTOMERS.length]!;
  return (
    <group position={warungOrigin(w.id)}>
      <StyledBatch items={room} />
      {products.length > 0 && <StyledBatch items={products} />}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[6, 0.2, 5]} position={[0, -0.2, 0]} />
        <CuboidCollider args={[0.15, 1.8, 5]} position={[-6, 1.8, 0]} />
        <CuboidCollider args={[0.15, 1.8, 5]} position={[6, 1.8, 0]} />
        <CuboidCollider args={[6, 1.8, 0.15]} position={[0, 1.8, -5]} />
        <CuboidCollider args={[2.1, 1.8, 0.15]} position={[-3.9, 1.8, 5]} />
        <CuboidCollider args={[2.1, 1.8, 0.15]} position={[3.9, 1.8, 5]} />
        {/* Door gap is blocked too: leaving goes through the HUD "Keluar" button. */}
        <CuboidCollider args={[1.95, 1.8, 0.15]} position={[0, 1.8, 5.3]} />
        <CuboidCollider args={[2.3, 0.55, 0.5]} position={[0, 0.55, -1]} />
        <CuboidCollider args={[6, 1.3, 0.35]} position={[0, 1.3, -4.5]} />
      </RigidBody>
      <Text
        position={[0, 3.2, -4.75]}
        fontSize={0.42}
        color="#6b4a33"
        maxWidth={9}
        textAlign="center"
      >
        {w.name}
      </Text>
      <Text position={[0, 2.75, -4.75]} fontSize={0.22} color="#8c6c52">
        {`${w.levelName}${w.ownerName ? ` · ${w.ownerName}` : ""}`}
      </Text>
      <Text position={[0, 3.2, 5.2]} rotation={[0, Math.PI, 0]} fontSize={0.3} color="#ffffff">
        PINTU · KELUAR
      </Text>
      {order && (
        <group position={[0, 0, 0.3]} rotation-y={Math.PI}>
          <BaseAvatarV2 avatar={NPC_AVATARS[customer]} animation="Idle" groundToWorld />
        </group>
      )}
    </group>
  );
}
