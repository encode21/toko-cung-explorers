/** @jsxImportSource @/game/jsx */
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
import type { TreeSpot } from "@/game/world/vegetation";
import { useWarung, type WarungCustomer } from "./store";
import { FLOOR_TILES, WALL_COLOR, awningStripe, extraParts, type WarungStyle } from "./decor";
import {
  CUSTOMER_WALK_MS,
  LEVEL_LOOK,
  patienceEmoji,
  warungOrigin,
  type WarungEventKind,
  type WarungItem,
} from "./model";

import {
  BACK_RACK_X,
  MERCHANDISE_SLOTS,
  RACK_LEVELS,
  SIDE_RACK_X,
  SIDE_RACK_Z,
  merchandiseParts,
  merchandiseSignature,
} from "./merchandise";

const WALL_H = 3.5;
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "bevel",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

const STREET_ENTRY_L: [number, number, number] = [-6.8, 0, 7.6];
const STREET_ENTRY_R: [number, number, number] = [6.8, 0, 7.6];
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

/** Open shelves have a thin back panel; merchandise sits in front instead of inside a solid box. */
function rackParts(x: number, z: number, face: 1 | -1): AssetPart[] {
  return [
    part([x, 1.35, z - face * 0.34], [2.88, 2.54, 0.055], "#a18364", "box", "wood"),
    ...[-1.43, 1.43].flatMap((dx) => [
      part([x + dx, 1.31, z], [0.09, 2.62, 0.76], "#70533d", "box", "wood"),
      part([x + dx, 0.08, z], [0.14, 0.16, 0.8], "#4d5551", "box", "metal"),
    ]),
    ...RACK_LEVELS.flatMap((y) => [
      part([x, y - 0.04, z], [2.92, 0.08, 0.76], "#c3a17a", "box", "wood"),
      part([x, y - 0.075, z + face * 0.385], [2.86, 0.15, 0.035], "#f2e2bf", "box", "paint"),
    ]),
    part([x, 2.6, z], [3, 0.13, 0.82], "#70533d", "bevel", "wood"),
  ];
}

