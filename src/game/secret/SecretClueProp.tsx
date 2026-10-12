/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { useGameCore } from "@/game/core/store";

/**
 * Environmental secret trace: scrap of paper + gold sparkle.
 * Only the active secret objective is shown (not a loud quest waypoint).
 */
export function SecretClueProp() {
  const snapshot = useGameCore((s) => s.snapshot);
  const bob = useRef<Group>(null);
  const spark = useRef<Mesh>(null);
  const run = snapshot?.active;
  const quest = snapshot?.quests.find((q) => q.id === run?.quest_id);
  const index =
    quest?.objectives.findIndex((o, i) => (run?.progress[i] ?? 0) < o.required) ?? -1;
  const objective = index >= 0 ? quest?.objectives[index] : null;
  const show =
    !!objective &&
    (!!objective.secret || quest?.category === "EASTER_EGG") &&
    !(quest?.dungeon_id && objective.realm !== "WORLD");

  useFrame(({ clock }) => {
    if (!show || !bob.current || !spark.current) return;
    const t = clock.elapsedTime;
    bob.current.position.y = Math.sin(t * 2.4) * 0.06;
    bob.current.rotation.y = t * 0.5;
    const pulse = 0.55 + (Math.sin(t * 5) * 0.5 + 0.5) * 1.1;
    const mat = spark.current.material as {
      emissiveIntensity?: number;
      opacity?: number;
    };
    if ("emissiveIntensity" in mat) mat.emissiveIntensity = pulse;
    if ("opacity" in mat) mat.opacity = 0.55 + pulse * 0.3;
  });

  if (!show || !objective?.position || objective.position.length < 3) return null;

  const [x, , z] = objective.position;
  const talk = objective.type === "TALK";
  const ox = talk ? 0.5 : 0;
  const oz = talk ? 0.25 : 0;

  return (
    <group position={[x, 0, z]}>
      <group ref={bob} position={[ox, 0, oz]}>
        {/* Scrap of paper */}
        <mesh position={[0.05, 0.05, 0]} rotation={[-Math.PI / 2.1, 0.15, 0.4]}>
          <planeGeometry args={[0.34, 0.42]} />
          <meshStandardMaterial color="#f7e9c8" roughness={0.8} metalness={0.04} />
        </mesh>
        <mesh position={[0.05, 0.055, 0]} rotation={[-Math.PI / 2.1, 0.15, 0.4]}>
          <planeGeometry args={[0.22, 0.05]} />
          <meshBasicMaterial color="#c4a574" />
        </mesh>
        <mesh position={[0.05, 0.055, -0.08]} rotation={[-Math.PI / 2.1, 0.15, 0.4]}>
          <planeGeometry args={[0.2, 0.035]} />
          <meshBasicMaterial color="#d2b48c" />
        </mesh>

        {/* Bright gold sparkle — readable from across the lot */}
        <mesh ref={spark} position={[0, 0.85, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial
            color="#ffe9a0"
            emissive="#f5b400"
            emissiveIntensity={1.1}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.1, 0]} />
          <meshBasicMaterial color="#fff8de" transparent opacity={0.7} depthWrite={false} />
        </mesh>

        {/* Soft vertical beam */}
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.04, 0.09, 1.0, 8]} />
          <meshBasicMaterial color="#f6c453" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ox, 0.03, oz]}>
        <ringGeometry args={[0.4, 0.7, 28]} />
        <meshBasicMaterial color="#f6c453" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}
