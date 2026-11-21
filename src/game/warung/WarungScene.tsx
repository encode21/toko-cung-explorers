/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { Group, Mesh } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { useWarung } from "./store";
import {
  CUSTOMER_WALK_MS,
  LEVEL_LOOK,
  warungOrigin,
  type WarungItem,
  type WarungStock,
} from "./model";

const WALL_H = 5.2; // Matches the indoor camera ceiling so the lens stays inside the room.
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "bevel",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

const SHELF_X = [-4, 0, 4];
const SHELF_Y = [0.58, 1.28, 1.98];
const DOOR: [number, number, number] = [0, 0, 4.4];
const COUNTER_FRONT: [number, number, number] = [0, 0, 0.1];

function roomParts(level: number): AssetPart[] {
  const look = LEVEL_LOOK[Math.min(level, 5) - 1]!;
  const tiles: AssetPart[] = [];
  for (let x = 0; x < 6; x++)
    for (let z = 0; z < 5; z++)
      tiles.push(
        part(
          [-5 + x * 2, 0.01, -4 + z * 2],
          [1.98, 0.02, 1.98],
          (x + z) % 2 ? "#e9dcc4" : "#f6efe1",
          "box",
        ),
      );
  const sachets = ["#7a4b2a", "#c8642c", "#e2483d", "#f2c14e", "#3fa7c9"];
  return [
    part([0, -0.2, 0], [12, 0.4, 10], "#cdb89a"),
    ...tiles,
    part([-6, WALL_H / 2, 0], [0.3, WALL_H, 10], look.wall),
    part([6, WALL_H / 2, 0], [0.3, WALL_H, 10], look.wall),
    part([0, WALL_H / 2, -5], [12, WALL_H, 0.3], look.wall),
    part([-3.9, WALL_H / 2, 5], [4.2, WALL_H, 0.3], look.wall),
    part([3.9, WALL_H / 2, 5], [4.2, WALL_H, 0.3], look.wall),
    part([0, 4.1, 5], [3.6, 2.2, 0.3], look.wall),
    // Wainscot stripe in the level colour.
    part([0, 0.5, -4.82], [11.6, 1, 0.05], look.awning, "box"),
    part([-5.82, 0.5, 0], [0.05, 1, 9.6], look.awning, "box"),
    part([5.82, 0.5, 0], [0.05, 1, 9.6], look.awning, "box"),
    // Etalase: wooden base + glass case.
    part([0, 0.45, -1], [4.4, 0.9, 0.9], "#9b6b45", "bevel", "wood"),
    part([0, 1.2, -1], [4.4, 0.6, 0.85], "#bfe6f7", "box", "glass"),
    part([0, 1.52, -1], [4.5, 0.06, 0.95], "#d9c3a0", "box", "wood"),
    // Renceng sachets hanging above the counter: the most "warung" detail there is.
    part([0, 2.9, -1.3], [4.6, 0.06, 0.06], "#6b4a33", "cylinder", "metal"),
    ...[-2, -1.2, -0.4, 0.4, 1.2, 2].flatMap((x, i) =>
      Array.from({ length: 5 }, (_, j) =>
        part(
          [x, 2.7 - j * 0.26, -1.3],
          [0.26, 0.22, 0.03],
          sachets[(i + j) % sachets.length]!,
          "box",
          "plastic",
        ),
      ),
    ),
    ...SHELF_X.flatMap((x) => [
      part([x, 1.3, -4.5], [3, 2.6, 0.6], "#a77b52", "bevel", "wood"),
      ...SHELF_Y.map((y) => part([x, y - 0.03, -4.25], [2.9, 0.06, 0.5], "#c99a6a", "box", "wood")),
    ]),
    // Plastic stools for waiting customers and a door mat.
    part([-3.4, 0.25, 2.6], [0.45, 0.5, 0.45], "#e2483d", "cylinder", "plastic"),
    part([-2.6, 0.25, 3.2], [0.45, 0.5, 0.45], "#3fa7c9", "cylinder", "plastic"),
    part([0, 0.03, 4.3], [2, 0.03, 1], "#7c5a3c", "box", "fabric"),
    // Wall calendar.
    part([-5.8, 2.6, -2.5], [0.04, 0.9, 0.7], "#fffaf0", "box"),
    part([-5.78, 2.95, -2.5], [0.05, 0.2, 0.7], "#e2483d", "box"),
    ...(level >= 2
      ? [
          // Wall fan.
          part([5.75, 3.4, 0.5], [0.1, 0.9, 0.9], "#f4f4f4", "cylinder", "plastic"),
          part([5.68, 3.4, 0.5], [0.08, 0.3, 0.3], look.awning, "cylinder", "plastic"),
        ]
      : []),
    ...(level >= 3
      ? [
          // Drinks fridge with a glass door.
          part([5.2, 1.1, -2.6], [1, 2.2, 1], "#f4f4f4", "bevel", "plastic"),
          part([4.68, 1.15, -2.6], [0.04, 1.8, 0.8], "#bfe6f7", "box", "glass"),
          part([5.2, 2.3, -2.6], [1, 0.25, 1], "#e2483d", "bevel", "plastic"),
        ]
      : []),
    ...(level >= 4 ? [part([-5.2, 1.1, 0.5], [1, 2.2, 1.6], "#c99a6a", "bevel", "wood")] : []),
  ];
}

