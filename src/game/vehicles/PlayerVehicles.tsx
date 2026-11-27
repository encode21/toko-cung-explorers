/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { Quaternion, type Group } from "three";
import { useMobility } from "@/game/mobility/store";
import { connectionId } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { ROADS, contains } from "@/game/world/outdoor-layout";
import { waterAt } from "@/game/swimming/model";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { npcKnocks, trafficVehicles } from "@/game/traffic/traffic-runtime";
import { playImpactSfx } from "@/game/audio/sfx";
import { advanceRide, bikeModel, vehicleTransitioning, type RideVehicle } from "./model";
import {
  renderedVehicles,
  renderedVehicleMotion,
  vehicleAccess,
  remoteVehiclePose,
  publishVehiclePose,
  rideCrash,
  cancelVehicleBoost,
  useVehicleInput,
  vehicleExits,
  vehicleJumps,
} from "./runtime";
import { ojekTripTarget } from "@/game/ojek/store";
import { useGang } from "@/game/gang/store";
import { driveThroughGate, isGangPosition } from "@/game/gang/store";

import { boundaryDepth, approachingBoundary } from "./boundary";
import { VEHICLE_DEFINITIONS } from "./definitions";
import { reducedMotion, rideVisual } from "./visual";

function ParkedVehicle({ vehicle: v }: { vehicle: RideVehicle }) {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Group>(null);
  const pose = useRef({ ...v.pose });
  const revision = useRef(v.revision);
  const { world, rapier } = useRapier();
  const bike = bikeModel(v.model);
  const bounds=VEHICLE_DEFINITIONS[v.model].collision;
  const shape = useMemo(
    () => new rapier.Cuboid(...bounds.half),
    [rapier, bounds],
  );
  const rotation = useMemo(() => new Quaternion(), []);
  useEffect(
    () => () => {
      renderedVehicles.delete(v.id);
      renderedVehicleMotion.delete(v.id);
      vehicleAccess.delete(v.id);
      trafficVehicles.delete(`ride-${v.id}`);
      vehicleExits.delete(v.id);
    },
    [v.id],
  );
  useFrame(({ clock }, rawDt) => {
    const rb = body.current;
    if (!rb) return;
    const dt = Math.min(rawDt, 0.05),
      p = pose.current;
    const local = v.occupants.some((s) => s.seat === 0 && s.connectionId === connectionId);
    const me = useGame.getState().playerPos;
    const visible =
      local ||
      ((p.gang ?? null) === useGang.getState().inside && Math.hypot(p.x - me[0], p.z - me[2]) < 65);
    rb.setEnabled(visible);
    if (visual.current) visual.current.visible = visible;
    if (revision.current !== v.revision) {
      // Door transitions use the same frozen server anchor for every occupant.
      if (!v.occupants.length || vehicleTransitioning(v)) Object.assign(p, v.pose);
      revision.current = v.revision;
    }
    const previousYaw = p.yaw;
    if (local) {
      const jump = vehicleJumps.get(v.id);
      if (jump) {
        vehicleJumps.delete(v.id);
        Object.assign(p, jump);
      }
      // Older poses followed the seabed even on asphalt, leaving the body buried in the road.
      const onRoad = ROADS.some((road) => contains(road, p));
      if (onRoad && p.y < 0) p.y = 0;
      const input = useVehicleInput.getState();
      const transitioning = vehicleTransitioning(v);
      const stopping = useMobility.getState().vehicleLeaving || transitioning;
      let nos = input.boostVehicleId === v.id && input.boostUntil > performance.now();
      if (nos && (stopping || input.brake || document.hidden)) {
        cancelVehicleBoost();
        nos = false;
      }
      const next = advanceRide(
        p,
        stopping ? { throttle: 0, steer: 0, brake: true } : input,
        dt,
        nos,
      );
      if (transitioning) {
        next.x = p.x;
        next.z = p.z;
        next.speed = 0;
      }
      rotation.set(0, Math.sin(next.yaw / 2), 0, Math.cos(next.yaw / 2));
      const dx = next.x - p.x,
        dz = next.z - p.z,
        distance = Math.hypot(dx, dz);
      // Sweep the body rather than teleport through walls. Ambient NPCs get knocked over; players and
      // traffic stop the vehicle, and a hard hit on anything solid bounces it back.
      const hit =
        distance > 0.0001 &&
        world.castShape(
          { x: p.x, y: p.y + bounds.centerY, z: p.z },
          rotation,
          { x: dx / distance, y: 0, z: dz / distance },
          shape,
          0.08,
          distance,
          false, // Allow reversing out of an existing contact.
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
      const floor = !onRoad && water && water.depth <= 0.5 ? water.floor : 0;
      next.y=p.y+(floor-p.y)*(1-Math.exp(-10*dt));
      const nextDepth = boundaryDepth(next, bounds.half, isGangPosition);
      const blocked = nextDepth > 0 && nextDepth >= boundaryDepth(p, bounds.half, isGangPosition);
      if (hit || blocked) {
        const speed = Math.abs(p.speed);
        const npc = hit
          ? (hit.collider.parent()?.userData as { npcId?: string } | undefined)?.npcId
          : undefined;
        const push = 0.8 * p.speed;
        if (
          npc &&
          speed > 1.5 &&
          npcKnocks.get(npc)?.(Math.sin(p.yaw) * push, Math.cos(p.yaw) * push)
        ) {
          void playImpactSfx("car", Math.min(1, speed / 10));
          p.speed *= 0.5;
        } else if (speed > 2.5) {
          rideCrash(v, p, speed);
          p.speed *= -0.2;
        } else p.speed = 0;
      } else Object.assign(p, next);
      const through = driveThroughGate(v, p, ojekTripTarget()?.gang);
      if (through) {
        vehicleJumps.set(v.id, through);
        Object.assign(p, through);
      }
      const boundaryWarning = approachingBoundary(p, bounds.half, isGangPosition);
      if (input.boundaryWarning !== boundaryWarning) useVehicleInput.setState({ boundaryWarning });
      publishVehiclePose(v, { ...p });
    } else {
      const target = remoteVehiclePose(v);
      const alpha = Math.hypot(target.x - p.x, target.z - p.z) > 8 ? 1 : 1 - Math.exp(-14 * dt);
      p.x += (target.x - p.x) * alpha;
      p.y += (target.y - p.y) * alpha;
      p.z += (target.z - p.z) * alpha;
      p.yaw += Math.atan2(Math.sin(target.yaw - p.yaw), Math.cos(target.yaw - p.yaw)) * alpha;
      p.speed = target.speed;
      p.gang = target.gang ?? null;
    }
    rb.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
    rb.setNextKinematicRotation({ x: 0, y: Math.sin(p.yaw / 2), z: 0, w: Math.cos(p.yaw / 2) });
    // The model follows the per-frame pose like the camera and seated avatar; parenting it to the
    // fixed-step (interpolated) body made the car lag them and stutter in turns.
    visual.current?.position.set(p.x, p.y, p.z);
    visual.current?.rotation.set(0, p.yaw, 0);
    renderedVehicles.set(v.id, { ...p });
    const steer = local
      ? useVehicleInput.getState().steer
      : Math.abs(p.speed) > 0.2
        ? Math.max(
            -1,
            Math.min(
              1,
              -Math.atan2(Math.sin(p.yaw - previousYaw), Math.cos(p.yaw - previousYaw)) /
                (dt * p.speed * 0.24),
            ),
          )
        : 0;
    renderedVehicleMotion.set(v.id, {
      ...rideVisual(p, clock.elapsedTime, bike, steer, reducedMotion()),
      steer,
    });
    trafficVehicles.set(`ride-${v.id}`, {
      x: p.x,
      z: p.z,
      dx: Math.sin(p.yaw),
      dz: Math.cos(p.yaw),
      speed: p.speed,
      kind: bike ? "motorcycle" : "car",
      visualKind: v.model,
    });
    vehicleAccess.set(v.id, (seat, approach) => {
      const door = VEHICLE_DEFINITIONS[v.model].seats[seat]?.door;
      if (!door) return null;
      const point = {
        x: p.x + door[0] * Math.cos(p.yaw) + door[2] * Math.sin(p.yaw),
        y: p.y + door[1],
        z: p.z - door[0] * Math.sin(p.yaw) + door[2] * Math.cos(p.yaw),
      };
      const blocked = world.intersectionWithShape(
        point,
        { x: 0, y: 0, z: 0, w: 1 },
        new rapier.Capsule(0.42, 0.34),
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        undefined,
        rb,
        (c) =>
          (c.parent()?.userData as { playerConnection?: string })?.playerConnection !==
          connectionId,
      );
      if (blocked || (waterAt(point.x, point.z)?.depth ?? 0) > 0.5) return null;
      if (approach) {
        const dx = point.x - approach[0],
          dz = point.z - approach[2],
          length = Math.hypot(dx, dz);
        if (
          length > 0.05 &&
          world.castShape(
            { x: approach[0], y: approach[1], z: approach[2] },
            { x: 0, y: 0, z: 0, w: 1 },
            { x: dx / length, y: 0, z: dz / length },
            new rapier.Capsule(0.42, 0.3),
            0.02,
            length,
            true,
            rapier.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            undefined,
            rb,
            (c) =>
              (c.parent()?.userData as { playerConnection?: string })?.playerConnection !==
              connectionId,
          )
        )
          return null;
      }
      return [point.x, point.y, point.z];
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
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[v.pose.x, v.pose.y, v.pose.z]}
        userData={{ rideId: v.id }}
        name={`ride-${v.id}`}
      >
        <CuboidCollider args={bounds.half} position={[0, bounds.centerY, 0]} />
      </RigidBody>
      <group
        ref={visual}
        position={[v.pose.x, v.pose.y, v.pose.z]}
        rotation={[0, v.pose.yaw, 0]}
      >
        <VehicleModel vehicle={v} kind={v.model} color={v.color} emptyBed />
      </group>
    </>
  );
}

// Stable fallback for the zustand selector (a fresh [] per call loops React).
const NO_VEHICLES: RideVehicle[] = [];

export function PlayerVehicles() {
  const vehicles = useMobility((s) => s.vehicles ?? NO_VEHICLES);
  return (
    <>
      {vehicles.map((v) => (
        <ParkedVehicle key={v.id} vehicle={v} />
      ))}
    </>
  );
}
