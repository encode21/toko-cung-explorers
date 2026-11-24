/** @jsxImportSource @/game/jsx */
import { Plang } from "@/game/world/Plang";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { Group, Mesh } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { ExplorerAvatar } from "@/game/avatar/ExplorerAvatar";
import { customerAppearance } from "./customer-appearance";
import { removeWarungCustomerPosition, setWarungCustomerPosition } from "./customer-positions";
import { NaturalTrees } from "@/game/world/NaturalTrees";
import { Passers, type Passer } from "@/game/npc/Passers";
import type { TreeSpot } from "@/game/world/vegetation";
import { useWarung, type WarungCustomer, isOwnWarung } from "./store";
import { ShopStaff } from "@/game/staff/ShopStaff";
import { roomParts, WALL_H } from "./room-parts";
import { getDecorPlacement } from "./decor-placement";
import {
  CUSTOMER_WALK_MS,
  patienceEmoji,
  warungOrigin,
  type WarungEventKind,
  type WarungItem,
} from "./model";

import {
  BACK_RACK_X,
  MERCHANDISE_SLOTS,
  SIDE_RACK_X,
  SIDE_RACK_Z,
  merchandiseParts,
  merchandiseSignature,
} from "./merchandise";

const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "bevel",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

const STREET_ENTRY_L: [number, number, number] = [-6.8, 0, 7.6];
const STREET_ENTRY_R: [number, number, number] = [6.8, 0, 7.6];
/** Orang lewat di trotoar depan warung, tanpa belanja (scene-local x, z). */
const STREET_PASSERS: Passer[] = [
  {
    id: "street-a",
    avatar: "npc-shopper-1",
    from: [-15, 9.2],
    to: [15, 9.2],
    speed: 1.2,
    offset: 0,
  },
  {
    id: "street-b",
    avatar: "npc-courier",
    from: [15, 10.2],
    to: [-15, 10.2],
    speed: 1.4,
    offset: 9,
  },
  {
    id: "street-c",
    avatar: "npc-store-staff",
    from: [-15, 9.7],
    to: [15, 9.7],
    speed: 1.0,
    offset: 21,
  },
];
const DOOR_WAYPOINT: [number, number, number] = [0, 0, 5.2];
const QUEUE_SLOTS: [number, number, number][] = [
  [0, 0, 0.35],
  [-1.65, 0, 1.1],
  [1.65, 0, 1.1],
];

/** Sideyard & across-the-street trees (local x, z): the city's NaturalTrees so both match. */
const TREE_SPOTS: [number, number, number][] = [
  [-8.8, 5.5, 1],
  [9.2, 4.5, 2],
  [-7.5, 17.5, 3],
  [6.5, 17.5, 6],
];

