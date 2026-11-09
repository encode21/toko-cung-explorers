/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { Quaternion, type Group } from "three";
import { useMobility } from "@/game/mobility/store";
import { connectionId } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { waterAt } from "@/game/swimming/model";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { trafficVehicles } from "@/game/traffic/traffic-runtime";
import { advanceRide, bikeModel, type RideVehicle } from "./model";
import {
  renderedVehicles,
  remoteVehiclePose,
  publishVehiclePose,
  useVehicleInput,
  vehicleExits,
} from "./runtime";

function ParkedVehicle({ vehicle: v }: { vehicle: RideVehicle }) {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Group>(null);
  const pose = useRef({ ...v.pose });
  const revision = useRef(v.revision);
  const { world, rapier } = useRapier();
  const bike = bikeModel(v.model);
  const shape = useMemo(
    () => new rapier.Cuboid(bike ? 0.35 : 0.9, 0.6, bike ? 0.98 : 2.06),
    [rapier, bike],
  );
  const rotation = useMemo(() => new Quaternion(), []);
  useEffect(
    () => () => {
      renderedVehicles.delete(v.id);
      trafficVehicles.delete(`ride-${v.id}`);
      vehicleExits.delete(v.id);
    },
    [v.id],
  );
  useFrame((_, rawDt) => {
    const rb = body.current;
    if (!rb) return;
    const dt = Math.min(rawDt, 0.05),
      p = pose.current;
    const local = v.occupants.some((s) => s.seat === 0 && s.connectionId === connectionId);
    const me = useGame.getState().playerPos;
    const visible = local || Math.hypot(p.x - me[0], p.z - me[2]) < 65;
    rb.setEnabled(visible);
    if (visual.current) visual.current.visible = visible;
    if (revision.current !== v.revision) {
      // A reset/driver change may teleport; passenger consent revisions retain live motion.
      if (!v.occupants.length) Object.assign(p, v.pose);
      revision.current = v.revision;
    }
    if (local) {
      const input = useVehicleInput.getState();
      const next = advanceRide(
        p,
        useMobility.getState().vehicleLeaving ? { throttle: 0, steer: 0, brake: true } : input,
        dt,
      );
      rotation.set(0, Math.sin(next.yaw / 2), 0, Math.cos(next.yaw / 2));
      const dx = next.x - p.x,
        dz = next.z - p.z,
        distance = Math.hypot(dx, dz);
      // Sweep the body rather than teleport through walls. People and NPC traffic slow the
      // vehicle to a stop; this path never invokes traffic hit/damage/ragdoll callbacks.
      const hit =
        distance > 0.0001 &&
        world.castShape(
          { x: p.x, y: p.y + 0.85, z: p.z },
          rotation,
          { x: dx / distance, y: 0, z: dz / distance },
          shape,
          0.08,
          distance,
          true,
          rapier.QueryFilterFlags.EXCLUDE_SENSORS,
          undefined,
          undefined,
          rb,
          (c) => {
            const data = c.parent()?.userData as
              { rideId?: string; playerConnection?: string } | undefined;
            return data?.rideId !== v.id && data?.playerConnection !== connectionId;
          },
        );
      const water = waterAt(next.x, next.z);
      if (hit || Math.abs(next.x) > 218 || Math.abs(next.z) > 218 || (water && water.depth > 0.5)) {
        p.speed = 0;
      } else Object.assign(p, next);
      publishVehiclePose(v, { ...p });
    } else {
      const target = remoteVehiclePose(v);
      const alpha = Math.hypot(target.x - p.x, target.z - p.z) > 8 ? 1 : 1 - Math.exp(-14 * dt);
      p.x += (target.x - p.x) * alpha;
      p.y += (target.y - p.y) * alpha;
      p.z += (target.z - p.z) * alpha;
      p.yaw += Math.atan2(Math.sin(target.yaw - p.yaw), Math.cos(target.yaw - p.yaw)) * alpha;
      p.speed = target.speed;
    }
    rb.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
    rb.setNextKinematicRotation({ x: 0, y: Math.sin(p.yaw / 2), z: 0, w: Math.cos(p.yaw / 2) });
    renderedVehicles.set(v.id, { ...p });
    trafficVehicles.set(`ride-${v.id}`, {
      x: p.x,
      z: p.z,
      dx: Math.sin(p.yaw),
      dz: Math.cos(p.yaw),
      speed: p.speed,
      kind: bike ? "motorcycle" : "car",
    });
    vehicleExits.set(v.id, () => {
      const capsule = new rapier.Capsule(0.42, 0.34);
      for (const [side, back] of [
        [1.7, 0],
        [-1.7, 0],
        [0, -3],
        [0, 3],
        [2.8, -3],
        [-2.8, -3],
      ]) {
        const x = p.x + side! * Math.cos(p.yaw) + back! * Math.sin(p.yaw);
        const z = p.z - side! * Math.sin(p.yaw) + back! * Math.cos(p.yaw);
        const candidate = { x, y: 0.93, z };
        const blocked = world.intersectionWithShape(
          candidate,
          { x: 0, y: 0, z: 0, w: 1 },
          capsule,
          rapier.QueryFilterFlags.EXCLUDE_SENSORS,
          undefined,
          undefined,
          rb,
        );
        if (!blocked && (waterAt(x, z)?.depth ?? 0) < 0.5)
          return [x, 0.93, z] as [number, number, number];
      }
      return null;
    });
  }, -1);
  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[v.pose.x, v.pose.y, v.pose.z]}
      userData={{ rideId: v.id }}
      name={`ride-${v.id}`}
    >
      <CuboidCollider args={bike ? [0.35, 0.6, 0.98] : [0.9, 0.6, 2.06]} position={[0, 0.85, 0]} />
      <group ref={visual}>
        <VehicleModel kind={v.model} color={v.color} emptyBed />
      </group>
    </RigidBody>
  );
}

export function PlayerVehicles() {
  const vehicles = useMobility((s) => s.vehicles ?? []);
  return (
    <>
      {vehicles.map((v) => (
        <ParkedVehicle key={v.id} vehicle={v} />
      ))}
    </>
  );
}
