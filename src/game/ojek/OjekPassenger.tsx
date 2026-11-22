/** @jsxImportSource @/game/jsx */
import { useEffect } from "react";
import { Text } from "@react-three/drei";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { ojekTick, useOjek } from "./store";

const PASSENGER_AVATARS = [
  "npc-pedestrian-1",
  "npc-shopper-1",
  "npc-pedestrian-2",
  "npc-shopper-2",
];

/** Waiting passenger at the pickup spot (reuses an NPC avatar) plus the arrival check loop. */
export function OjekPassenger() {
  const order = useOjek((s) => s.data?.ojek.order);
  const waiting = useOjek((s) => !!order && s.picked !== order.id);

  useEffect(() => {
    if (!order) return;
    const t = setInterval(ojekTick, 500);
    return () => clearInterval(t);
  }, [order]);

  if (!order || !waiting) return null;
  const avatar = NPC_AVATARS[PASSENGER_AVATARS[order.id % PASSENGER_AVATARS.length]!];
  return (
    <group name="OjekPassenger" position={[order.pickup.x, 0.06, order.pickup.z]}>
      <BaseAvatarV2 avatar={avatar} animation="Idle" speed={0} groundToWorld />
      <Text
        position={[0, 2.4, 0]}
        fontSize={0.21}
        color="#1f6b3a"
        outlineWidth={0.02}
        outlineColor="#fffaf3"
      >
        {`🛵 Penumpang → ${order.dropoff.name}`}
      </Text>
    </group>
  );
}
