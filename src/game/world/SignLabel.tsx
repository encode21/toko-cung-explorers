/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
import { useMemo, useState } from "react";
import * as THREE from "three";

type Measured = THREE.Mesh & { textRenderInfo?: { blockBounds: ArrayLike<number> } };

function pill(width: number, height: number) {
  const r = height / 2,
    x = width / 2;
  const s = new THREE.Shape();
  s.moveTo(-x + r, -r);
  s.lineTo(x - r, -r);
  s.absarc(x - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-x + r, r);
  s.absarc(-x + r, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
  return new THREE.ShapeGeometry(s, 12);
}

/**
 * The one readable world-label style: always faces the camera, bold light text on a dark pill.
 * Use it for floating place labels (halte, stalls, jobs) instead of bare <Text>.
 */
export function SignLabel({
  position,
  children,
  size = 0.3,
  accent = "#1f2d27",
}: {
  position: [number, number, number];
  children: string;
  size?: number;
  /** Pill colour; keep it dark so the light text stays readable on any background. */
  accent?: string;
}) {
  const [width, setWidth] = useState(0);
  const height = size * 1.7;
  const geometry = useMemo(() => (width ? pill(width + height, height) : null), [width, height]);
  return (
    <Billboard position={position}>
      {geometry && (
        <mesh geometry={geometry} position-z={-0.01}>
          <meshBasicMaterial color={accent} transparent opacity={0.88} depthWrite={false} />
        </mesh>
      )}
      <Text
        fontSize={size}
        fontWeight={700}
        color="#fff8e6"
        anchorX="center"
        anchorY="middle"
        maxWidth={6}
        textAlign="center"
        onSync={(mesh: Measured) => {
          const b = mesh.textRenderInfo?.blockBounds;
          if (b) setWidth(b[2]! - b[0]!);
        }}
      >
        {children}
      </Text>
    </Billboard>
  );
}