/** Crisp full-color emoji + name pill rendered onto a CanvasTexture so emojis never turn into monochrome outlines. */
function makeBubbleTexture(emoji: string, name: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 144;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Emoji speech bubble circle at top
  if (emoji) {
    ctx.fillStyle = "rgba(255, 252, 245, 0.96)";
    ctx.strokeStyle = "#e8d8c0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 46, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font =
      "48px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 128, 49);
  }

  // Name pill underneath
  ctx.font = "700 26px system-ui, -apple-system, sans-serif";
  const textW = Math.min(226, ctx.measureText(name).width + 28);
  const rx = (256 - textW) / 2;
  const ry = 96;
  const rh = 38;
  ctx.fillStyle = "rgba(90, 57, 34, 0.88)";
  ctx.beginPath();
  ctx.roundRect(rx, ry, textW, rh, 19);
  ctx.fill();
  ctx.fillStyle = "#fffaf3";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 128, ry + rh / 2 + 1, textW - 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function CustomerBubble({ emoji, name }: { emoji: string; name: string }) {
  const serviceView = useWarung((s) => s.serviceView);
  const scale = serviceView ? 0.6 : 1;
  const tex = useMemo(() => makeBubbleTexture(emoji, name), [emoji, name]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <Billboard position={[0, serviceView ? 2.35 : 2.7, 0]}>
      <sprite scale={[1.85 * scale, 1.04 * scale, 1]}>
        <spriteMaterial map={tex} transparent depthTest={false} />
      </sprite>
    </Billboard>
  );
}

/** Walks a customer from the sidewalk outside through the entrance to their queue slot, then back out. */
const EVENT_EMOJI: Record<WarungEventKind, string> = {
  ojol: "🛵",
  iuran: "📋",
  palak: "🕶️",
  ngutang: "🙏",
  sultan: "💎",
};

/** Iconic 3D props worn/carried by story visitors: Ojol helmet+box, Pak RT peci+clipboard, Preman shades+bandana, Sultan suit+tie. */
function VisitorProps({ kind }: { kind: WarungEventKind | undefined }) {
  if (kind === "ojol") {
    return (
      <group name="OjolProps">
        {/* Green ojol helmet + dark visor */}
        <mesh position={[0, 1.58, 0]}>
          <sphereGeometry args={[0.25, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color="#16a34a" roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.54, 0.19]}>
          <boxGeometry args={[0.3, 0.08, 0.08]} />
          <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.3} />
        </mesh>
        {/* Green ojol jacket vest overlay */}
        <mesh position={[0, 1.06, 0]}>
          <boxGeometry args={[0.42, 0.44, 0.25]} />
          <meshStandardMaterial color="#15803d" roughness={0.75} />
        </mesh>
        {/* Green delivery thermal bag on back */}
        <mesh position={[0, 1.08, -0.25]}>
          <boxGeometry args={[0.36, 0.36, 0.24]} />
          <meshStandardMaterial color="#22c55e" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.12, -0.375]}>
          <boxGeometry args={[0.24, 0.08, 0.02]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
      </group>
    );
  }
  if (kind === "iuran") {
    return (
      <group name="PakRtProps">
        {/* Black peci cap */}
        <mesh position={[0, 1.66, 0]}>
          <cylinderGeometry args={[0.17, 0.18, 0.12, 12]} />
          <meshStandardMaterial color="#1c1917" roughness={0.85} />
        </mesh>
        {/* Clipboard with paper in hand */}
        <mesh position={[0.26, 1.02, 0.18]} rotation={[0.35, -0.25, 0]}>
          <boxGeometry args={[0.2, 0.26, 0.025]} />
          <meshStandardMaterial color="#9a6432" roughness={0.8} />
        </mesh>
        <mesh position={[0.26, 1.03, 0.195]} rotation={[0.35, -0.25, 0]}>
          <boxGeometry args={[0.16, 0.2, 0.01]} />
          <meshStandardMaterial color="#fffbeb" roughness={0.9} />
        </mesh>
      </group>
    );
  }
  if (kind === "palak") {
    return (
      <group name="PremanProps">
        {/* Red headband */}
        <mesh position={[0, 1.56, 0]}>
          <cylinderGeometry args={[0.225, 0.225, 0.07, 12]} />
          <meshStandardMaterial color="#dc2626" roughness={0.7} />
        </mesh>
        {/* Dark sunglasses */}
        <mesh position={[0, 1.48, 0.2]}>
          <boxGeometry args={[0.28, 0.075, 0.05]} />
          <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.4} />
        </mesh>
      </group>
    );
  }
  if (kind === "sultan") {
    return (
      <group name="SultanProps">
        {/* Luxury black suit + gold tie */}
        <mesh position={[0, 1.06, 0]}>
          <boxGeometry args={[0.43, 0.46, 0.26]} />
          <meshStandardMaterial color="#18181b" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.08, 0.138]}>
          <boxGeometry args={[0.07, 0.34, 0.02]} />
          <meshStandardMaterial color="#facc15" roughness={0.25} metalness={0.6} />
        </mesh>
        {/* Gold-rimmed shades */}
        <mesh position={[0, 1.48, 0.2]}>
          <boxGeometry args={[0.28, 0.075, 0.05]} />
          <meshStandardMaterial color="#1e1b4b" roughness={0.15} metalness={0.5} />
        </mesh>
      </group>
    );
  }
  return null;
}

