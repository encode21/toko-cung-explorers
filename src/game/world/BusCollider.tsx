/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { trafficVehicles } from "@/game/traffic/traffic-runtime";
import { busPose, useBusRide } from "./bus-ride";
import { busCollision, BUS_TRAFFIC_ID } from "./bus-collision";

/** Solid body and road-obstacle queries, mounted inside the current scene's Physics. */
export function BusCollider() {
  const active = useBusRide((s) => s.active);
  const compact = useBusRide((s) => s.compact);
  const ready = useBusRide((s) => s.ready);
  const body = useRef<RapierRigidBody>(null);
  const { world, rapier } = useRapier();
  const width = compact ? 1.2 : 1.25;
  const length = compact ? 4 : 5.5;
  const shape = useMemo(
    () => new rapier.Cuboid(width + 0.15, 1.4, length + 0.15),
    [rapier, width, length],
  );
  useEffect(() => {
    if (body.current?.isValid()) body.current.setEnabled(ready);
  }, [ready, active]);
  useEffect(() => {
    if (!active) return;
    busCollision.blocked = ({ x, z, yaw }) =>
      !body.current?.isValid() ||
      !!world.intersectionWithShape(
        { x, y: 1.85, z },
        { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
        shape,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        undefined,
        body.current ?? undefined,
      );
    return () => {
      busCollision.blocked = null;
      trafficVehicles.delete(BUS_TRAFFIC_ID);
    };
  }, [world, rapier, shape, active]);
  useFrame(() => {
    const rb = body.current;
    if (!useBusRide.getState().active || !rb?.isValid()) return;
    rb.setEnabled(useBusRide.getState().ready);
    const { x, z, yaw, speed } = busPose;
    // Transfers cross scenes under a fade, so do not sweep the bus through the intervening world.
    if (Math.hypot(rb.translation().x - x, rb.translation().z - z) > 20)
      rb.setTranslation({ x, y: 0, z }, true);
    else rb.setNextKinematicTranslation({ x, y: 0, z });
    rb.setNextKinematicRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    if (!useBusRide.getState().ready) {
      trafficVehicles.delete(BUS_TRAFFIC_ID);
      return;
    }
    trafficVehicles.set(BUS_TRAFFIC_ID, {
      x,
      z,
      dx: Math.sin(yaw),
      dz: Math.cos(yaw),
      speed,
      halfWidth: width,
      halfLength: length,
    });
  });
  if (!active) return null;
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[busPose.x, 0, busPose.z]}
      rotation={[0, busPose.yaw, 0]}
      name="BusCollision"
    >
      <CuboidCollider args={[width, 1.5, length]} position={[0, 1.8, 0]} />
    </RigidBody>
  );
}
