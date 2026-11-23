/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { Group } from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NPC_AVATARS } from "@/identity/characters";
import { vehicleSeatAnchor } from "@/game/vehicles/definitions";
import { bikeModel } from "@/game/vehicles/model";
import { ownVehicle, renderedVehicles } from "@/game/vehicles/runtime";
import { useNpcImpact } from "@/game/traffic/useNpcImpact";
import { ImpactVfx } from "@/game/traffic/ImpactReaction";
import { NPC_KNOCK_SECONDS } from "@/game/traffic/npc-impact";
import { PersonCollider } from "@/game/physics/PersonCollider";
import { passengerFor } from "./passenger";
import { BOARDING_MS, ojekTick, passengerPoll, useOjek, type OjekOrder } from "./store";

const PASSENGER_AVATARS = [
  "npc-pedestrian-1",
  "npc-shopper-1",
  "npc-pedestrian-2",
  "npc-shopper-2",
];

/** The NPC passenger: waits at pickup, walks to the stopped bike, then rides on the back seat. */
function Passenger({ order }: { order: OjekOrder }) {
  const ref = useRef<Group>(null);
  const body = useRef<Group>(null);
  const picked = useOjek((s) => s.picked);
  const npcId = `ojek-passenger-${order.id}`;
  const { hit, knocked } = useNpcImpact(npcId, ref, body, picked !== order.id, () => {
    useOjek.setState({
      boardingUntil: null,
      passengerDownUntil: Date.now() + NPC_KNOCK_SECONDS * 1000,
    });
  });
  const anim = useRef<AvatarAnimation | undefined>("Idle");
  const speed = useRef(0);
  const who = passengerFor(order.id);
  const remark = useOjek((s) => s.remark);
  const avatar = NPC_AVATARS[PASSENGER_AVATARS[order.id % PASSENGER_AVATARS.length]!];

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    if (!hit.current.recovered) {
      anim.current = "Idle";
      speed.current = 0;
      return;
    }
    const { picked, boardingUntil } = useOjek.getState();
    const v = ownVehicle();
    const pose = v && bikeModel(v.model) ? (renderedVehicles.get(v.id) ?? v.pose) : null;
    const seat = v && pose ? vehicleSeatAnchor(v.model, pose, 1) : null;
    const aboard = picked === order.id;
    g.visible = !aboard || !!seat;
    if (aboard && seat) {
      // The anchor is the physics root; the avatar root sits .83 below it (as for players).
      g.position.set(seat.x, seat.y - 0.83, seat.z);
      g.rotation.set(0, seat.ry, seat.rz);
      anim.current = "RideBike";
      speed.current = 0;
    } else if (boardingUntil && seat) {
      // Walk from the kerb to the back seat while the driver waits.
      const u = Math.min(1, 1 - (boardingUntil - Date.now()) / BOARDING_MS);
      const { x, z } = order.pickup;
      g.position.set(x + (seat.x - x) * u, 0.06, z + (seat.z - z) * u);
      g.rotation.set(0, Math.atan2(seat.x - x, seat.z - z), 0);
      anim.current = "Walk";
      speed.current = 1.4;
    } else {
      g.position.set(order.pickup.x, 0.06, order.pickup.z);
      g.rotation.set(0, 0, 0);
      anim.current = "Idle";
      speed.current = 0;
    }
  });

  const bubble = remark && remark.until > Date.now() ? remark.text : null;
  return (
    <>
      <group ref={ref} name="OjekPassenger">
        <group ref={body}>
          <BaseAvatarV2 avatar={avatar} animation={anim} speed={speed} groundToWorld={false} />
        </group>
        {knocked && <ImpactVfx hit={hit} />}
        <Text
          position={[0, 2.4, 0]}
          fontSize={0.21}
          color={bubble ? "#7a2e12" : "#1f6b3a"}
          outlineWidth={0.02}
          outlineColor="#fffaf3"
          maxWidth={4}
          textAlign="center"
        >
          {bubble ? `🗣️ ${bubble}` : `🛵 ${who.label} → ${order.dropoff.name}`}
        </Text>
      </group>
      <PersonCollider target={ref} npcId={npcId} disabled={knocked || picked === order.id} />
    </>
  );
}

/** NPC passenger plus the ojek arrival/poll loops (driver ticks 2×/s, passenger polls every 4 s). */
export function OjekPassenger() {
  const order = useOjek((s) => s.data?.ojek.order);
  const working = useOjek(
    (s) => s.onBid || !!(s.data?.ojek.offer || s.data?.ojek.order || s.data?.ojek.job),
  );
  const riding = useOjek((s) => !!s.data?.ojek.ride);

  useEffect(() => {
    if (!working) return;
    const t = setInterval(ojekTick, 500);
    return () => clearInterval(t);
  }, [working]);
  useEffect(() => {
    if (!riding) return;
    const t = setInterval(passengerPoll, 4000);
    return () => clearInterval(t);
  }, [riding]);

  return order ? <Passenger key={order.id} order={order} /> : null;
}
