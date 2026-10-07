/** @jsxImportSource @/game/jsx */
import type { Group } from "three";
import { clearanceAt, validRoadPose, stalled } from "./route-safety";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RigidBody,
  interactionGroups,
  type RapierRigidBody,
} from "@react-three/rapier";
import {
  TRAFFIC_LANES,
  DELIVERY_IN,
  DELIVERY_OUT,
  CROSSWALKS,
  INTERSECTIONS,
  pathLength,
  samplePath,
  type TrafficLane,
} from "../world/outdoor-layout";
import {
  smoothVehicleYaw,
  approachSpeed,
  relativeToVehicle,
  vehicleOverlaps,
  vehicleYaw,
  impactVelocity,
  canImpact,
} from "./traffic-math";
import { trafficActors, trafficVehicles, trafficAudio } from "./traffic-runtime";
import {
  followDistance,
  getSyncedVehicle,
  isTrafficHost,
  maybePublishTraffic,
  trafficDistances,
} from "./traffic-sync";
import { VehicleModel } from "./VehicleModel";
import { LOW_QUALITY } from "../engine/quality";
import { useOps } from "@/state/ops-store";
import { getActiveChannel, playerId, remoteStates } from "@/net/useWorldChannel";

const remoteHitAt = new Map<string, number>();

