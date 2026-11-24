/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import { currentWeather } from "./store";

/** Banjir gang: muddy water over the gang land, rising with the weather (scene-local coordinates). */
export function Flood({ width, from, to }: { width: number; from: number; to: number }) {
  const mesh = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const w = mesh.current;
    if (!w) return;
    const flood = currentWeather().flood;
    w.visible = flood > 0.02;
    if (!w.visible) return;
    w.position.y = 0.02 + flood * 0.32 + Math.sin(clock.elapsedTime * 1.3) * 0.01;
    (w.material as MeshStandardMaterial).opacity = 0.35 + flood * 0.35;
  });
  return (
    <mesh ref={mesh} position={[0, 0, (from + to) / 2]} rotation-x={-Math.PI / 2} visible={false}>
      <planeGeometry args={[width, to - from]} />
      <meshStandardMaterial
        color="#7b6a4c"
        roughness={0.15}
        metalness={0.1}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}
