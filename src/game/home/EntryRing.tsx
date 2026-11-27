/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { useGame } from "@/state/game-store";
import { floodSurfaceAt } from "@/game/weather/flood-surface";
import { currentWeather } from "@/game/weather/store";

const ENTER_R = 0.9,
  REARM_R = 1.8;

/**
 * GTA-style yellow ground marker: walking into it triggers `onEnter` once; it re-arms after
 * the player steps away. Without onEnter it marks an entrance with its existing nearby action.
 */
export function EntryRing({
  position,
  label,
  onEnter,
  canEnter,
  groundY = 0,
  labelMinCameraDistance = 0,
}: {
  position: [number, number, number];
  label: string;
  onEnter?: () => unknown;
  canEnter?: () => boolean;
  groundY?: number;
  labelMinCameraDistance?: number;
}) {
  const root = useRef<Group>(null);
  const pulse = useRef<Mesh>(null);
  const column = useRef<Group>(null);
  const caption = useRef<Group>(null);
  const armed = useRef(false);
  const lastPosition = useRef<[number, number] | null>(null);
  const disc = useRef<MeshBasicMaterial>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    const s = 1 + (t % 1.2) * 0.35;
    if (pulse.current) {
      pulse.current.scale.set(s, s, 1);
      (pulse.current.material as MeshBasicMaterial).opacity = 0.6 * (1 - (t % 1.2) / 1.2);
    }
    if (column.current) column.current.position.y = 0.05 * Math.sin(t * 2);
    // Keep the marker above the same water that the player wades through.
    const weather = currentWeather();
    const surface = floodSurfaceAt(position[0], position[2], weather.flood);
    const flood = surface === null ? 0 : weather.flood;
    if (root.current) {
      root.current.position.y = Math.max(groundY, surface ?? groundY) + 0.03;
      root.current.renderOrder = flood > 0 ? 2 : 0;
      if (caption.current && labelMinCameraDistance > 0) {
        const distance = Math.hypot(
          camera.position.x - position[0],
          camera.position.y - root.current.position.y - 1.9,
          camera.position.z - position[2],
        );
        caption.current.visible = distance >= labelMinCameraDistance;
      }
    }
    if (disc.current) disc.current.opacity = 0.25 + flood * 0.45;
    if (glow.current) glow.current.opacity = 0.12 + flood * 0.33;
    const p = useGame.getState().playerPos;
    const d = Math.hypot(p[0] - position[0], p[2] - position[2]);
    if (root.current) root.current.visible = d < 85;
    if (!onEnter) return;
    const last = lastPosition.current;
    lastPosition.current = [p[0], p[2]];
    if (
      useGame.getState().pendingTeleport ||
      (last && Math.hypot(p[0] - last[0], p[2] - last[1]) > 8)
    ) {
      armed.current = false;
      return;
    }
    if (d > REARM_R) armed.current = true;
    else if (
      d < ENTER_R &&
      Math.abs(p[1] - groundY - 0.83) < 1.5 &&
      armed.current &&
      (!canEnter || canEnter()) &&
      !useGame.getState().pendingTeleport
    ) {
      armed.current = false;
      void onEnter();
    }
  });
  return (
    <group
      ref={root}
      name={`EntryRing:${label}`}
      position={[position[0], groundY + 0.03, position[2]]}
    >
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.7, 0.85, 48]} />
        <meshBasicMaterial color="#ffd23f" transparent opacity={0.95} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.7, 48]} />
        <meshBasicMaterial
          ref={disc}
          color="#ffd23f"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
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
            ref={glow}
            opacity={0.12}
            depthWrite={false}
            side={2}
          />
        </mesh>
        <Billboard ref={caption} position-y={1.9}>
          <Text fontSize={0.26} color="#fff6d0" outlineWidth={0.03} outlineColor="#5a4300">
            {label}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}
