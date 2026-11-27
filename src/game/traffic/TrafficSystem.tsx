/** @jsxImportSource @/game/jsx */
import { VEHICLE_DEFINITIONS } from "../vehicles/definitions";
import { mobilityNow } from "../mobility/store";
import { crossingStopGap } from "./crossing-stop";
import { junctionAdmission } from "./junctions";
import { AMBIENT_FLEET, trafficBusy } from "./fleet";
import { trafficWindow } from "./traffic-window";
import type { VehicleKind } from "./traffic-math";
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
  atTrafficHeight,
  impactVelocity,
  canImpact,
} from "./traffic-math";
import {
  trafficActors,
  trafficVehicles,
  trafficAudio,
  incidentTrafficZones,
  solidTrafficBlocked,
} from "./traffic-runtime";
import { vehicleGapAhead } from "./traffic-math";
import {
  followDistance,
  getSyncedVehicle,
  getTrafficHandoff,
  isTrafficHost,
  maybePublishTraffic,
  trafficDistances,
} from "./traffic-sync";
import { VehicleModel } from "./VehicleModel";

import { useOps } from "@/state/ops-store";
import { useGame } from "@/state/game-store";
import { LOW_QUALITY } from "@/game/engine/quality";
import { getActiveChannel, playerId, remoteStates } from "@/net/useWorldChannel";
import { useNet } from "@/net/net-store";
import { useChannels } from "@/net/channel-store";

/** On phones, hide meshes far from the local player — keep simulation/sync, cut draw calls. */
const MESH_CULL = LOW_QUALITY ? 48 : Infinity;
function meshInRange(x: number, z: number) {
  if (!Number.isFinite(MESH_CULL)) return true;
  const p = useGame.getState().playerPos;
  return Math.hypot(x - p[0]!, z - p[2]!) < MESH_CULL;
}

const remoteHitAt = new Map<string, number>();