/** Batched shop furnishings: real counter proportions and open grocery racks around the customer lane. */
function roomParts(level: number, style: WarungStyle | undefined): AssetPart[] {
  const base = LEVEL_LOOK[Math.min(Math.max(level, 1), 5) - 1]!;
  const awningId = style?.awning ?? "awning-level";
  const look = {
    wall: (style && WALL_COLOR[style.wall]) ?? base.wall,
    awning: awningStripe(awningId, base.awning, 0),
  };
  const [tileA, tileB] = FLOOR_TILES[style?.floor ?? "floor-kotak"] ?? FLOOR_TILES["floor-kotak"]!;
  const tiles: AssetPart[] = [];
  for (let x = 0; x < 12; x++)
    for (let z = 0; z < 10; z++)
      tiles.push(
        part([-5.5 + x, 0.012, -4.5 + z], [0.98, 0.024, 0.98], (x + z) % 2 ? tileA : tileB, "box"),
      );
  const streetDetails: AssetPart[] = [];
  for (let i = 0; i < 12; i++) {
    streetDetails.push(
      part([-11 + i * 2, 0.06, 8.15], [1.9, 0.14, 0.28], i % 2 ? "#f4f1ea" : "#3a3e42", "box"),
    );
  }
  for (let i = -10; i <= 10; i += 4) {
    streetDetails.push(part([i, 0.015, 11.9], [2.1, 0.02, 0.18], "#f4f1ea", "box"));
  }
  return [
    part([0, -0.2, 0], [12.4, 0.4, 10.4], "#cdb89a", "box"),
    ...tiles,
    part([-6, WALL_H / 2, 0], [0.3, WALL_H, 10], look.wall, "box", "concrete"),
    part([6, WALL_H / 2, 0], [0.3, WALL_H, 10], look.wall, "box", "concrete"),
    part([0, WALL_H / 2, -5], [12, WALL_H, 0.3], look.wall, "box", "concrete"),
    part([0, 0.16, -4.82], [11.6, 0.32, 0.05], "#796651", "box", "wood"),
    part([-5.82, 0.16, 0], [0.05, 0.32, 9.6], "#796651", "box", "wood"),
    part([5.82, 0.16, 0], [0.05, 0.32, 9.6], "#796651", "box", "wood"),
    // Timber framing and warm ceiling fixtures, no ceiling across the shop camera.
    ...[-5.75, 5.75].flatMap((x) => [
      part([x, 1.75, 4.95], [0.22, 3.5, 0.22], "#76523c", "box", "wood"),
      part([x, 3.35, 0], [0.2, 0.2, 10.2], "#76523c", "box", "wood"),
    ]),
    part([0, 3.35, 4.95], [11.6, 0.2, 0.22], "#76523c", "box", "wood"),
    ...[-3.7, 3.7].flatMap((x) => [
      part([x, 3.2, 2.5], [1.3, 0.1, 0.24], "#606157", "box", "metal"),
      part([x, 3.14, 2.5], [1.15, 0.035, 0.17], "#fff1cf", "box", "paint"),
    ]),
    ...Array.from({ length: 12 }, (_, i) =>
      part(
        [-5.5 + i, 3.35, 5.45],
        [1, 0.14, 1.1],
        awningStripe(awningId, base.awning, i),
        "box",
        "fabric",
      ),
    ),
    ...[-4.5, 4.5].flatMap((x) => [
      part([x, 0.5, 4.95], [2.5, 1, 0.24], look.wall, "box", "concrete"),
      part([x, 1.04, 4.95], [2.6, 0.1, 0.34], "#a97750", "box", "wood"),
    ]),
    // Cashier-side service counter, with the central handing-over area kept clear.
    part([0, 0.54, -1], [7.5, 0.98, 1.08], "#77533b", "bevel", "wood"),
    ...Array.from({ length: 7 }, (_, i) =>
      part(
        [-3.15 + i * 1.05, 0.54, -1.55],
        [1, 0.84, 0.04],
        i % 2 ? "#a67c54" : "#98704d",
        "box",
        "wood",
      ),
    ),
    part([0, 1.08, -1], [7.7, 0.13, 1.24], "#cba879", "bevel", "wood"),
    part([0, 1.151, -1.04], [2.5, 0.014, 0.78], "#e6d5ac", "bevel", "fabric"),
    part([0, 1.16, -0.66], [2.6, 0.025, 0.05], "#b19a77", "box", "wood"),
    // Register, drawer and display face the shopkeeper.
    part([-2.9, 1.23, -1.04], [0.68, 0.16, 0.56], "#d9d6c8", "bevel", "metal"),
    part([-2.9, 1.38, -0.99], [0.58, 0.18, 0.4], "#efe9db", "bevel", "plastic"),
    part([-2.9, 1.63, -0.86], [0.44, 0.28, 0.1], "#515953", "bevel", "plastic"),
    part([-2.9, 1.64, -0.918], [0.34, 0.16, 0.012], "#a9ceae", "box", "glass"),
    ...Array.from({ length: 3 }, (_, i) =>
      part([-3.06 + i * 0.16, 1.48, -1.08], [0.1, 0.025, 0.12], "#6b7166", "box", "plastic"),
    ),
    // Paper bags and a balance scale are tools, not invented saleable stock.
    part([2.9, 1.21, -1.03], [0.65, 0.14, 0.53], "#728f7d", "bevel", "metal"),
    part([2.9, 1.35, -1.03], [0.46, 0.12, 0.38], "#e2dfcb", "bevel", "metal"),
    part([2.9, 1.43, -1.03], [0.68, 0.04, 0.5], "#b7bbb0", "bevel", "metal"),
    part([3.44, 1.37, -1.08], [0.3, 0.44, 0.24], "#c6a16f", "box", "cardboard"),
    ...SIDE_RACK_X.flatMap((x) => rackParts(x, SIDE_RACK_Z, -1)),
    ...BACK_RACK_X.flatMap((x) => rackParts(x, -4.25, 1)),
    // Side fixtures remain clear of the customer lane.
    part([-5.76, 2.35, -1.7], [0.04, 0.8, 0.62], "#fff7e7", "box", "cardboard"),
    part([-5.72, 2.62, -1.7], [0.05, 0.16, 0.62], "#ba4934", "box"),
    part([0, 0.03, 4.55], [2.2, 0.03, 1], "#7c5a3c", "box", "fabric"),
    ...(level >= 2
      ? [
          {
            ...part([5.7, 2.65, -1], [0.75, 0.11, 0.75], "#e7e7d9", "cylinder", "plastic"),
            rz: Math.PI / 2,
          },
          {
            ...part([5.62, 2.65, -1], [0.25, 0.13, 0.25], look.awning, "cylinder", "plastic"),
            rz: Math.PI / 2,
          },
        ]
      : []),
    ...(level >= 3
      ? [
          part([5.15, 1.1, -2.7], [1, 2.2, 1], "#eee9da", "bevel", "metal"),
          part([5.15, 1.15, -2.18], [0.82, 1.8, 0.035], "#96b9b8", "box", "window"),
          part([5.51, 1.1, -2.14], [0.05, 0.7, 0.06], "#4a625a", "box", "metal"),
        ]
      : []),
    // Shopfront street stays visible beyond the customers.
    part([0, -0.26, 6.5], [32, 0.4, 28], "#9ec27b", "box"),
    part([0, -0.06, 6.6], [28, 0.14, 3.2], "#d8d1c2", "box"),
    part([0, -0.1, 12], [32, 0.12, 7.6], "#4e5358", "box"),
    part([0, -0.06, 16.8], [32, 0.14, 2.2], "#d8d1c2", "box"),
    ...streetDetails,
    part([-4.4, 0.42, 6], [2.1, 0.1, 0.55], "#b37c4d", "box", "wood"),
    part([-5.2, 0.2, 6], [0.14, 0.4, 0.45], "#7c5534", "box", "wood"),
    part([-3.6, 0.2, 6], [0.14, 0.4, 0.45], "#7c5534", "box", "wood"),
    part([4.8, 0.32, 6], [0.55, 0.64, 0.55], "#b55d3c", "cylinder", "plastic"),
    part([4.8, 0.88, 6], [0.85, 0.85, 0.85], "#59a85c", "sphere"),
    part([3.7, 0.35, 6], [0.46, 0.7, 0.46], "#4b8ec2", "cylinder", "plastic"),
    ...(style ? extraParts(style) : []),
    part([7.8, 2, 7.6], [0.14, 4, 0.14], "#4a545c", "cylinder", "metal"),
    part([7.3, 3.9, 7.6], [1.1, 0.12, 0.14], "#4a545c", "box", "metal"),
    part([6.9, 3.8, 7.6], [0.4, 0.16, 0.26], "#fff2b3", "box", "glass"),
    // A modest neighbouring façade closes the horizon without another live city scene.
    ...[-8, 0, 8].flatMap((x, i) => [
      part([x, 2.4, 19], [7.4, 4.8, 1.2], ["#d4bda2", "#bfc8af", "#d5c8b3"][i]!, "box", "concrete"),
      part([x, 4.85, 18.7], [7.7, 0.2, 1.8], "#92765c", "bevel", "metal"),
      part([x, 1.65, 18.35], [4.8, 3.3, 0.08], "#7f8c85", "box", "metal"),
      ...Array.from({ length: 9 }, (_, j) =>
        part([x, 0.25 + j * 0.36, 18.29], [4.78, 0.025, 0.03], "#65776f", "box", "metal"),
      ),
    ]),
  ];
}

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
  const avatar = useMemo(() => customerAppearance(customer.avatar), [customer.avatar]);
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
          animation={walking ? "Walk" : "Idle"}
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
        <Text
          position={[0, 3.05, -4.82]}
          fontSize={0.48}
          color="#5a3922"
          maxWidth={9}
          textAlign="center"
        >
          {w.name}
        </Text>
        <Text position={[0, 2.6, -4.82]} fontSize={0.22} color="#8c6c52">
          {`${w.levelName}${w.ownerName ? ` · ${w.ownerName}` : ""}`}
        </Text>
        {style?.extras.includes("neon-buka") && (
          <Text position={[4.35, 1.8, 5.13]} fontSize={0.56} color="#ff4fa3" fontWeight={800}>
            BUKA
          </Text>
        )}
        <Customers />
      </group>
    </>
  );
}