/** Product shapes by item id, so racks read as noodles, bottles, cups and sacks rather than boxes. */
function productShape(id: string, color: string, x: number, y: number, z: number): AssetPart[] {
  switch (id) {
    case "air-mineral":
    case "minyak":
      return [
        part([x, y + 0.2, z], [0.14, 0.4, 0.14], color, "cylinder", "plastic"),
        part(
          [x, y + 0.43, z],
          [0.07, 0.06, 0.07],
          id === "minyak" ? "#e2483d" : "#2f7fd0",
          "cylinder",
          "plastic",
        ),
      ];
    case "teh-gelas":
      return [part([x, y + 0.11, z], [0.18, 0.22, 0.18], color, "cylinder", "plastic")];
    case "kerupuk":
      return [
        part([x, y + 0.25, z], [0.38, 0.5, 0.38], "#d8dde3", "box", "glass"),
        part([x, y + 0.52, z], [0.4, 0.06, 0.4], "#e2483d", "box", "metal"),
      ];
    case "telur":
      return [
        part([x, y + 0.03, z], [0.4, 0.06, 0.3], "#c9a77a", "box", "cardboard"),
        part([x - 0.1, y + 0.1, z], [0.1, 0.12, 0.1], color, "sphere"),
        part([x + 0.1, y + 0.1, z], [0.1, 0.12, 0.1], color, "sphere"),
      ];
    case "gula":
    case "beras":
      return [part([x, y + 0.19, z], [0.3, 0.38, 0.2], color, "bevel", "fabric")];
    case "es-krim":
      return [
        part([x, y + 0.1, z], [0.1, 0.2, 0.1], "#e0a961", "cone"),
        part([x, y + 0.24, z], [0.14, 0.14, 0.14], color, "sphere"),
      ];
    case "sabun":
      return [part([x, y + 0.07, z], [0.3, 0.14, 0.18], color, "bevel", "cardboard")];
    default:
      // Packs (mi instan, kopi sachet): upright bevelled packets.
      return [part([x, y + 0.16, z], [0.36, 0.32, 0.1], color, "bevel", "plastic")];
  }
}

function productParts(
  stock: WarungStock[],
  catalog: Map<string, WarungItem>,
  maxStock: number,
): AssetPart[] {
  const parts: AssetPart[] = [];
  stock
    .filter((s) => s.qty > 0)
    .slice(0, 9)
    .forEach((s, i) => {
      const x = SHELF_X[i % 3]!;
      const y = SHELF_Y[Math.floor(i / 3)]!;
      const units = Math.max(1, Math.min(5, Math.ceil((s.qty / maxStock) * 5)));
      const color = catalog.get(s.itemId)?.color ?? "#ccc";
      for (let b = 0; b < units; b++)
        parts.push(...productShape(s.itemId, color, x - 1.1 + b * 0.55, y, -4.2));
    });
  // A few items in the glass case so the counter never looks empty.
  stock
    .filter((s) => s.qty > 0)
    .slice(0, 4)
    .forEach((s, i) =>
      parts.push(
        ...productShape(s.itemId, catalog.get(s.itemId)?.color ?? "#ccc", -1.5 + i, 0.92, -1),
      ),
    );
  return parts;
}