function VehicleController({
  id,
  lane,
  offset = 0,
  color,
  delivery = false,
  kind = "car",
  variant,
  shed = false,
}: {
  id: string;
  lane: TrafficLane;
  offset?: number;
  color: string;
  delivery?: boolean;
  kind?: VehicleKind;
  variant?: import("../assets/vehicles").VehicleKind;
  shed?: boolean;
}) {
  const window = trafficWindow(lane);
  const vehicleKind = delivery ? "truck" : kind;
  const half = VEHICLE_DEFINITIONS[delivery ? "van" : (variant ?? kind)].collision.half;
  const footprint = { halfWidth: half[0], halfLength: half[2] };
  const body = useRef<RapierRigidBody>(null);
  const wasHost = useRef(false);
  const previousRemoteRoute = useRef("");
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
    let phase = useOps.getState().truck;
    const host = isTrafficHost();
    const synced = host ? null : getSyncedVehicle(id);
    if (host && !wasHost.current) {
      retryAt.current = 0;
      const seed = getTrafficHandoff(id);
      if (seed) {
        distance.current = seed.distance;
        speed.current = seed.speed;
        pendingSpawn.current = true;
        previousPhase.current = useOps.getState().truck;
      }
      phase = useOps.getState().truck;
    }
    wasHost.current = host;
    const routeId = delivery ? (phase === "leaving" ? DELIVERY_OUT.id : DELIVERY_IN.id) : lane.id;
    const hide = (state: "SPAWNING" | "RECOVERING" | "DESPAWNING" = "DESPAWNING") => {
      if (model.current) model.current.visible = false;
      rb.setEnabled(false);
      trafficVehicles.delete(id);
      if (host)
        trafficDistances.set(id, {
          distance: distance.current,
          speed: 0,
          active: false,
          routeId,
          state,
        });
    };
    const show = (x: number, z: number) => {
      if (model.current) model.current.visible = meshInRange(x, z);
      rb.setEnabled(true);
    };
    const clear = (p: typeof initial) =>
      clearanceAt(
        { ...p, speed: 0, ...footprint },
        [...trafficVehicles]
          .filter(([key]) => key !== id)
          .map(([, v]) => v)
          .concat([...incidentTrafficZones.values()]),
        [...trafficActors.values()]
          .flatMap((a) => {
            const p = a.position();
            return p ? [p] : [];
          })
          .concat([...remoteStates.values()].map((p) => ({ x: p.x, y: p.y, z: p.z }))),
      );

    // Follower: ikut snapshot host (posisi + truk phase sudah di-apply di traffic-sync).
    if (!host) {
      if (!synced) {
        hide();
        return;
      }
      if (synced.active === false) {
        previousRemoteRoute.current = "";
        hide();
        return;
      }
      const route = [...TRAFFIC_LANES, DELIVERY_IN, DELIVERY_OUT].find(
        (r) => r.id === synced.routeId,
      );
      if (!route) {
        hide();
        return;
      }
      if (previousRemoteRoute.current !== route.id || synced.distance < distance.current - 12) {
        // Recycling is a new spawn, not a sweep across the whole town from the old endpoint.
        if (!clear(samplePath(route.points, synced.distance))) {
          hide();
          return;
        }
        distance.current = synced.distance;
        previousRemoteRoute.current = route.id;
      }
      if (delivery && phase === "away") {
        hide();
        trafficVehicles.delete(id);
        if (host) trafficDistances.delete(id);
        rb.setTranslation({ x: -80, y: 0, z: 18.4 }, true);
        speed.current = 0;
        return;
      }
      const total = pathLength(route.points);
      const previousDistance = distance.current;
      distance.current = followDistance(distance.current, synced.distance, total, dt);
      speed.current = synced.speed;
      if (
        solidTrafficBlocked(
          { ...samplePath(route.points, previousDistance), speed: speed.current, ...footprint },
          { ...samplePath(route.points, distance.current), speed: speed.current, ...footprint },
          id,
        )
      ) {
        distance.current = previousDistance;
        speed.current = 0;
      }
      const next = { ...samplePath(route.points, distance.current), speed: speed.current };
      show(next.x, next.z);
      if (Math.hypot(next.x - rb.translation().x, next.z - rb.translation().z) > 10)
        rb.setTranslation({ x: next.x, y: 0, z: next.z }, true);
      else rb.setNextKinematicTranslation({ x: next.x, y: 0, z: next.z });
      pendingSpawn.current = false;
      previousPhase.current = phase;
      if (Math.hypot(next.dx, next.dz) > 0.01)
        lastYaw.current = smoothVehicleYaw(lastYaw.current, vehicleYaw(next.dx, next.dz), dt);
      const yaw = lastYaw.current;
      rb.setNextKinematicRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
      trafficVehicles.set(id, {
        ...next,
        kind: vehicleKind,
        visualKind: delivery ? "van" : (variant ?? kind),
        ...footprint,
      });
      return;
    }

    if (delivery && phase === "away") {
      hide();
      pendingSpawn.current = true;
      trafficVehicles.delete(id);
      // Keep the inactive entity in authoritative snapshots.
      rb.setTranslation({ x: -80, y: 0, z: 18.4 }, true);
      speed.current = 0;
      previousPhase.current = phase;
      return;
    }
    // shortcut: parks instantly, so a shed NPC can vanish in view once when the channel turns busy; fade it out if players notice.
    if (shed && busyChannel) {
      hide();
      pendingSpawn.current = true;
      return;
    }
    const route = delivery ? (phase === "leaving" ? DELIVERY_OUT : DELIVERY_IN) : lane;
    if (delivery && phase !== previousPhase.current) {
      if (phase === "incoming" || phase === "leaving") distance.current = 0;
      previousPhase.current = phase;
    }
    const total = pathLength(route.points);
    if (pendingSpawn.current) {
      if (now < retryAt.current) return;
      hide("SPAWNING");
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
      show(start.x, start.z);
    }
    const pose = {
      ...samplePath(route.points, distance.current),
      speed: speed.current,
      kind: vehicleKind,
      ...footprint,
    };
    let target = route.speed;
    let pedestrianHold = false;
    const signalGap = crossingStopGap(pose, mobilityNow(), 6);
    const junctionGap = junctionAdmission.clearance(id, pose, trafficVehicles, signalGap);
    let queueHold = Number.isFinite(junctionGap);
    target = Math.min(target, Math.sqrt(12 * Math.max(0, junctionGap - 0.5)));
    if (
      Math.abs(pose.x) < 19 ||
      INTERSECTIONS.some((n) => Math.hypot(n.x - pose.x, n.z - pose.z) < 9)
    )
      target = Math.min(target, 3.5);
    if (delivery && (pose.z < 17 || (phase === "incoming" && distance.current > total - 13)))
      target = 1.8;
    const signalSpeed = Math.sqrt(12 * signalGap);
    if (signalSpeed <= target) {
      target = signalSpeed;
      queueHold = true;
    }
    if (delivery && phase === "loading") target = 0;
    if (now < brakeUntil.current) target = 0;
    for (const [otherId, v] of trafficVehicles) {
      if (otherId === id) continue;
      const limit = Math.sqrt(12 * Math.max(0, vehicleGapAhead(pose, v) - 0.8));
      if (limit < target) {
        target = limit;
        queueHold = true;
      }
    }
    for (const actor of trafficActors.values()) {
      const p = actor.position();
      if (!p || !atTrafficHeight(p)) continue;
      const r = relativeToVehicle(p, pose);
      const crossing = CROSSWALKS.some(
        (c) => p.x > c.minX - 0.6 && p.x < c.maxX + 0.6 && p.z > c.minZ - 1 && p.z < c.maxZ + 1,
      );
      if (
        r.along > 0 &&
        r.along <
          (actor.solid ? footprint.halfLength + 1.2 : 3.1) +
            (speed.current * speed.current) / 12 +
            (crossing ? 2 : 0) &&
        Math.abs(r.side) < (crossing ? 3.3 : 1.5)
      ) {
        target = 0;
        pedestrianHold = true;
      }
      if (speed.current > 0.2 && vehicleOverlaps(p, pose) && actor.hit(pose, now)) {
        brakeUntil.current = now + 1.1;
        target = 0;
        trafficAudio.emit("impact", p, { kind: vehicleKind });
      }
    }
    // Host: rem + tabrak pemain remote (posisi dari net state).
    if (host) {
      const kind = vehicleKind;
      for (const [rid, s] of remoteStates) {
        if (rid === playerId || !atTrafficHeight(s)) continue;
        const p = { x: s.x, y: s.y, z: s.z };
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
        !pedestrianHold &&
          !queueHold &&
          !(delivery && phase === "loading") &&
          now >= brakeUntil.current,
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
        hide("RECOVERING");
        pendingSpawn.current = true;
        retryAt.current = now + 1;
        distance.current = anchors[0]?.d ?? 0;
        speed.current = 0;
        return;
      }
    }
    if (target === 0 && speed.current > 1) trafficAudio.emit("brake", pose);
    speed.current = approachSpeed(speed.current, target, dt);
    const advance = Math.min(speed.current * dt, signalGap, junctionGap);
    if (advance >= Math.min(signalGap, junctionGap)) speed.current = 0;
    const nextDistance = Math.min(total, distance.current + advance);
    if (
      solidTrafficBlocked(
        pose,
        {
          ...samplePath(route.points, nextDistance),
          speed: speed.current,
          ...footprint,
        },
        id,
      )
    ) {
      speed.current = 0;
      queueHold = true;
    } else distance.current = nextDistance;
    const unseen = (d: number) => {
      const p = samplePath(route.points, d);
      for (const actor of trafficActors.values()) {
        const a = actor.position();
        if (a && Math.hypot(a.x - p.x, a.z - p.z) <= 160) return false;
      }
      for (const a of remoteStates.values())
        if (Math.hypot(a.x - p.x, a.z - p.z) <= 160) return false;
      return true;
    };
    const recycleEarly =
      !delivery &&
      distance.current >= window.end &&
      unseen(distance.current) &&
      unseen(window.start);
    if (distance.current >= total || recycleEarly) {
      if (route.id === "jalan-lingkar") {
        distance.current %= total;
      } else if (delivery) {
        if (phase === "incoming") useOps.getState().setTruck("loading");
        else if (phase === "leaving") useOps.getState().setTruck("away");
        speed.current = 0;
      } else {
        // Finite routes retire; repeating routes respawn only after clearance at their anchor.
        hide();
        pendingSpawn.current = true;
        retryAt.current = lane.loop ? now + 0.25 : Infinity;
        distance.current = unseen(window.start) ? window.start : 0;
        speed.current = 0;
        return;
      }
    }
    const next = { ...samplePath(route.points, distance.current), speed: speed.current };
    if (model.current) model.current.visible = meshInRange(next.x, next.z);
    if (Math.hypot(next.x - pose.x, next.z - pose.z) > 10)
      rb.setTranslation({ x: next.x, y: 0, z: next.z }, true);
    else rb.setNextKinematicTranslation({ x: next.x, y: 0, z: next.z });
    // Model +Z = depan; simpan yaw saat diam agar tidak spin di ujung jalur.
    if (Math.hypot(next.dx, next.dz) > 0.01)
      lastYaw.current = smoothVehicleYaw(lastYaw.current, vehicleYaw(next.dx, next.dz), dt);
    const yaw = lastYaw.current;
    rb.setNextKinematicRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    trafficVehicles.set(id, {
      ...next,
      kind: vehicleKind,
      visualKind: delivery ? "van" : (variant ?? kind),
      ...footprint,
    });
    if (host)
      trafficDistances.set(id, {
        distance: distance.current,
        speed: speed.current,
        routeId: route.id,
        active: true,
        state:
          delivery && phase === "loading" ? "PARKED" : speed.current > 0.05 ? "MOVING" : "WAITING",
      });
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
        args={VEHICLE_DEFINITIONS[delivery ? "van" : (variant ?? kind)].collision.half}
        position={[
          0,
          VEHICLE_DEFINITIONS[delivery ? "van" : (variant ?? kind)].collision.centerY,
          0,
        ]}
        collisionGroups={interactionGroups(2, [1])}
      />
      <group ref={model} visible={false}>
        <VehicleModel color={color} kind={delivery ? "van" : (variant ?? kind)} rider />
      </group>
    </RigidBody>
  );
}