/** Parked vehicle outside on the warung street when Ojol, Pak RT, Preman, or Sultan visits. */
function ParkedVehicle({ kind }: { kind: WarungEventKind }) {
  if (kind === "sultan") {
    // Luxury White Alphard MPV parked right in front of the warung!
    return (
      <group position={[2.2, 0, 6.25]} rotation={[0, -Math.PI / 2, 0]} name="SultanAlphard">
        {/* Lower chassis */}
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[1.65, 0.68, 3.65]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.25} />
        </mesh>
        {/* Tall boxy Alphard cabin */}
        <mesh position={[0, 1.28, -0.18]}>
          <boxGeometry args={[1.56, 0.72, 2.75]} />
          <meshStandardMaterial color="#ffffff" roughness={0.18} metalness={0.2} />
        </mesh>
        {/* Tinted wrap-around windows */}
        <mesh position={[0, 1.28, -0.18]}>
          <boxGeometry args={[1.59, 0.44, 2.48]} />
          <meshStandardMaterial color="#0f172a" roughness={0.12} metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.28, 1.2]}>
          <boxGeometry args={[1.42, 0.46, 0.06]} />
          <meshStandardMaterial color="#0f172a" roughness={0.12} metalness={0.6} />
        </mesh>
        {/* Signature wide chrome Alphard front grille */}
        <mesh position={[0, 0.58, 1.84]}>
          <boxGeometry args={[1.08, 0.48, 0.06]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.15} metalness={0.85} />
        </mesh>
        {/* LED Headlights */}
        <mesh position={[-0.62, 0.74, 1.84]}>
          <boxGeometry args={[0.3, 0.12, 0.05]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0.62, 0.74, 1.84]}>
          <boxGeometry args={[0.3, 0.12, 0.05]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.6} />
        </mesh>
        {/* 4 wheels with silver alloy rims */}
        {[
          [-0.82, 0.3, 1.15],
          [0.82, 0.3, 1.15],
          [-0.82, 0.3, -1.15],
          [0.82, 0.3, -1.15],
        ].map(([wx, wy, wz], idx) => (
          <group key={idx} position={[wx!, wy!, wz!]} rotation={[0, 0, Math.PI / 2]}>
            <mesh>
              <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />
              <meshStandardMaterial color="#18181b" roughness={0.85} />
            </mesh>
            <mesh>
              <cylinderGeometry args={[0.17, 0.17, 0.22, 10]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  // Motorbikes for Ojol (green + delivery box), Pak RT (classic blue + basket), Preman (red-black sport).
  const bodyColor = kind === "ojol" ? "#16a34a" : kind === "iuran" ? "#2563eb" : "#dc2626";
  const yaw = kind === "palak" ? -1.15 : -1.45;
  return (
    <group position={[2.6, 0, 5.65]} rotation={[0, yaw, 0]} name={`ParkedMotor-${kind}`}>
      {/* Wheels */}
      <mesh position={[0, 0.26, 0.56]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 0.14, 12]} />
        <meshStandardMaterial color="#18181b" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.26, -0.56]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 0.14, 12]} />
        <meshStandardMaterial color="#18181b" roughness={0.85} />
      </mesh>
      {/* Scooter/bike body */}
      <mesh position={[0, 0.54, -0.05]}>
        <boxGeometry args={[0.36, 0.34, 1.15]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Seat */}
      <mesh position={[0, 0.74, -0.18]}>
        <boxGeometry args={[0.32, 0.12, 0.62]} />
        <meshStandardMaterial color="#1c1917" roughness={0.85} />
      </mesh>
      {/* Front steering column + handlebar + headlight */}
      <mesh position={[0, 0.88, 0.42]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[0.16, 0.52, 0.18]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.08, 0.38]}>
        <boxGeometry args={[0.66, 0.06, 0.07]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.96, 0.52]}>
        <boxGeometry args={[0.16, 0.12, 0.06]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
      </mesh>
      {/* Ojol rear green delivery box */}
      {kind === "ojol" && (
        <mesh position={[0, 0.98, -0.56]}>
          <boxGeometry args={[0.44, 0.4, 0.42]} />
          <meshStandardMaterial color="#22c55e" roughness={0.55} />
        </mesh>
      )}
      {/* Pak RT front basket */}
      {kind === "iuran" && (
        <mesh position={[0, 0.84, 0.6]}>
          <boxGeometry args={[0.3, 0.24, 0.24]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.6} metalness={0.4} />
        </mesh>
      )}
    </group>
  );
}

