/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Shape, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { PLAYER_VISUAL_DROP } from "@/game/world/street-props";
import { useGame } from "@/state/game-store";
import { useDungeon } from "@/game/dungeon/store";
import { resolveObjective } from "@/game/editor/resolve";
import { worldLandmarkFor } from "@/game/world/landmarks";
import { useGameCore } from "./store";
import { questGuidanceTarget } from "./quest-guidance";

// Flat chevron: local -Y maps to world +Z after laying it onto the ground.
const pointer = new Shape();
pointer.moveTo(0, -1.7);
pointer.lineTo(-0.4, -1.08);
pointer.lineTo(0, -1.28);
pointer.lineTo(0.4, -1.08);
pointer.closePath();

/** World-space HUD: road paint/sidewalks sit above the physics floor.
 * Depth-independent transparent materials keep these local guidance marks legible
 * without changing the character, collision floor or street geometry.
 */
export function QuestGuidance() {
  const snapshot = useGameCore((s) => s.snapshot);
  const dungeon = useDungeon((s) => s.data);
  const target = questGuidanceTarget(snapshot, dungeon);
  const feet = useRef<Group>(null);
  const arrow = useRef<Group>(null);
  const halo = useRef<Group>(null);
  const inner = useRef<Mesh>(null);
  const outer = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!target || !feet.current || !arrow.current || !halo.current) return;
    const resolved = target.objective ? resolveObjective(target.objective) : null;
    const position = resolved
      ? target.realm === "WORLD" && !resolved.targetId
        ? worldLandmarkFor(resolved.target, resolved.position)
        : resolved.position
      : target.position;
    const valid = position?.length === 3 && position.every(Number.isFinite);
    feet.current.visible = halo.current.visible = valid;
    if (!valid) return;

    const [x, y, z] = useGame.getState().playerPos;
    const dx = position[0] - x;
    const dz = position[2] - z;
    const distance = Math.hypot(dx, dz);
    const t = clock.elapsedTime;
    // Hide the direction at the destination, leaving the pulsing clue visible.
    arrow.current.visible = distance > 0.8;
    feet.current.position.set(x, y - PLAYER_VISUAL_DROP + 0.055, z);
    arrow.current.rotation.y = Math.atan2(dx, dz);
    halo.current.position.set(position[0], position[1] + 0.08, position[2]);
    [inner.current, outer.current].forEach((ring, index) => {
      if (!ring) return;
      const phase = (t * 0.65 + index * 0.5) % 1;
      ring.scale.setScalar(0.65 + phase * 1.5);
      (ring.material as MeshBasicMaterial).opacity = (1 - phase) * 0.65;
    });
  });

  if (!target) return null;
  return (
    <group>
      <group name="quest-foot-guidance" ref={feet} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={19}>
          <ringGeometry args={[0.82, 0.96, 64]} />
          <meshBasicMaterial
            color="#ffdc83"
            transparent
            opacity={1}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={18}>
          <ringGeometry args={[0.78, 1.01, 64]} />
          <meshBasicMaterial
            color="#382713"
            transparent
            opacity={0.8}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <group name="quest-direction" ref={arrow}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={20}>
            <shapeGeometry args={[pointer]} />
            <meshBasicMaterial
              color="#ffe28a"
              transparent
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>
      <group ref={halo} visible={false}>
        {[inner, outer].map((ref, index) => (
          <mesh key={index} ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.65, 0.74, 48]} />
            <meshBasicMaterial
              color="#ffd568"
              transparent
              opacity={0}
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