function VehicleController({
  id,
  lane,
  offset = 0,
  color,
  delivery = false,
}: {
  id: string;
  lane: TrafficLane;
  offset?: number;
  color: string;
  delivery?: boolean;
}) {
  const body = useRef<RapierRigidBody>(null);
  const initial = samplePath(lane.points, offset);
  const model = useRef<Group>(null);
  const pendingSpawn = useRef(true);
  const retryAt = useRef(0);
  const watch = useRef({ x: initial.x, z: initial.z, seconds: 0 });
  const distance = useRef(offset),
    speed = useRef(0),
    brakeUntil = useRef(0),
    previousPhase = useRef("away"),
    lastYaw = useRef(vehicleYaw(initial.dx, initial.dz));
  useEffect(() => {
    body.current?.setEnabled(false);
  }, []);
  useEffect(
    () => () => {
      trafficVehicles.delete(id);
      trafficDistances.delete(id);
    },
    [id],
  );
  useFrame(({ clock }, raw) => {
    const rb = body.current;
    if (!rb) return;
    const dt = Math.min(raw, 0.05),
      now = clock.elapsedTime;
    const phase = useOps.getState().truck;
    const host = isTrafficHost();
    const synced = host ? null : getSyncedVehicle(id);
    const hide = () => {
      if (model.current) model.current.visible = false;
      rb.setEnabled(false);
      trafficVehicles.delete(id);
      trafficDistances.set(id, { distance: distance.current, speed: 0, active: false });
    };
    const show = () => {
      if (model.current) model.current.visible = true;
      rb.setEnabled(true);
    };
    const clear = (p: typeof initial) =>
      clearanceAt(
        { ...p, speed: 0 },
        [...trafficVehicles].filter(([key]) => key !== id).map(([, v]) => v),
        [...trafficActors.values()]
          .flatMap((a) => {
            const p = a.position();
            return p ? [p] : [];
          })
          .concat([...remoteStates.values()].map((p) => ({ x: p.x, z: p.z }))),
      );

    // Follower: ikut snapshot host (posisi + truk phase sudah di-apply di traffic-sync).
    if (synced) {
      if (synced.active === false) {
        hide();
        return;
      }
      show();
      const route = delivery ? (phase === "leaving" ? DELIVERY_OUT : DELIVERY_IN) : lane;
      if (delivery && phase === "away") {
        hide();
        trafficVehicles.delete(id);
        trafficDistances.delete(id);
        rb.setTranslation({ x: -80, y: 0, z: 18.4 }, true);
        speed.current = 0;
        return;
      }
      const total = pathLength(route.points);
      distance.current = followDistance(distance.current, synced.distance, total, dt);
      speed.current = synced.speed;
      const next = { ...samplePath(route.points, distance.current), speed: speed.current };
      if (Math.hypot(next.x - rb.translation().x, next.z - rb.translation().z) > 10)
        rb.setTranslation({ x: next.x, y: 0, z: next.z }, true);
      else rb.setNextKinematicTranslation({ x: next.x, y: 0, z: next.z });
      pendingSpawn.current = false;
      previousPhase.current = phase;
      if (Math.hypot(next.dx, next.dz) > 0.01)
        lastYaw.current = smoothVehicleYaw(lastYaw.current, vehicleYaw(next.dx, next.dz), dt);
      const yaw = lastYaw.current;
      rb.setNextKinematicRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
      trafficVehicles.set(id, { ...next, kind: delivery ? "truck" : "car" });
      return;
    }

    if (delivery && phase === "away") {
      hide();
      pendingSpawn.current = true;
      trafficVehicles.delete(id);
      trafficDistances.delete(id);
      rb.setTranslation({ x: -80, y: 0, z: 18.4 }, true);
      speed.current = 0;
      previousPhase.current = phase;
      return;
    }
    const route = delivery ? (phase === "leaving" ? DELIVERY_OUT : DELIVERY_IN) : lane;
    if (delivery && phase !== previousPhase.current) {
      if (phase === "incoming" || phase === "leaving") distance.current = 0;
      previousPhase.current = phase;
    }
    const total = pathLength(route.points);
    if (pendingSpawn.current) {
      hide();
      if (now < retryAt.current) return;
      let start = samplePath(route.points, distance.current);
      if (!validRoadPose({ ...start, speed: 0 }, true)) {
        distance.current = 0;
        start = samplePath(route.points, 0);
      }
      if (!validRoadPose({ ...start, speed: 0 }, true) || !clear(start)) {
        retryAt.current = now + 0.5;
        return;
      }
      rb.setTranslation({ x: start.x, y: 0, z: start.z }, true);
      lastYaw.current = vehicleYaw(start.dx, start.dz);
      rb.setRotation(
        { x: 0, y: Math.sin(lastYaw.current / 2), z: 0, w: Math.cos(lastYaw.current / 2) },
        true,
      );
      pendingSpawn.current = false;
      watch.current = { x: start.x, z: start.z, seconds: 0 };
      show();
    }
    const pose = { ...samplePath(route.points, distance.current), speed: speed.current };
    let target = route.speed;
    let pedestrianHold = false;
    if (
      Math.abs(pose.x) < 19 ||
      INTERSECTIONS.some((n) => Math.hypot(n.x - pose.x, n.z - pose.z) < 9)
    )
      target = Math.min(target, 3.5);
    if (delivery && (pose.z < 17 || (phase === "incoming" && distance.current > total - 13)))
      target = 1.8;
    if (delivery && phase === "loading") target = 0;
    if (now < brakeUntil.current) target = 0;
    for (const [otherId, v] of trafficVehicles) {
      if (otherId === id) continue;
      const r = relativeToVehicle(v, pose);
      // Works at merges as well as for same-lane following and parked vehicles.
      if (r.along > 0 && r.along < 5.1 + speed.current * 0.7 && Math.abs(r.side) < 1.9) target = 0;
    }
    for (const actor of trafficActors.values()) {
      const p = actor.position();
      if (!p) continue;
      const r = relativeToVehicle(p, pose);
      const crossing = CROSSWALKS.some(
        (c) => p.x > c.minX - 0.6 && p.x < c.maxX + 0.6 && p.z > c.minZ - 1 && p.z < c.maxZ + 1,
      );
      if (
        r.along > 0 &&
        r.along < 3.1 + (speed.current * speed.current) / 12 + (crossing ? 2 : 0) &&
        Math.abs(r.side) < (crossing ? 3.3 : 1.5)
      ) {
        target = 0;
        pedestrianHold = true;
      }
      if (speed.current > 0.2 && vehicleOverlaps(p, pose) && actor.hit(pose, now)) {
        brakeUntil.current = now + 1.1;
        target = 0;
        trafficAudio.emit("impact", p, { kind: delivery ? "truck" : "car" });
      }
    }
    // Host: rem + tabrak pemain remote (posisi dari net state).
    if (host) {
      const kind = delivery ? "truck" : "car";
      for (const [rid, s] of remoteStates) {
        if (rid === playerId) continue;
        const p = { x: s.x, z: s.z };
        const r = relativeToVehicle(p, pose);
        const crossing = CROSSWALKS.some(
          (c) => p.x > c.minX - 0.6 && p.x < c.maxX + 0.6 && p.z > c.minZ - 1 && p.z < c.maxZ + 1,
        );
        if (
          r.along > 0 &&
          r.along < 3.1 + (speed.current * speed.current) / 12 + (crossing ? 2 : 0) &&
          Math.abs(r.side) < (crossing ? 3.3 : 1.5)
        ) {
          target = 0;
          pedestrianHold = true;
        }
        const last = remoteHitAt.get(rid) ?? -Infinity;
        if (speed.current > 0.2 && vehicleOverlaps(p, { ...pose, kind }) && canImpact(now, last)) {
          remoteHitAt.set(rid, now);
          brakeUntil.current = now + 1.1;
          target = 0;
          const v = impactVelocity(p, { ...pose, kind, speed: speed.current });
          const ch = getActiveChannel();
          if (ch)
            void ch.send({
              type: "broadcast",
              event: "traffic-hit",
              payload: { to: rid, vx: v.x, vz: v.z, vy: v.y, kind },
            });
          trafficAudio.emit("impact", p, { kind });
        }
      }
    }
    if (
      stalled(
        watch.current,
        rb.translation(),
        !pedestrianHold && !(delivery && phase === "loading") && now >= brakeUntil.current,
        dt,
      )
    ) {
      // A tiny, clear forward correction can recover an exhausted/degenerate path sample.
      const forward = samplePath(route.points, Math.min(total, distance.current + 0.25));
      const actual = rb.translation();
      if (
        target > 0 &&
        Math.hypot(forward.x - actual.x, forward.z - actual.z) < 0.5 &&
        validRoadPose({ ...forward, speed: 0 }) &&
        clear(forward)
      ) {
        distance.current = Math.min(total, distance.current + 0.25);
        rb.setTranslation({ x: forward.x, y: 0, z: forward.z }, true);
        watch.current = { x: forward.x, z: forward.z, seconds: 0 };
      } else {
        // No safe local recovery: remove before recycling at the off-world route anchor.
        const anchors = [0, Math.max(0, total - 8)]
          .map((d) => ({ d, p: samplePath(route.points, d) }))
          .filter(
            ({ p }) =>
              Math.max(Math.abs(p.x), Math.abs(p.z)) > 260 &&
              validRoadPose({ ...p, speed: 0 }, true) &&
              clear(p),
          )
          .sort(
            (a, b) =>
              Math.hypot(a.p.x - actual.x, a.p.z - actual.z) -
              Math.hypot(b.p.x - actual.x, b.p.z - actual.z),
          );
        hide();
        pendingSpawn.current = true;
        retryAt.current = now + 1;
        distance.current = anchors[0]?.d ?? 0;
        speed.current = 0;
        return;
      }
    }
    if (target === 0 && speed.current > 1) trafficAudio.emit("brake", pose);
    speed.current = approachSpeed(speed.current, target, dt);
    distance.current = Math.min(total, distance.current + speed.current * dt);
    if (distance.current >= total) {
      if (delivery) {
        if (phase === "incoming") useOps.getState().setTruck("loading");
        else if (phase === "leaving") useOps.getState().setTruck("away");
        speed.current = 0;
      } else {
        // Finite routes retire; repeating routes respawn only after clearance at their anchor.
        hide();
        pendingSpawn.current = true;
        retryAt.current = lane.loop ? now + 0.5 : Infinity;
        distance.current = 0;
        speed.current = 0;
        return;
      }
    }
    const next = { ...samplePath(route.points, distance.current), speed: speed.current };
    if (Math.hypot(next.x - pose.x, next.z - pose.z) > 10)
      rb.setTranslation({ x: next.x, y: 0, z: next.z }, true);
    else rb.setNextKinematicTranslation({ x: next.x, y: 0, z: next.z });
    // Model +Z = depan; simpan yaw saat diam agar tidak spin di ujung jalur.
    if (Math.hypot(next.dx, next.dz) > 0.01)
      lastYaw.current = smoothVehicleYaw(lastYaw.current, vehicleYaw(next.dx, next.dz), dt);
    const yaw = lastYaw.current;
    rb.setNextKinematicRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    trafficVehicles.set(id, { ...next, kind: delivery ? "truck" : "car" });
    if (host) trafficDistances.set(id, { distance: distance.current, speed: speed.current });
  });
  return (
    <RigidBody
      ref={body}
      name={`vehicle-${id}`}
      type="kinematicPosition"
      colliders={false}
      position={[initial.x, 0, initial.z]}
      rotation={[0, lastYaw.current, 0]}
    >
      <CuboidCollider
        args={[0.92, 0.66, 2.05]}
        position={[0, 0.82, 0]}
        collisionGroups={interactionGroups(2, [1])}
      />
      <group ref={model} visible={false}>
        <VehicleModel color={color} van={delivery} />
      </group>
    </RigidBody>
  );
}

function TrafficPublisher() {
  useFrame(() => {
    maybePublishTraffic(performance.now());
  });
  return null;
}

export function TrafficSystem() {
  return (
    <>
      <TrafficPublisher />
      <VehicleController id="city-east" lane={TRAFFIC_LANES[0]!} offset={235} color="#be755f" />
      <VehicleController id="city-west" lane={TRAFFIC_LANES[1]!} offset={235} color="#648b94" />
      {!LOW_QUALITY && (
        <VehicleController id="city-east-2" lane={TRAFFIC_LANES[2]!} offset={180} color="#d2ad65" />
      )}
      <VehicleController id="delivery" lane={DELIVERY_IN} color="#5f7a66" delivery />
    </>
  );
}
