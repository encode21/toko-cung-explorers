/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NPC_AVATARS } from "@/identity/characters";
import { busPose, useBusRide } from "./bus-ride";
import type { BusStop } from "./bus-routes";
const LOOKS = ["npc-shopper-1", "npc-pedestrian-2", "npc-shopper-3"];
function Passenger({ stop, index }: { stop: BusStop; index: number }) {
  const ref = useRef<Group>(null);
  const animation = useRef<AvatarAnimation | undefined>("Idle");
  const speed = useRef(0);
  useFrame(() => {
    if (!ref.current) return;
    const state = useBusRide.getState();
    const boarding = state.phase === "boarding" && state.stop?.id === stop.id;
    const t = boarding
      ? Math.min(1, Math.max(0, (busPose.stopElapsed - 0.6 - index * 1.2) / 1.2))
      : 0;
    const length = state.compact ? 8 / 11 : 1;
    const doorX = stop.pose.x + Math.cos(stop.yaw) * 1.28 + Math.sin(stop.yaw) * 4.67 * length;
    const doorZ = stop.pose.z - Math.sin(stop.yaw) * 1.28 + Math.cos(stop.yaw) * 4.67 * length;
    const x = stop.board[0] + Math.sin(stop.yaw) * (3.4 - index * 0.8);
    const z = stop.board[2] + Math.cos(stop.yaw) * (3.4 - index * 0.8);
    ref.current.visible = t < 1 && Math.hypot(busPose.x - x, busPose.z - z) < 55;
    ref.current.position.set(x + (doorX - x) * t, 0.08 + t * 0.25, z + (doorZ - z) * t);
    ref.current.rotation.y = Math.atan2(doorX - x, doorZ - z);
    animation.current = t > 0 ? "Walk" : "Idle";
    speed.current = t > 0 ? 1.5 : 0;
  });
  return (
    <group ref={ref} name={`bus-passenger-${stop.id}-${index}`}>
      <BaseAvatarV2
        avatar={NPC_AVATARS[LOOKS[index % LOOKS.length]!]}
        animation={animation}
        speed={speed}
        groundToWorld={false}
      />
    </group>
  );
}
/** Decorative passengers have no wallets, rewards or shared NPC ownership. */
export function BusPassengers() {
  const queues = useBusRide((s) => s.queues);
  return (
    <group name="BusStopPassengers">
      {queues
        .filter((q) => !q.boarded)
        .flatMap((q) =>
          Array.from({ length: q.count }, (_, i) => (
            <Passenger key={`${q.stop.id}:${i}`} stop={q.stop} index={i} />
          )),
        )}
    </group>
  );
}