/** Walks a customer from the door to the counter, waits, then walks back out. */
function Customer() {
  const customer = useWarung((s) => s.customer);
  const ref = useRef<Group>(null);
  const walkingRef = useRef(true);
  const [walking, setWalking] = useState(true);
  useFrame(() => {
    const g = ref.current;
    if (!g || !customer) return;
    const leaving = customer.leavingAt !== null;
    const t = Math.min(
      1,
      (Date.now() - (leaving ? customer.leavingAt! : customer.arrivedAt)) / CUSTOMER_WALK_MS,
    );
    // Leaving before reaching the counter walks back from where the customer stopped.
    const reached = leaving
      ? Math.min(1, (customer.leavingAt! - customer.arrivedAt) / CUSTOMER_WALK_MS)
      : 1;
    const stop: [number, number, number] = [
      DOOR[0] + (COUNTER_FRONT[0] - DOOR[0]) * reached,
      0,
      DOOR[2] + (COUNTER_FRONT[2] - DOOR[2]) * reached,
    ];
    const [from, to] = leaving ? [stop, DOOR] : [DOOR, COUNTER_FRONT];
    g.position.set(from[0] + (to[0] - from[0]) * t, 0, from[2] + (to[2] - from[2]) * t);
    g.rotation.y = leaving ? 0 : Math.PI;
    const isMoving = t < 1;
    if (isMoving !== walkingRef.current) {
      walkingRef.current = isMoving;
      setWalking(isMoving);
    }
  });
  if (!customer) return null;
  return (
    <group ref={ref} position={DOOR} name="WarungCustomer">
      <BaseAvatarV2
        avatar={NPC_AVATARS[customer.avatar]}
        animation={walking ? "Walk" : "Idle"}
        speed={walking ? 1.4 : 0}
        groundToWorld
      />
      <Text
        position={[0, 2.35, 0]}
        fontSize={0.22}
        color="#5a3922"
        outlineWidth={0.018}
        outlineColor="#ffffff"
      >
        {customer.name}
      </Text>
    </group>
  );
}

/** Stable visual signature so 20s owner polls do not rebuild product meshes when rack display is unchanged. */
function productSignature(stock: WarungStock[] | undefined, maxStock: number): string {
  if (!stock || stock.length === 0) return "";
  return stock
    .filter((s) => s.qty > 0)
    .slice(0, 9)
    .map((s) => `${s.itemId}:${Math.max(1, Math.min(5, Math.ceil((s.qty / maxStock) * 5)))}`)
    .join("|");
}

export function WarungScene() {
  const w = useWarung((s) => s.inside);
  const data = useWarung((s) => s.data);
  const productsGroupRef = useRef<Group>(null);
  const catalog = useMemo(
    () => new Map((data?.catalog ?? []).map((i) => [i.id, i])),
    [data?.catalog],
  );
  const maxStock = data?.levels[String(w?.level ?? 1)]?.maxStock ?? 20;
  const room = useMemo(() => roomParts(w?.level ?? 1), [w?.level]);
  const stockSig = productSignature(w?.stock, maxStock);
  const stockRef = useRef(w?.stock);
  stockRef.current = w?.stock;
  const products = useMemo(
    () => (stockSig && stockRef.current ? productParts(stockRef.current, catalog, maxStock) : []),
    [stockSig, catalog, maxStock],
  );

  // Small rack products do not need shadow casting (saves shadow-map draw calls on phones).
  useLayoutEffect(() => {
    const g = productsGroupRef.current;
    if (!g) return;
    g.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
  }, [products]);

  if (!w) return null;
  return (
    <group name="WarungScene" position={warungOrigin(w.id)}>
      <StyledBatch items={room} />
      {products.length > 0 && (
        <group ref={productsGroupRef} name="WarungProducts">
          <StyledBatch items={products} />
        </group>
      )}
      {/* No extra light here: changing the scene's light count recompiles every shader (freeze on enter/exit). */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[6, 0.2, 5]} position={[0, -0.2, 0]} />
        <CuboidCollider args={[0.15, WALL_H / 2, 5]} position={[-6, WALL_H / 2, 0]} />
        <CuboidCollider args={[0.15, WALL_H / 2, 5]} position={[6, WALL_H / 2, 0]} />
        <CuboidCollider args={[6, WALL_H / 2, 0.15]} position={[0, WALL_H / 2, -5]} />
        <CuboidCollider args={[6, WALL_H / 2, 0.15]} position={[0, WALL_H / 2, 5]} />
        <CuboidCollider args={[2.3, 0.78, 0.5]} position={[0, 0.78, -1]} />
        <CuboidCollider args={[6, 1.3, 0.35]} position={[0, 1.3, -4.5]} />
      </RigidBody>
      <Text
        position={[0, 3.6, -4.82]}
        fontSize={0.5}
        color="#5a3922"
        maxWidth={9}
        textAlign="center"
      >
        {w.name}
      </Text>
      <Text position={[0, 3.05, -4.82]} fontSize={0.24} color="#8c6c52">
        {`${w.levelName}${w.ownerName ? ` · ${w.ownerName}` : ""}`}
      </Text>
      <Customer />
    </group>
  );
}