/** Host-side only: followers hide shed NPCs through the snapshot's `active: false`. */
let busyChannel = false;

function TrafficPublisher() {
  const host = useRef(false);
  useEffect(() => () => junctionAdmission.clear(), []);
  useFrame(() => {
    const { lease, channels } = useChannels.getState();
    busyChannel = trafficBusy(
      useNet.getState().roster.length,
      channels.find((c) => c.id === lease?.channel)?.capacity ?? 0,
      busyChannel,
    );
    const next = isTrafficHost();
    if (next !== host.current) junctionAdmission.clear();
    host.current = next;
    maybePublishTraffic(performance.now());
  });
  return null;
}

export function TrafficSystem() {
  return (
    <>
      <TrafficPublisher />
      {AMBIENT_FLEET.map((vehicle) => {
        const lane = TRAFFIC_LANES[vehicle.lane]!;
        const window = trafficWindow(lane);
        return (
          <VehicleController
            key={vehicle.id}
            id={vehicle.id}
            lane={lane}
            kind={vehicle.kind}
            variant={vehicle.variant}
            color={vehicle.color}
            shed={vehicle.shed}
            offset={window.start + (window.end - window.start) * vehicle.phase}
          />
        );
      })}
      <VehicleController id="delivery" lane={DELIVERY_IN} color="#5f7a66" delivery />
    </>
  );
}
