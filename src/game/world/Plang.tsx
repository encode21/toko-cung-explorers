/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useState } from "react";
import * as THREE from "three";

type Measured = THREE.Mesh & { textRenderInfo?: { blockBounds: ArrayLike<number> } };
const FRAME = 0.06;

/**
 * A physical, auto-sized sign (plang) so no label floats in the air.
 * - wall: board flat on a facade, `position` = board centre on the wall surface, +z faces out.
 * - post: free-standing on posts, `position` = ground point under the board centre.
 * - hanging: board hung from two rods, `position` = board centre (rods go up to the canopy).
 */
export function Plang({
  text,
  sub,
  position,
  rotationY = 0,
  mode = "wall",
  board = "#24533c",
  textColor = "#fff1d4",
  subColor,
  size = 0.3,
  twoSided = false,
  withCollider = false,
  neon = false,
}: {
  text: string;
  sub?: string;
  position: [number, number, number];
  rotationY?: number;
  mode?: "wall" | "post" | "hanging";
  board?: string;
  textColor?: string;
  subColor?: string;
  /** Font size of the main line. */
  size?: number;
  twoSided?: boolean;
  /** Post mode only: solid posts. */
  withCollider?: boolean;
  /** Unlit glowing text (neon). */
  neon?: boolean;
}) {
  const [tw, setTw] = useState(0);
  const [sw, setSw] = useState(0);
  const measure = (set: (w: number) => void) => (mesh: Measured) => {
    const b = mesh.textRenderInfo?.blockBounds;
    if (b) set(b[2]! - b[0]!);
  };
  const subSize = size * 0.55;
  const w = Math.max(tw, sw) + size * 1.1;
  const h = size * 1.5 + (sub ? subSize * 1.5 : 0);
  const depth = mode === "wall" ? 0.05 : 0.1;
  const baseY = mode === "post" ? 1 + size * 1.5 : 0;
  const cy = baseY + (mode === "post" ? h / 2 : 0);
  const mainY = sub ? h / 2 - size * 0.8 : 0;
  const frame = `#${new THREE.Color(board).offsetHSL(0, 0, 0.12).getHexString()}`;
  const faces = twoSided && mode !== "wall" ? [0, Math.PI] : [0];
  const postX = w > 1.8 ? w / 2 - 0.15 : 0;
  const postXs = postX ? [-postX, postX] : [0];
  const z0 = mode === "wall" ? depth / 2 : 0;
  return (
    <group position={position} rotation-y={rotationY}>
      <group position={[0, cy, z0]}>
        <mesh castShadow>
          <boxGeometry args={[w, h, depth]} />
          <meshStandardMaterial color={board} roughness={0.7} />
        </mesh>
        {/* Frame: four thin rails, a shade darker than the board. */}
        {[
          [0, h / 2, w + FRAME, FRAME],
          [0, -h / 2, w + FRAME, FRAME],
          [-w / 2, 0, FRAME, h],
          [w / 2, 0, FRAME, h],
        ].map(([x, y, fw, fh], i) => (
          <mesh key={i} position={[x!, y!, 0]}>
            <boxGeometry args={[fw!, fh!, depth + 0.03]} />
            <meshStandardMaterial color={frame} roughness={0.8} />
          </mesh>
        ))}
        {faces.map((ry) => (
          <group key={ry} rotation-y={ry}>
            <Text
              position={[0, mainY, depth / 2 + 0.016]}
              fontSize={size}
              fontWeight={700}
              color={textColor}
              anchorX="center"
              anchorY="middle"
              maxWidth={9}
              textAlign="center"
              onSync={measure(setTw)}
            >
              {text}
              {neon && <meshBasicMaterial color={textColor} toneMapped={false} />}
            </Text>
            {sub && (
              <Text
                position={[0, -h / 2 + subSize * 1.0, depth / 2 + 0.016]}
                fontSize={subSize}
                fontWeight={700}
                color={subColor ?? textColor}
                anchorX="center"
                anchorY="middle"
                maxWidth={9}
                textAlign="center"
                onSync={measure(setSw)}
              >
                {sub}
              </Text>
            )}
          </group>
        ))}
        {mode === "hanging" &&
          [-1, 1].map((s) => (
            <mesh key={s} position={[s * (w / 2 - 0.12), h / 2 + 0.2, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.5} />
            </mesh>
          ))}
      </group>
      {mode === "post" && (
        <>
          {postXs.map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, (cy - h / 2) / 2 + 0.05, -depth / 2 - 0.06]} castShadow>
                <boxGeometry args={[0.12, cy - h / 2 + 0.1, 0.12]} />
                <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.06, -depth / 2 - 0.06]}>
                <boxGeometry args={[0.3, 0.12, 0.3]} />
                <meshStandardMaterial color="#b8a888" roughness={0.9} />
              </mesh>
            </group>
          ))}
          {withCollider && (
            <RigidBody type="fixed" colliders={false}>
              {postXs.map((x) => (
                <CuboidCollider
                  key={x}
                  args={[0.15, (cy - h / 2) / 2 + 0.1, 0.15]}
                  position={[x, (cy - h / 2) / 2 + 0.1, -depth / 2 - 0.06]}
                />
              ))}
            </RigidBody>
          )}
        </>
      )}
    </group>
  );
}
