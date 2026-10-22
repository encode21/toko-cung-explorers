/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  CuboidCollider,
  useRapier,
  interactionGroups,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Group, Quaternion, Euler } from "three";
import { Text } from "@react-three/drei";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { NpcLabel } from "@/game/world/NpcLabel";
import { useMissions } from "./store";
import {
  freshTruck,
  truckPoint,
  truckObjective,
  TRUCK_PARCELS,
  TRUCK_START,
  TRUCK_DOCK,
  TRUCK_WAREHOUSE,
} from "./truck-model";
import { useTruckRoom, truckPhysics, renderedTruck } from "./truck-state";

function Box({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.48, 0.5]} />
        <meshStandardMaterial color="#b9905b" />
      </mesh>
      <mesh position={[0, 0.243, 0]}>
        <boxGeometry args={[0.09, 0.008, 0.51]} />
        <meshStandardMaterial color="#f0dbab" />
      </mesh>
    </group>
  );
}
export function DeliveryTruck() {
  const body = useRef<RapierRigidBody>(null),
    visual = useRef<Group>(null),
    marker = useRef<Group>(null);
  const { world, rapier } = useRapier();
  const room = useTruckRoom(),
    mine = useMissions((s) => s.session.active);
  const truck = room.mission?.truck ?? freshTruck();
  const shape = useMemo(() => new rapier.Cuboid(1.16, 0.72, 2.25), [rapier]);
  const person = useMemo(() => new rapier.Capsule(0.42, 0.38), [rapier]);
  const rotation = useMemo(() => new Quaternion(), []),
    euler = useMemo(() => new Euler(), []);
  useEffect(() => {
    const ignore = (c: import("@dimforge/rapier3d-compat").Collider) =>
      c.parent()?.handle !== body.current?.handle && !c.parent()?.isDynamic();
    truckPhysics.blocked = (t) => {
      rotation.setFromEuler(euler.set(0, t.yaw, 0));
      return !!world.intersectionWithShape(
        { x: t.x, y: 1.18, z: t.z },
        rotation,
        shape,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        undefined,
        body.current ?? undefined,
        ignore,
      );
    };
    truckPhysics.exit = (t) => {
      for (const [x, z] of [
        [-1.9, 0.8],
        [1.9, 0.8],
        [-2.1, -1.2],
        [2.1, -1.2],
      ]) {
        const p = truckPoint(t, x!, z!);
        if (
          !world.intersectionWithShape(
            { x: p[0], y: 0.88, z: p[2] },
            { x: 0, y: 0, z: 0, w: 1 },
            person,
            rapier.QueryFilterFlags.EXCLUDE_SENSORS,
            interactionGroups(1, [0]),
            undefined,
            body.current ?? undefined,
            ignore,
          )
        )
          return [p[0], 0.83, p[2]];
      }
      return null;
    };
    return () => {
      truckPhysics.blocked = () => true;
      truckPhysics.exit = () => null;
      renderedTruck.ready = false;
    };
  }, [world, rapier, shape, person, rotation, euler]);
  useFrame(({ clock }, dt) => {
    const t = useTruckRoom.getState().mission?.truck ?? freshTruck();
    if (!renderedTruck.ready || Math.hypot(t.x - renderedTruck.x, t.z - renderedTruck.z) > 8)
      Object.assign(renderedTruck, t, { ready: true });
    const a = 1 - Math.exp(-18 * Math.min(dt, 0.05));
    renderedTruck.x += (t.x - renderedTruck.x) * a;
    renderedTruck.z += (t.z - renderedTruck.z) * a;
    renderedTruck.yaw +=
      Math.atan2(Math.sin(t.yaw - renderedTruck.yaw), Math.cos(t.yaw - renderedTruck.yaw)) * a;
    body.current?.setNextKinematicTranslation({ x: renderedTruck.x, y: 0, z: renderedTruck.z });
    body.current?.setNextKinematicRotation(
      rotation.setFromEuler(euler.set(0, renderedTruck.yaw, 0)),
    );
    if (visual.current) {
      visual.current.position.set(renderedTruck.x, 0, renderedTruck.z);
      visual.current.rotation.y = renderedTruck.yaw;
    }
    const m = useMissions.getState().session.active;
    const point = m?.truck
      ? m.truck.driver
        ? TRUCK_DOCK
        : truckObjective(m).position
      : TRUCK_PARCELS;
    if (marker.current) {
      marker.current.position.set(point[0], 0.055, point[2]);
      marker.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.12);
    }
  });
  const remaining =
    truck.loaded - truck.unloaded - Number(!!room.mission?.carrying && truck.loaded === 3);
  return (
    <group name="DeliveryMission">
      <group position={[TRUCK_START.x, 0.055, TRUCK_START.z]}>
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <group key={`${x}:${z}`} position={[x * 1.45, 0, z * 2.65]}>
              <mesh position={[-x * 0.3, 0, 0]} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[0.65, 0.07]} />
                <meshBasicMaterial color="#f6e8b4" depthWrite={false} />
              </mesh>
              <mesh position={[0, 0, -z * 0.3]} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[0.07, 0.65]} />
                <meshBasicMaterial color="#f6e8b4" depthWrite={false} />
              </mesh>
            </group>
          )),
        )}
      </group>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[truck.x, 0, truck.z]}
        rotation={[0, truck.yaw, 0]}
        userData={{ cameraPassThrough: true }}
      >
        <CuboidCollider
          args={[1.12, 0.85, 2.2]}
          position={[0, 1.05, 0]}
          collisionGroups={interactionGroups(0, [0, 1])}
        />
      </RigidBody>
      <group ref={visual} position={[truck.x, 0, truck.z]} rotation-y={truck.yaw}>
        <VehicleModel emptyBed kind="truck" color="#e4a448" />
        <NpcLabel text={room.mission ? "Truk Pengiriman" : "Misi Pengiriman"} />
        {Array.from({ length: Math.max(0, remaining) }, (_, n) => (
          <Box key={n} position={[(n % 2) * 0.7 - 0.35, 1.2, -0.65 - Math.floor(n / 2) * 0.6]} />
        ))}
      </group>
      <group position={TRUCK_PARCELS}>
        <NpcLabel text="Paket Pengiriman" />
        {truck.loaded < 3 && (
          <mesh position={[0.325, 0.09, 0]}>
            <boxGeometry args={[1.35, 0.12, 0.75]} />
            <meshStandardMaterial color="#806b50" />
          </mesh>
        )}
        {[0, 1, 2]
          .slice(truck.loaded + Number(!!room.mission?.carrying && truck.loaded < 3))
          .map((n) => (
            <Box key={n} position={[(n % 2) * 0.65, 0.39 + Math.floor(n / 2) * 0.48, 0]} />
          ))}
      </group>
      <group position={TRUCK_DOCK}>
        <mesh rotation-x={-Math.PI / 2} position-y={0.025}>
          <planeGeometry args={[4.5, 5]} />
          <meshBasicMaterial color="#e6be51" transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <Text position={[0, 0.04, 0]} rotation-x={-Math.PI / 2} fontSize={0.42} color="#fff4cc">
          BONGKAR
        </Text>
      </group>
      <group position={TRUCK_WAREHOUSE}>
        <NpcLabel text="Gudang · Serahkan Paket" />
        {Array.from({ length: truck.unloaded }, (_, n) => (
          <Box key={n} position={[1 + (n % 2) * 0.65, 0.24 + Math.floor(n / 2) * 0.48, 0]} />
        ))}
      </group>
      {(!room.mission || mine?.truck) && (
        <group ref={marker}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.7, 0.86, 32]} />
            <meshBasicMaterial color="#ffce52" transparent opacity={0.9} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}
