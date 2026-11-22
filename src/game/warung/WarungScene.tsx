/** @jsxImportSource @/game/jsx */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { Group, Mesh } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
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
  type WarungStock,
} from "./model";

const WALL_H = 3.5; // Cutaway diorama wall height so the overhead simulator camera sees cleanly inside.
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "bevel",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

const SHELF_X = [-4, 0, 4];
const SHELF_Y = [0.58, 1.28, 1.98];
const STREET_ENTRY_L: [number, number, number] = [-6.8, 0, 7.6];
const STREET_ENTRY_R: [number, number, number] = [6.8, 0, 7.6];
const DOOR_WAYPOINT: [number, number, number] = [0, 0, 5.2];
const QUEUE_SLOTS: [number, number, number][] = [
  [0, 0, 0.25],
  [-1.05, 0, 1.55],
  [1.05, 0, 2.7],
];

/** Sideyard & across-the-street trees (local x, z): the city's NaturalTrees so both match. */
const TREE_SPOTS: [number, number, number][] = [
  [-8.8, 5.5, 1],
  [9.2, 4.5, 2],
  [-7.5, 17.5, 3],
  [6.5, 17.5, 6],
];

/** Open-front warung diorama + terrace + sidewalk + street outside (all in 1 StyledBatch draw call). */
function roomParts(level: number, style: WarungStyle | undefined): AssetPart[] {
  const base = LEVEL_LOOK[Math.min(level, 5) - 1]!;
  const awningId = style?.awning ?? "awning-level";
  const look = {
    wall: (style && WALL_COLOR[style.wall]) ?? base.wall,
    awning: awningStripe(awningId, base.awning, 0),
  };
  const [tileA, tileB] = FLOOR_TILES[style?.floor ?? "floor-kotak"] ?? FLOOR_TILES["floor-kotak"]!;
  const tiles: AssetPart[] = [];
  for (let x = 0; x < 6; x++)
    for (let z = 0; z < 5; z++)
      tiles.push(
        part(
          [-5 + x * 2, 0.01, -4 + z * 2],
          [1.98, 0.02, 1.98],
          (x + z) % 2 ? tileA : tileB,
          "box",
        ),
      );
  const sachets = ["#7a4b2a", "#c8642c", "#e2483d", "#f2c14e", "#3fa7c9"];

  // Kerb stripes (kanstin hitam-putih) + road dashes outside so the street feels alive.
  const streetDetails: AssetPart[] = [];
  for (let i = -11; i <= 11; i += 2) {
    streetDetails.push(
      part([i, 0.06, 8.15], [1.9, 0.14, 0.28], (i / 2) % 2 === 0 ? "#f4f1ea" : "#3a3e42", "box"),
    );
  }
  for (let i = -10; i <= 10; i += 4) {
    streetDetails.push(part([i, 0.015, 11.9], [2.1, 0.02, 0.18], "#f4f1ea", "box"));
  }

  return [
    // Interior floor slab + checkered tiles
    part([0, -0.2, 0], [12.4, 0.4, 10.4], "#cdb89a", "box"),
    ...tiles,
    // Back & side cutaway walls (open front for overhead simulator view)
    part([-6, WALL_H / 2, 0], [0.3, WALL_H, 10], look.wall),
    part([6, WALL_H / 2, 0], [0.3, WALL_H, 10], look.wall),
    part([0, WALL_H / 2, -5], [12, WALL_H, 0.3], look.wall),
    // Wainscot stripe in the level colour
    part([0, 0.5, -4.82], [11.6, 1, 0.05], look.awning, "box"),
    part([-5.82, 0.5, 0], [0.05, 1, 9.6], look.awning, "box"),
    part([5.82, 0.5, 0], [0.05, 1, 9.6], look.awning, "box"),
    // Open storefront: low corner half-walls + wooden corner pillars (wide entrance in center)
    part([-4.35, 0.5, 4.95], [3.1, 1.0, 0.24], look.wall),
    part([-4.35, 1.04, 4.95], [3.2, 0.1, 0.34], "#b37c4d", "box", "wood"),
    part([4.35, 0.5, 4.95], [3.1, 1.0, 0.24], look.wall),
    part([4.35, 1.04, 4.95], [3.2, 0.1, 0.34], "#b37c4d", "box", "wood"),
    part([-5.82, 1.75, 4.95], [0.24, 3.5, 0.24], "#7c5534", "box", "wood"),
    part([5.82, 1.75, 4.95], [0.24, 3.5, 0.24], "#7c5534", "box", "wood"),
    // Striped front warung awning beam (high & shallow so it frames without blocking interior)
    ...Array.from({ length: 12 }, (_, i) =>
      part(
        [-5.5 + i, 3.35, 5.45],
        [1.0, 0.14, 1.1],
        awningStripe(awningId, base.awning, i),
        "box",
        "fabric",
      ),
    ),

    // Etalase: wooden base + glass case
    part([0, 0.45, -1], [4.4, 0.9, 0.9], "#9b6b45", "bevel", "wood"),
    part([0, 1.2, -1], [4.4, 0.6, 0.85], "#bfe6f7", "box", "glass"),
    part([0, 1.52, -1], [4.5, 0.06, 0.95], "#d9c3a0", "box", "wood"),
    // Renceng sachets hanging above the counter
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
    // Back wooden shelves
    ...SHELF_X.flatMap((x) => [
      part([x, 1.3, -4.5], [3, 2.6, 0.6], "#a77b52", "bevel", "wood"),
      ...SHELF_Y.map((y) => part([x, y - 0.03, -4.25], [2.9, 0.06, 0.5], "#c99a6a", "box", "wood")),
    ]),
    // Plastic stools inside + door mat
    part([-3.4, 0.25, 2.6], [0.45, 0.5, 0.45], "#e2483d", "cylinder", "plastic"),
    part([-2.6, 0.25, 3.2], [0.45, 0.5, 0.45], "#3fa7c9", "cylinder", "plastic"),
    part([0, 0.03, 4.55], [2.2, 0.03, 1.0], "#7c5a3c", "box", "fabric"),
    // Wall calendar
    part([-5.8, 2.4, -2.5], [0.04, 0.9, 0.7], "#fffaf0", "box"),
    part([-5.78, 2.75, -2.5], [0.05, 0.2, 0.7], "#e2483d", "box"),
    ...(level >= 2
      ? [
          part([5.75, 2.6, 0.5], [0.1, 0.9, 0.9], "#f4f4f4", "cylinder", "plastic"),
          part([5.68, 2.6, 0.5], [0.08, 0.3, 0.3], look.awning, "cylinder", "plastic"),
        ]
      : []),
    ...(level >= 3
      ? [
          part([5.2, 1.1, -2.6], [1, 2.2, 1], "#f4f4f4", "bevel", "plastic"),
          part([4.68, 1.15, -2.6], [0.04, 1.8, 0.8], "#bfe6f7", "box", "glass"),
          part([5.2, 2.3, -2.6], [1, 0.25, 1], "#e2483d", "bevel", "plastic"),
        ]
      : []),
    ...(level >= 4 ? [part([-5.2, 1.1, 0.5], [1, 2.2, 1.6], "#c99a6a", "bevel", "wood")] : []),

    // ===== OUTSIDE DIORAMA: Teras, Trotoar, Jalan Aspal & Lingkungan =====
    // Surrounding neighborhood ground
    part([0, -0.26, 6.5], [32, 0.4, 28], "#9ec27b", "box"),
    // Sidewalk / trotoar in front of warung
    part([0, -0.06, 6.6], [28, 0.14, 3.2], "#d8d1c2", "box"),
    // Asphalt road
    part([0, -0.1, 12.0], [32, 0.12, 7.6], "#4e5358", "box"),
    // Opposite sidewalk
    part([0, -0.06, 16.8], [32, 0.14, 2.2], "#d8d1c2", "box"),
    ...streetDetails,
    // Wooden bench (bangku warung) on left terrace + potted plants + trash bin
    part([-4.4, 0.42, 6.0], [2.1, 0.1, 0.55], "#b37c4d", "box", "wood"),
    part([-5.2, 0.2, 6.0], [0.14, 0.4, 0.45], "#7c5534", "box", "wood"),
    part([-3.6, 0.2, 6.0], [0.14, 0.4, 0.45], "#7c5534", "box", "wood"),
    part([4.8, 0.32, 6.0], [0.55, 0.64, 0.55], "#b55d3c", "cylinder", "plastic"),
    part([4.8, 0.88, 6.0], [0.85, 0.85, 0.85], "#59a85c", "sphere"),
    part([3.7, 0.35, 6.0], [0.46, 0.7, 0.46], "#4b8ec2", "cylinder", "plastic"),
    // Street lamp on sidewalk right
    // shortcut: decor has no colliders (all placed against walls/corners); add some if players snag on it.
    ...(style ? extraParts(style) : []),
    part([7.8, 2.0, 7.6], [0.14, 4.0, 0.14], "#4a545c", "cylinder", "metal"),
    part([7.3, 3.9, 7.6], [1.1, 0.12, 0.14], "#4a545c", "box", "metal"),
    part([6.9, 3.8, 7.6], [0.4, 0.16, 0.26], "#fff2b3", "box", "glass"),
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
  const tex = useMemo(() => makeBubbleTexture(emoji, name), [emoji, name]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <Billboard position={[0, 2.7, 0]}>
      <sprite scale={[1.85, 1.04, 1]}>
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
      <BaseAvatarV2
        avatar={NPC_AVATARS[customer.avatar]}
        animation={walking ? "Walk" : "Idle"}
        speed={walking ? 1.4 : 0}
        groundToWorld
      />
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
  const style = w?.style;
  const room = useMemo(() => roomParts(w?.level ?? 1, style), [w?.level, style]);
  const warungId = w?.id;
  const trees = useMemo((): TreeSpot[] => {
    if (warungId == null) return [];
    const [ox, oy, oz] = warungOrigin(warungId);
    return TREE_SPOTS.map(([x, z, seed]) => ({ x: ox + x, y: oy, z: oz + z, scale: 0.7, seed }));
  }, [warungId]);
  const stockSig = productSignature(w?.stock, maxStock);
  const stockRef = useRef(w?.stock);
  stockRef.current = w?.stock;
  const products = useMemo(
    () => (stockSig && stockRef.current ? productParts(stockRef.current, catalog, maxStock) : []),
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
          <CuboidCollider args={[2.3, 0.78, 0.5]} position={[0, 0.78, -1]} />
          <CuboidCollider args={[6, 1.3, 0.35]} position={[0, 1.3, -4.5]} />
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
