/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGame } from "@/state/game-store";

const SHOW = 4.2;
const FULL = 2.6;
const v = new THREE.Vector3();

/** Label nama kecil di atas NPC — muncul halus hanya saat pemain dekat. */
export function NpcLabel({ text, height = 2.08 }: { text: string; height?: number }) {
  const ref = useRef<THREE.Group>(null);
  const opacity = useRef(0);
  const [name, role] = text.split(" · ");

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.getWorldPosition(v);
    const [x, , z] = useGame.getState().playerPos;
    const d = Math.hypot(v.x - x, v.z - z);
    const target = d > SHOW ? 0 : d < FULL ? 1 : 1 - (d - FULL) / (SHOW - FULL);
    const s = THREE.MathUtils.damp(opacity.current, target, 10, dt);
    opacity.current = s;
    g.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((m) => {
        m.transparent = true;
        m.opacity = s;
        m.depthWrite = false;
      });
    });
    g.visible = s > 0.02;
  });

  return (
    <Billboard position={[0, height, 0]} userData={{ ignoreCameraCollision: true }}>
      <group ref={ref} visible={false}>
        <Text
          fontSize={0.14}
          color="#ffffff"
          outlineColor="#1e2a44"
          outlineWidth={0.012}
          anchorY="bottom"
        >
          {name}
        </Text>
        {role && (
          <Text
            position={[0, -0.02, 0]}
            fontSize={0.09}
            color="#dbe7f5"
            outlineColor="#1e2a44"
            outlineWidth={0.01}
            anchorY="top"
          >
            {role}
          </Text>
        )}
        <Text
          position={[0, -0.15, 0]}
          fontSize={0.075}
          color="#f5d799"
          outlineColor="#1e2a44"
          outlineWidth={0.008}
          anchorY="top"
        >
          Ajak bicara
        </Text>
      </group>
    </Billboard>
  );
}
