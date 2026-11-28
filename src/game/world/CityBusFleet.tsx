/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import type { Group } from "three";
import { trafficVehicles } from "@/game/traffic/traffic-runtime";
import { LOW_QUALITY } from "@/game/engine/quality";
import { useGame } from "@/state/game-store";
import { BusModel } from "./BusModel";
import { busNow, busTimetable, useBusService } from "./bus-service";
import { CITY_FLEET, fleetPose } from "./bus-fleet";

/** Phones draw a fleet bus only near the player; its collider and traffic pose stay live. */
const DRAW_RANGE = LOW_QUALITY ? 70 : 160;

function FleetBus({ id, shift }: { id: string; shift: number }) {
  const group = useRef<Group>(null);
  const body = useRef<RapierRigidBody>(null);
  const wheels = useRef({ wheelAngle: 0, steer: 0, door: 0 });
  useEffect(() => () => void trafficVehicles.delete(id), [id]);
  useFrame(() => {
    const synced = useBusService.getState().synced;
    const rb = body.current;
    if (rb?.isValid()) rb.setEnabled(synced);
    if (!synced) {
      if (group.current) group.current.visible = false;
      trafficVehicles.delete(id);
      return;
    }
    const pose = fleetPose(shift, busNow(), busTimetable());
    wheels.current.wheelAngle = pose.distance / 0.55;
    wheels.current.door = pose.door;
    const rotation = { x: 0, y: Math.sin(pose.yaw / 2), z: 0, w: Math.cos(pose.yaw / 2) };
    if (rb?.isValid()) {
      // Teleport on the first frame / after a clock resync instead of sweeping across the city.
      if (Math.hypot(rb.translation().x - pose.x, rb.translation().z - pose.z) > 20) {
        rb.setTranslation({ x: pose.x, y: 0, z: pose.z }, true);
        rb.setRotation(rotation, true);
      } else {
        rb.setNextKinematicTranslation({ x: pose.x, y: 0, z: pose.z });
        rb.setNextKinematicRotation(rotation);
      }
    }
    trafficVehicles.set(id, {
      x: pose.x,
      z: pose.z,
      dx: Math.sin(pose.yaw),
      dz: Math.cos(pose.yaw),
      speed: pose.speed,
      halfWidth: 1.25,
      halfLength: 5.5,
    });
    const g = group.current;
    if (!g) return;
    const p = useGame.getState().playerPos;
    g.visible = Math.hypot(pose.x - p[0]!, pose.z - p[2]!) < DRAW_RANGE;
    g.position.set(pose.x, 0, pose.z);
    g.rotation.y = pose.yaw;
  });
  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[0, -50, 0]}
        name={id}
      >
        <CuboidCollider args={[1.25, 1.5, 5.5]} position={[0, 1.8, 0]} />
      </RigidBody>
      <group ref={group} name={id} visible={false}>
        <BusModel riding pose={wheels.current} />
      </group>
    </>
  );
}

/** Busway-style TransCung buses that run the city loop between rides of the boardable bus. */
export function CityBusFleet() {
  return (
    <>
      {CITY_FLEET.map((bus) => (
        <FleetBus key={bus.id} id={bus.id} shift={bus.shift} />
      ))}
    </>
  );
}
