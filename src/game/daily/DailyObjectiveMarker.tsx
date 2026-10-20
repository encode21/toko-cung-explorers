/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { useWorldGuidanceTarget } from "@/game/core/use-world-guidance";
import { useGame } from "@/state/game-store";
import { useDailyTarget } from "./use-daily-target";

/** The tracked daily target remains visible in the world without opening a sheet. */
export function DailyObjectiveMarker() {
  const daily = useDailyTarget();
  const muted = useGame((s) => s.guidanceMuted);
  const guidance = useWorldGuidanceTarget();
  const reducedMotion = useRef(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotion.current = preference.matches;
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const ring = useRef<Mesh>(null);
  const badge = useRef<Group>(null);
  useFrame(({ clock }) => {
    const reduced = reducedMotion.current;
    const phase = reduced ? 0.25 : (clock.elapsedTime * 0.7) % 1;
    if (ring.current) {
      ring.current.scale.setScalar(1 + phase * 0.65);
      (ring.current.material as MeshBasicMaterial).opacity = 0.65 * (1 - phase);
    }
    if (badge.current)
      badge.current.position.y = 2.3 + (reduced ? 0 : Math.sin(clock.elapsedTime * 3) * 0.1);
  });
  const objective = daily?.objective;
  if (
    muted ||
    !daily ||
    !objective?.position ||
    !guidance ||
    guidance.realm !== "WORLD" ||
    guidance.objective?.targetId !== (objective.targetId ?? objective.navigationTargetId)
  )
    return null;
  return (
    <group
      position={guidance.position}
      name="DailyQuestPulse"
      userData={{ ignoreCameraCollision: true }}
    >
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.16, 0]}>
        <ringGeometry args={[0.6, 0.72, 40]} />
        <meshBasicMaterial
          color="#ffa415"
          transparent
          opacity={0.6}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <group ref={badge} position={[0, 2.3, 0]}>
        <Billboard>
          <mesh rotation-z={Math.PI / 4}>
            <planeGeometry args={[0.48, 0.48]} />
            <meshBasicMaterial color="#ffa415" toneMapped={false} side={2} />
          </mesh>
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.3}
            color="#fffdf8"
            outlineWidth={0.012}
            outlineColor="#79584d"
          >
            {daily.claim ? "✓" : "!"}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}
