/** @jsxImportSource @/game/jsx */
import { groundContacts } from "../world/contact-shadows";
import { avatarSurfaceY } from "../avatar/grounding";
import { emitSplash, tireWaterContact } from "../swimming/splash-pool";
import { Text } from "@react-three/drei";
import { VehicleLights } from "./VehicleLights";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Object3D, Quaternion, Vector3 } from "three";
import { StyledBatch } from "../assets/StyledBatch";
import { vehicleParts, type VehicleKind, type VehiclePart } from "../assets/vehicles";
import { VEHICLE_DEFINITIONS } from "../vehicles/definitions";
import { doorAngle, type RideVehicle } from "../vehicles/model";
import { mobilityNow } from "../mobility/store";
import { renderedVehicleMotion, renderedVehicles } from "../vehicles/runtime";
import { reducedMotion, rideVisual } from "../vehicles/visual";
import { playCue } from "../audio/sound-palette";
import { useRenderBudget } from "../engine/AdaptiveQuality";

/** +Z forward. Moving parts stay in the same instanced batches as the body. */
export function VehicleModel({
  color = "#b86552",
  van = false,
  kind,
  rider = false,
  emptyBed = false,
  vehicle,
  motionKey,
}: {
  color?: string;
  van?: boolean;
  kind?: VehicleKind;
  rider?: boolean;
  emptyBed?: boolean;
  vehicle?: RideVehicle;
  motionKey?: string;
}) {
  useEffect(
    () => () => {
      if (motionKey) renderedVehicleMotion.delete(motionKey);
    },
    [motionKey],
  );
  const type = kind ?? (van ? "van" : "car"),
    d = VEHICLE_DEFINITIONS[type];
  const shadowId = useId();
  const shadow = useMemo(
    () => ({ x: 0, y: 0, z: 0, width: d.size[0] * 1.28, length: d.size[2] * 1.08, yaw: 0 }),
    [d],
  );
  useEffect(() => {
    groundContacts.set(shadowId, [shadow]);
    return () => {
      groundContacts.delete(shadowId);
    };
  }, [shadowId, shadow]);
  const root = useRef<Group>(null),
    shell = useRef<Group>(null);
  const [near, setNear] = useState(false);
  const parts = useMemo(
    () => vehicleParts(type, color, rider, emptyBed).filter((p) => near || !p.detail),
    [type, color, rider, emptyBed, near],
  );
  const state = useMemo(
    () => ({
      spin: 0,
      steer: 0,
      now: 0,
      check: 0,
      splashAt: 0,
      rotation: new Quaternion(),
      wheelWorld: new Vector3(),
      initialized: false,
      position: new Vector3(),
      previous: new Vector3(),
      q: new Quaternion(),
      pivot: new Vector3(),
      axisX: new Vector3(1, 0, 0),
      axisY: new Vector3(0, 1, 0),
      yaw: 0,
      sounds: new Set<string>(),
    }),
    [],
  );
  useFrame(({ camera, clock }, dt) => {
    if (!root.current || !shell.current) return;
    root.current.getWorldPosition(state.position);
    root.current.getWorldQuaternion(state.rotation);
    state.wheelWorld.set(0, 0, 1).applyQuaternion(state.rotation);
    Object.assign(shadow, {
      x: state.position.x,
      y: avatarSurfaceY(state.position),
      z: state.position.z,
      yaw: Math.atan2(state.wheelWorld.x, state.wheelWorld.z),
    });
    state.now = mobilityNow();
    if (clock.elapsedTime > state.check) {
      state.check = clock.elapsedTime + 0.5;
      setNear(
        state.position.distanceToSquared(camera.position) <
          (useRenderBudget.getState().tier === "LOW" ? 20 : 32) ** 2,
      );
    }
    const distance = state.initialized ? state.position.distanceTo(state.previous) : 0;
    const speed = distance / Math.max(dt, 0.001);
    if (distance > 0.001) {
      const yaw = Math.atan2(
        state.position.x - state.previous.x,
        state.position.z - state.previous.z,
      );
      state.steer = Math.max(
        -0.35,
        Math.min(0.35, Math.atan2(Math.sin(yaw - state.yaw), Math.cos(yaw - state.yaw)) * 3),
      );
      state.yaw = yaw;
    } else state.steer *= Math.exp(-8 * dt);
    state.spin +=
      ((distance < 1 ? distance : 0) / d.wheelRadius) *
      (vehicle ? Math.sign(renderedVehicles.get(vehicle.id)?.speed ?? 1) : 1);
    if (speed > 0.3 && clock.elapsedTime > state.splashAt) {
      state.splashAt = clock.elapsedTime + 0.28;
      root.current.getWorldQuaternion(state.rotation);
      for (const wheel of d.wheels) {
        state.wheelWorld
          .set(wheel[0], wheel[1] - d.wheelRadius, wheel[2])
          .applyQuaternion(state.rotation)
          .add(state.position);
        const w = state.wheelWorld;
        if (tireWaterContact(w.x, w.y, w.z)) emitSplash(w.x, w.z, Math.min(1.3, speed * 0.15));
      }
    }
    state.previous.copy(state.position);
    state.initialized = true;
    const motion = vehicle ? renderedVehicleMotion.get(vehicle.id) : undefined;
    if (motion) state.steer = motion.steer * 0.42;
    const v =
      motion ??
      rideVisual(
        { x: 0, y: 0, z: 0, yaw: 0, speed },
        clock.elapsedTime,
        type === "motorcycle" || type === "scooter",
        state.steer,
        reducedMotion(),
      );
    if (motionKey) renderedVehicleMotion.set(motionKey, { ...v, steer: state.steer });
    shell.current.position.y = v.lift;
    shell.current.rotation.z = v.roll;
    for (const seat of vehicle?.occupants ?? []) {
      const t = seat.transition;
      if (!t || t.phase === "seated") continue;
      const key = seat.connectionId + ":" + t.startedAt;
      const age = state.now - t.startedAt,
        closing = key + ":close";
      if (
        type !== "motorcycle" &&
        type !== "scooter" &&
        age > t.durationMs * 0.82 &&
        age < t.durationMs &&
        !state.sounds.has(closing)
      ) {
        state.sounds.add(closing);
        playCue(
          "vehicle-door",
          Math.max(0, 1 - state.position.distanceTo(camera.position) / 22) * 0.7,
        );
      }
      if (state.sounds.has(key)) continue;
      state.sounds.add(key);
      if (state.sounds.size > 32) state.sounds.delete(state.sounds.values().next().value!);
      if (state.now - t.startedAt < 800)
        playCue(
          type === "motorcycle" || type === "scooter" ? "vehicle-seat" : "vehicle-door",
          Math.max(0, 1 - state.position.distanceTo(camera.position) / 22),
        );
    }
  }, -0.5);
  const animate = useCallback(
    (raw: unknown, o: Object3D) => {
      const p = raw as VehiclePart;
      if (p.wheel === undefined && p.door === undefined) return false;
      o.position.set(...p.p);
      o.scale.set(...p.s);
      o.rotation.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
      if (p.wheel !== undefined) {
        state.pivot.set(...d.wheels[p.wheel]!);
        state.q.setFromAxisAngle(state.axisX, state.spin);
        o.position.sub(state.pivot).applyQuaternion(state.q).add(state.pivot);
        o.quaternion.premultiply(state.q);
        if (state.pivot.z > 0) {
          state.q.setFromAxisAngle(state.axisY, -state.steer);
          o.position.sub(state.pivot).applyQuaternion(state.q).add(state.pivot);
          o.quaternion.premultiply(state.q);
        }
      } else {
        const seat = d.seats[p.door!]!,
          side = seat.hinge![0] > 0 ? 1 : -1;
        state.pivot.set(...seat.hinge!);
        state.q.setFromAxisAngle(
          state.axisY,
          -side *
            doorAngle(
              vehicle?.occupants.find((s) => s.seat === p.door),
              state.now,
            ),
        );
        o.position.sub(state.pivot).applyQuaternion(state.q).add(state.pivot);
        o.quaternion.premultiply(state.q);
      }
      return true;
    },
    [d, vehicle, state],
  );
  return (
    <group ref={root} name={`vehicle-${type}`} userData={{ trafficDriver: rider }}>
      <group ref={shell}>
        <StyledBatch items={parts} animate={animate} />
        <VehicleLights kind={type} />
        {near &&
          (type === "truck" || type === "mpv") &&
          [1, -1].map((side) => (
            <Text
              key={`plate-${side}`}
              position={[
                0,
                side > 0 ? (type === "truck" ? 0.54 : 0.69) : 0.51,
                side * (d.size[2] / 2 + 0.025),
              ]}
              rotation-y={side < 0 ? Math.PI : 0}
              fontSize={0.063}
              color="#e9ece5"
            >
              TC 2026
            </Text>
          ))}

        {near &&
          type === "van" &&
          [-1, 1].map((side) => (
            <Text
              key={side}
              position={[side * (d.size[0] / 2 + 0.02), 0.92, -0.6]}
              rotation-y={(side * Math.PI) / 2}
              fontSize={0.14}
              color="#fff4df"
            >
              TOKO CUNG
            </Text>
          ))}
      </group>
    </group>
  );
}
