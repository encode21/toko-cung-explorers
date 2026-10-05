/** @jsxImportSource @/game/jsx */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** Awan blocky gaya Roblox — kotak bertumpuk, kontras jelas di langit. */
function RobloxCloud({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const chunks: [number, number, number, number, number, number][] = [
    [0, 0, 0, 10, 3.2, 5.5],
    [-5.5, 0.2, 0.4, 6.5, 2.6, 4.2],
    [5.2, 0.15, -0.3, 6.2, 2.5, 4],
    [-1.5, 1.4, 0.2, 5.5, 2.4, 3.6],
    [2.2, 1.2, -0.4, 4.8, 2.2, 3.4],
    [0.4, 2.2, 0, 3.6, 1.8, 2.8],
  ];
  return (
    <group position={position} scale={scale}>
      {chunks.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={i} position={[x, y, z]} castShadow={false}>
          <boxGeometry args={[sx, sy, sz]} />
          <meshBasicMaterial color={i % 3 === 0 ? "#ffffff" : "#f4f7fb"} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Vertex-colored sky + blocky drifting clouds. */
export function SkyEnvironment() {
  const clouds = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(210, 24, 16);
    const positions = g.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    const blue = new THREE.Color("#6aa8de");
    const horizon = new THREE.Color("#cfe8f4");
    const c = new THREE.Color();
    for (let i = 0; i < positions.count; i++) {
      c.copy(horizon).lerp(blue, Math.max(0, positions.getY(i) / 210));
      c.toArray(colors, i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    if (!clouds.current) return;
    clouds.current.position.x = Math.sin(clock.elapsedTime * 0.012) * 8;
    clouds.current.rotation.y = clock.elapsedTime * 0.004;
  });

  return (
    <group userData={{ ignoreCameraCollision: true }}>
      <mesh geometry={geometry}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      <group ref={clouds}>
        <RobloxCloud position={[-28, 34, -42]} scale={1.15} />
        <RobloxCloud position={[36, 38, -55]} scale={1.35} />
        <RobloxCloud position={[8, 42, -70]} scale={1.6} />
        <RobloxCloud position={[-55, 36, 10]} scale={1.2} />
        <RobloxCloud position={[60, 40, 25]} scale={1.4} />
        <RobloxCloud position={[-20, 44, 55]} scale={1.25} />
        <RobloxCloud position={[45, 36, 60]} scale={1.1} />
        <RobloxCloud position={[-70, 40, -20]} scale={1.5} />
      </group>
    </group>
  );
}