function CustomerActor({ customer, slotIndex }: { customer: WarungCustomer; slotIndex: number }) {
  const ref = useRef<Group>(null);
  // Annoyed after a 2nd wrong bag: the smile drops and they do an angry gesture.
  const avatar = useMemo(() => {
    const a = customerAppearance(customer.avatar);
    return customer.annoyed ? { ...a, expression: "calm" as const } : a;
  }, [customer.avatar, customer.annoyed]);
  const anchorPoint = useMemo(() => new THREE.Vector3(), []);
  const anchorPosition = useMemo<[number, number, number]>(() => [0, 0, 0], []);
  useEffect(() => () => removeWarungCustomerPosition(customer.id), [customer.id]);
  const walkingRef = useRef(true);
  const [walking, setWalking] = useState(true);
  const [emoji, setEmoji] = useState(() => customer.reaction ?? "😊");
  const emojiRef = useRef(emoji);
  const target = QUEUE_SLOTS[Math.min(slotIndex, QUEUE_SLOTS.length - 1)]!;
  // Alternate street entry side deterministically per customer id.
  const entry = (customer.id.charCodeAt(0) ?? 0) % 2 === 0 ? STREET_ENTRY_L : STREET_ENTRY_R;

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const now = Date.now();
    const leaving = customer.leavingAt !== null;
    const t = Math.min(
      1,
      (now - (leaving ? customer.leavingAt! : customer.arrivedAt)) / CUSTOMER_WALK_MS,
    );

    // Two-segment path: sidewalk -> entrance -> counter slot (reversed when leaving).
    const posAt = (u: number): [number, number, number] => {
      if (u <= 0.45) {
        const s = u / 0.45;
        return [
          entry[0] + (DOOR_WAYPOINT[0] - entry[0]) * s,
          0,
          entry[2] + (DOOR_WAYPOINT[2] - entry[2]) * s,
        ];
      }
      const s = (u - 0.45) / 0.55;
      return [
        DOOR_WAYPOINT[0] + (target[0] - DOOR_WAYPOINT[0]) * s,
        0,
        DOOR_WAYPOINT[2] + (target[2] - DOOR_WAYPOINT[2]) * s,
      ];
    };

    const reached = leaving
      ? Math.min(1, (customer.leavingAt! - customer.arrivedAt) / CUSTOMER_WALK_MS)
      : 1;
    const u = leaving ? reached * (1 - t) : t;
    const [x, y, z] = posAt(u);
    const [nx, , nz] = posAt(Math.max(0, Math.min(1, leaving ? u - 0.03 : u + 0.03)));
    g.position.set(x, y, z);
    g.getWorldPosition(anchorPoint);
    anchorPosition[0] = anchorPoint.x;
    anchorPosition[1] = anchorPoint.y + 1.65;
    anchorPosition[2] = anchorPoint.z;
    setWarungCustomerPosition(customer.id, anchorPosition);
    const dx = nx - x;
    const dz = nz - z;
    if (dx * dx + dz * dz > 1e-5) {
      g.rotation.y = Math.atan2(dx, dz);
    } else if (!leaving) {
      g.rotation.y = Math.PI;
    }

    const isMoving = t < 1;
    if (isMoving !== walkingRef.current) {
      walkingRef.current = isMoving;
      setWalking(isMoving);
    }

    let nextEmoji = customer.reaction ?? "";
    if (!nextEmoji) {
      if (customer.eventKind) nextEmoji = EVENT_EMOJI[customer.eventKind];
      else if (customer.eventId !== undefined) nextEmoji = "💬";
      else if (customer.personality === "kecewa") nextEmoji = "😞";
      else if (!isMoving && !leaving) {
        const waited = Math.max(0, now - customer.arrivedAt - CUSTOMER_WALK_MS);
        const ratio = Math.max(0, 1 - waited / customer.waitMs);
        nextEmoji = patienceEmoji(ratio);
      } else {
        nextEmoji = "🚶";
      }
    }
    if (nextEmoji !== emojiRef.current) {
      emojiRef.current = nextEmoji;
      setEmoji(nextEmoji);
    }
  });

  return (
    <group ref={ref} position={entry} name={`WarungCustomer-${customer.id}`}>
      <Suspense fallback={null}>
        <ExplorerAvatar
          avatar={avatar}
          animation={walking ? "Walk" : customer.annoyed ? "Angry" : "Idle"}
          speed={walking ? 1.4 : 0}
          groundToWorld
        />
      </Suspense>
      <VisitorProps kind={customer.eventKind} />
      <CustomerBubble emoji={emoji} name={customer.name} />
    </group>
  );
}

