/** @jsxImportSource @/game/jsx */
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { shelfById } from "@/game/world/layout";
import { useGame } from "@/state/game-store";

/** Penanda arah yang dipasang NPC/AI lewat action SHOW_WAYPOINT. */
export function Waypoint() {
  const waypoint = useGame((s) => s.waypoint);
  const ref = useRef<THREE.Group>(null);
  const zone = waypoint ? shelfById(waypoint) : undefined;

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y += delta * 1.6;
    g.position.y = 3 + Math.sin(state.clock.elapsedTime * 2.2) * 0.18;
  });

  if (!zone) return null;

  return (
    <group ref={ref} position={[zone.position[0], 3, zone.position[2]]}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.45, 0.9, 4]} />
        <meshStandardMaterial color="#f2a33c" emissive="#f2a33c" emissiveIntensity={1.2} />
      </mesh>
      <pointLight color="#f2a33c" intensity={6} distance={7} />
    </group>
  );
}
