/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { useGame } from "@/state/game-store";
import { currentWeather } from "@/game/weather/store";
import { isGangPosition } from "@/game/gang/store";

const ENTER_R = 0.9,
  REARM_R = 1.8;

/**
 * GTA-style yellow ground marker: walking into it triggers `onEnter` once; it re-arms after
 * the player steps away. Used for doors (rumah) so it never looks like a shop button.
 */
export function EntryRing({
  position,
  label,
  onEnter,
}: {
  position: [number, number, number];
  label: string;
  onEnter: () => unknown;
}) {
  const root = useRef<Group>(null);
  const pulse = useRef<Mesh>(null);
  const column = useRef<Group>(null);
  const armed = useRef(false);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const s = 1 + (t % 1.2) * 0.35;
    if (pulse.current) {
      pulse.current.scale.set(s, s, 1);
      (pulse.current.material as MeshBasicMaterial).opacity = 0.6 * (1 - (t % 1.2) / 1.2);
    }
    if (column.current) column.current.position.y = 0.05 * Math.sin(t * 2);
    // Float on top of gang flood water (see weather/Flood.tsx) so the marker is never submerged.
    if (root.current)
      root.current.position.y =
        0.03 + (isGangPosition(position[0], position[2]) ? currentWeather().flood * 0.34 : 0);
    const p = useGame.getState().playerPos;
    const d = Math.hypot(p[0] - position[0], p[2] - position[2]);
    if (d > REARM_R) armed.current = true;
    else if (d < ENTER_R && armed.current && !useGame.getState().pendingTeleport) {
      armed.current = false;
      void onEnter();
    }
  });
  return (
    <group ref={root} position={[position[0], 0.03, position[2]]}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.7, 0.85, 48]} />
        <meshBasicMaterial color="#ffd23f" transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.7, 48]} />
        <meshBasicMaterial color="#ffd23f" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <mesh ref={pulse} rotation-x={-Math.PI / 2} position-y={0.01}>
        <ringGeometry args={[0.8, 0.88, 48]} />
        <meshBasicMaterial color="#fff2a8" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <group ref={column}>
        <mesh position-y={0.7}>
          <cylinderGeometry args={[0.7, 0.7, 1.4, 32, 1, true]} />
          <meshBasicMaterial
            color="#ffd23f"
            transparent
            opacity={0.12}
            depthWrite={false}
            side={2}
          />
        </mesh>
        <Billboard position-y={1.9}>
          <Text fontSize={0.26} color="#fff6d0" outlineWidth={0.03} outlineColor="#5a4300">
            {label}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}