function Customers() {
  const customers = useWarung((s) => s.customers);
  if (!customers.length) return null;
  let activeSlot = 0;
  const vehicleKind = customers.find(
    (c) =>
      c.eventKind === "ojol" ||
      c.eventKind === "iuran" ||
      c.eventKind === "palak" ||
      c.eventKind === "sultan",
  )?.eventKind;
  return (
    <>
      {vehicleKind && <ParkedVehicle kind={vehicleKind} />}
      {customers.map((c) => {
        const slot = c.leavingAt === null ? activeSlot++ : 0;
        return <CustomerActor key={c.id} customer={c} slotIndex={slot} />;
      })}
    </>
  );
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
  const style = w?.style;
  const room = useMemo(() => roomParts(w?.level ?? 1, style), [w?.level, style]);
  const neon = style ? getDecorPlacement(style, "neon-buka:0") : null;
  const warungId = w?.id;
  const trees = useMemo((): TreeSpot[] => {
    if (warungId == null) return [];
    const [ox, oy, oz] = warungOrigin(warungId);
    return TREE_SPOTS.map(([x, z, seed]) => ({ x: ox + x, y: oy, z: oz + z, scale: 0.7, seed }));
  }, [warungId]);
  const stockSig = merchandiseSignature(w?.stock, maxStock);
  const stockRef = useRef(w?.stock);
  stockRef.current = w?.stock;
  const products = useMemo(
    () =>
      stockSig && stockRef.current ? merchandiseParts(stockRef.current, catalog, maxStock) : [],
    [stockSig, catalog, maxStock],
  );

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
    <>
      {/* World-space spots: NaturalTrees culls by item position vs camera. */}
      <NaturalTrees spots={trees} />
      <group name="WarungScene" position={warungOrigin(w.id)}>
        <StyledBatch items={room} />
        <Passers passers={STREET_PASSERS} origin={warungOrigin(w.id)} />
        {(w.stock ?? []).slice(0, MERCHANDISE_SLOTS.length).map((row, index) => {
          const slot = MERCHANDISE_SLOTS[index]!;
          const item = catalog.get(row.itemId);
          if (!item) return null;
          return (
            <Text
              key={row.itemId}
              position={[slot.x, slot.y - 0.07, slot.z + slot.face * 0.408]}
              rotation={[0, slot.face < 0 ? Math.PI : 0, 0]}
              fontSize={0.105}
              color={row.qty > 0 ? "#493b2c" : "#a8472e"}
              maxWidth={2.65}
              lineHeight={1}
              textAlign="center"
              anchorY="middle"
            >
              {`${item.name}${row.qty <= 0 ? " · HABIS" : ""}`}
            </Text>
          );
        })}
        {products.length > 0 && (
          <group ref={productsGroupRef} name="WarungProducts">
            <StyledBatch items={products} />
          </group>
        )}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[6, 0.2, 5]} position={[0, -0.2, 0]} />
          <CuboidCollider args={[0.15, WALL_H / 2, 5]} position={[-6, WALL_H / 2, 0]} />
          <CuboidCollider args={[0.15, WALL_H / 2, 5]} position={[6, WALL_H / 2, 0]} />
          <CuboidCollider args={[6, WALL_H / 2, 0.15]} position={[0, WALL_H / 2, -5]} />
          <CuboidCollider args={[6, WALL_H / 2, 0.15]} position={[0, WALL_H / 2, 5]} />
          <CuboidCollider args={[3.85, 0.57, 0.62]} position={[0, 0.57, -1]} />
          {BACK_RACK_X.map((x) => (
            <CuboidCollider
              key={`back-${x}`}
              args={[1.5, 1.34, 0.41]}
              position={[x, 1.34, -4.25]}
            />
          ))}
          {SIDE_RACK_X.map((x) => (
            <CuboidCollider
              key={`side-${x}`}
              args={[1.5, 1.34, 0.41]}
              position={[x, 1.34, SIDE_RACK_Z]}
            />
          ))}
        </RigidBody>
        <Plang
          text={w.name}
          sub={`${w.levelName}${w.ownerName ? ` · ${w.ownerName}` : ""}`}
          position={[0, 2.9, -4.82]}
          size={0.48}
          board="#f1e2c2"
          textColor="#5a3922"
          subColor="#8c6c52"
        />

        {style?.extras.includes("neon-buka") && neon && (
          <group position={[neon.x, neon.y, neon.z]} rotation={[0, neon.rotation, 0]}>
            <Plang
              text="BUKA"
              position={[0, 0, 0]}
              size={0.5}
              board="#1a1220"
              textColor="#ff4fa3"
              neon
            />
          </group>
        )}
        <Customers />
        {isOwnWarung() && <ShopStaff where="counter" />}
      </group>
    </>
  );
}
