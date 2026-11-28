/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { Quaternion, Vector3, type Group, type Mesh } from "three";
import { CuboidCollider, RigidBody, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { trafficVehicles } from "@/game/traffic/traffic-runtime";
import { deliveryPose } from "./delivery-motion";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { PICKUP_SPOT, type PublicWarung } from "./model";
import { useWarung, loadDeliveryTrips } from "./store";
import { useGang } from "@/game/gang/store";
import { useChannels } from "@/net/channel-store";
import {
  TRUCK_SLOT_GAP,
  deliveryJourney,
  deliveryRoute,
  type DeliveryTrip,
  type DeliveryLayout,
} from "./delivery-route";

const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "box",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

/** A small stack of cardboard boxes (dus) with tape, n boxes, max 6 drawn. */
export function boxStack(n: number, ox = 0, oz = 0): AssetPart[] {
  const out: AssetPart[] = [];
  for (let i = 0; i < Math.min(n, 6); i++) {
    const x = ox + (i % 2) * 0.55;
    const y = 0.2 + Math.floor(i / 2) * 0.4;
    out.push(
      part([x, y, oz], [0.5, 0.38, 0.42], "#c49a6c"),
      part([x, y + 0.195, oz], [0.5, 0.015, 0.1], "#e8d6a8", "box", "plastic"),
    );
  }
  return out;
}

/** Ground ring + label while this player still has dus to pick up. */
function PickupBeacon() {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.08);
  });
  return (
    <group name="KulakanPickupBeacon">
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.08}>
        <ringGeometry args={[1.15, 1.35, 40]} />
        <meshBasicMaterial color="#ffce52" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <Billboard position={[0, 2.2, 0]}>
        <Text fontSize={0.28} color="#fff4cc" outlineWidth={0.02} outlineColor="#4b2a12">
          AMBIL DUS DI SINI
        </Text>
      </Billboard>
    </group>
  );
}

/** "Bawa sendiri" boxes waiting at Toko Cung's pickup area, one labelled stack per player. */
export function PickupPiles() {
  const pickups = useWarung((s) => s.pickups);
  const mine = useWarung((s) =>
    (s.data?.shipments ?? []).some((x) => x.mode === "ambil" && x.status === "PENDING"),
  );
  if (!pickups.length && !mine) return null;
  return (
    <group name="KulakanPickups" position={[PICKUP_SPOT[0], 0, PICKUP_SPOT[1]]}>
      {mine && <PickupBeacon />}
      {pickups.slice(0, 6).map((p, i) => {
        const ox = (i % 3) * 1.4 - 1.4;
        const oz = Math.floor(i / 3) * 1.3;
        return (
          <group key={p.warungId} position={[ox, 0, oz]}>
            <StyledBatch items={boxStack(p.boxes)} />
            <Billboard position={[0.27, 1.55, 0]}>
              <Text fontSize={0.2} color="#fff9e9" outlineWidth={0.02} outlineColor="#4b2a12">
                {`📦 ${p.owner ?? "Pemain"} · ${p.boxes} dus`}
              </Text>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}

/** Boxes in your arms while carrying a "bawa sendiri" kulakan; mounted in the player's visual group. */
export function CarriedBoxes() {
  const boxes = useWarung(
    (s) =>
      (s.data?.shipments ?? [])
        .filter((x) => x.status === "CARRYING")
        .reduce((a, x) => a + x.boxes, 0) +
      // Pesan antar yang sudah diangkat sendiri ikut dibawa sampai diserahkan.
      (s.data?.delivery?.orders ?? [])
        .filter((o) => o.assignedSelf && o.status === "IN_TRANSIT")
        .reduce((a, o) => a + o.boxes, 0),
  );
  const items = useMemo(() => boxStack(Math.min(boxes, 3), -0.27, 0), [boxes]);
  if (!boxes) return null;
  // Held in front of the chest, like MissionParcel.
  return (
    <group name="CarriedBoxes" position={[0, 0.8, 0.45]}>
      <StyledBatch items={items} />
    </group>
  );
}

const TRUCK_BOUNDS = VEHICLE_DEFINITIONS.truck.collision;

/** Arrival, carrying and departure use the same ETA outside and while serving inside. */
export function DeliveryTruck({
  card,
  depth,
  roadZ = depth / 2 + 3.4,
  journey,
  slot = 0,
}: {
  card: Pick<PublicWarung, "id" | "truckEta">;
  depth: number;
  roadZ?: number;
  /** City convoy slot (journeys carry their own): parks TRUCK_SLOT_GAP further back per slot. */
  slot?: number;
  journey?: { trip: DeliveryTrip; area: "city" | "gang" | "interior"; layout: DeliveryLayout };
}) {
  const root = useRef<Group>(null);
  const truck = useRef<Group>(null);
  const porter = useRef<Group>(null);
  const carried = useRef<Group>(null);
  const body = useRef<RapierRigidBody>(null);
  const lastEta = useRef(card.truckEta);
  if (card.truckEta) lastEta.current = card.truckEta;
  const transform = useMemo(
    () => ({ position: new Vector3(), rotation: new Quaternion(), direction: new Vector3() }),
    [],
  );
  const trafficId = journey ? `kulakan-trip:${journey.trip.id}` : `kulakan:${card.id}:${slot}`;
  const house = journey?.trip.house,
    spacing = journey?.layout.house_spacing,
    tripSlot = journey?.trip.slot ?? 0;
  const route = useMemo(
    () => (house === undefined ? null : deliveryRoute(house, spacing, undefined, tripSlot)),
    [house, spacing, tripSlot],
  );
  const journeyTime = useRef(Date.now());
  const lastPose = useRef<{ x: number; z: number; yaw: number } | null>(null);
  const { world, rapier } = useRapier();
  const shape = useMemo(() => new rapier.Cuboid(...TRUCK_BOUNDS.half), [rapier]);
  useEffect(
    () => () => {
      trafficVehicles.delete(trafficId);
    },
    [trafficId],
  );
  useFrame((_, dt) => {
    if ((!lastEta.current && !journey) || !root.current || !truck.current) return;
    const nextTime = journeyTime.current + Math.min(dt, 0.05) * 1000;
    const eta = journey?.trip.etaAt ?? lastEta.current!;
    const p = deliveryPose(journey ? nextTime : Date.now(), eta, depth / 2, roadZ);
    let tx = p.truckX - slot * TRUCK_SLOT_GAP,
      tz = roadZ,
      yaw = Math.PI / 2;
    if (!journey && slot) {
      // The courier walks from this convoy truck to the same door.
      const startX = -3.6 - slot * TRUCK_SLOT_GAP,
        dx = 2.7 - startX,
        dz = depth / 2 - roadZ + 1.65,
        phase = Math.max(0, (Date.now() - eta) / 1000 + 20) % 10,
        f = phase < 5 ? phase / 5 : 2 - phase / 5;
      p.porter.x = startX + dx * f;
      p.porter.yaw = Math.atan2(dx, dz) + (p.carrying ? 0 : Math.PI);
    }
    if (journey && route) {
      const pose = deliveryJourney(nextTime, journey.trip, route);
      p.visible =
        pose.visible &&
        (journey.area === "interior" ? pose.area === "gang" : pose.area === journey.area);
      p.unloading = pose.unloading;
      const side = journey.trip.house % 2 ? -1 : 1;
      const houseZ = route.door.z;
      if (journey.area === "interior") {
        tx = side * (pose.z - houseZ);
        tz = roadZ - side * (pose.x - route.stop.x);
        yaw = pose.yaw + (side * Math.PI) / 2;
        const startX = -side * 3.6 + side * (route.stop.z - houseZ);
        p.porter.x =
          startX +
          (2.7 - startX) *
            (p.carrying
              ? Math.max(0, (nextTime - eta + 20000) % 10000) / 5000
              : 2 - Math.max(0, (nextTime - eta + 20000) % 10000) / 5000);
        p.porter.yaw =
          Math.atan2(2.7 - startX, depth / 2 - roadZ + 1.65) + (p.carrying ? 0 : Math.PI);
      } else {
        const ox = pose.area === "gang" ? journey.layout.origin[0]! : 0;
        const oz = pose.area === "gang" ? journey.layout.origin[2]! : 0;
        tx = ox + pose.x;
        tz = oz + pose.z;
        yaw = pose.yaw;
        const phase = Math.max(0, (nextTime - eta + 20000) / 1000) % 10;
        const t = phase < 5 ? phase / 5 : 2 - phase / 5;
        const startX = route.stop.x + side * 1.7,
          endX = side * (journey.layout.house_offset - 8);
        p.porter.x = journey.layout.origin[0]! + startX + (endX - startX) * t;
        const startZ = route.stop.z - 3.6,
          endZ = houseZ + 2.7;
        p.porter.z = journey.layout.origin[2]! + startZ + (endZ - startZ) * t;
        p.porter.yaw = Math.atan2(endX - startX, endZ - startZ) + (p.carrying ? 0 : Math.PI);
      }
    }
    root.current.visible = p.visible;
    if (body.current?.isValid()) body.current.setEnabled(p.visible);
    if (!p.visible) {
      journeyTime.current = nextTime;
      trafficVehicles.delete(trafficId);
      return;
    }
    truck.current.position.set(tx, 0, tz);
    truck.current.rotation.y = yaw;
    truck.current.updateWorldMatrix(true, false);
    truck.current.getWorldPosition(transform.position);
    truck.current.getWorldQuaternion(transform.rotation);
    transform.direction.set(0, 0, 1).applyQuaternion(transform.rotation);
    if (
      journey &&
      body.current?.isValid() &&
      world.intersectionWithShape(
        {
          x: transform.position.x,
          y: transform.position.y + TRUCK_BOUNDS.centerY,
          z: transform.position.z,
        },
        transform.rotation,
        shape,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        undefined,
        body.current,
      )
    ) {
      // Keep the previous transform while a vehicle/person blocks the route; never catch up by jumping.
      const old = lastPose.current;
      if (old) {
        truck.current.position.set(old.x, 0, old.z);
        truck.current.rotation.y = old.yaw;
        const traffic = trafficVehicles.get(trafficId);
        if (traffic) traffic.speed = 0;
      } else {
        root.current.visible = false;
        body.current.setEnabled(false);
      }
      return;
    }
    journeyTime.current = nextTime;
    lastPose.current = { x: tx, z: tz, yaw };
    if (
      body.current?.isValid() &&
      Math.hypot(
        body.current.translation().x - transform.position.x,
        body.current.translation().z - transform.position.z,
      ) > 20
    )
      body.current.setTranslation(
        {
          x: transform.position.x,
          y: transform.position.y + TRUCK_BOUNDS.centerY,
          z: transform.position.z,
        },
        true,
      );
    body.current?.setNextKinematicTranslation({
      x: transform.position.x,
      y: transform.position.y + TRUCK_BOUNDS.centerY,
      z: transform.position.z,
    });
    body.current?.setNextKinematicRotation(transform.rotation);
    trafficVehicles.set(trafficId, {
      x: transform.position.x,
      z: transform.position.z,
      dx: transform.direction.x,
      dz: transform.direction.z,
      speed: p.unloading ? 0 : 3,
      kind: "truck",
      halfLength: TRUCK_BOUNDS.half[2],
      halfWidth: TRUCK_BOUNDS.half[0],
    });
    if (porter.current) {
      porter.current.visible = p.unloading;
      porter.current.position.set(p.porter.x, 0.16, p.porter.z);
      porter.current.rotation.y = p.porter.yaw;
    }
    if (carried.current) carried.current.visible = p.carrying;
  });
  if (!lastEta.current && !journey) return null;
  return (
    <group
      ref={root}
      name={journey ? `DeliveryTrip:${journey.trip.id}` : `DeliveryTruck:${card.id}`}
      visible={false}
    >
      <group ref={truck} position={[0, 0, roadZ]} rotation-y={Math.PI / 2} name="DeliveryVehicle">
        <VehicleModel kind="truck" color="#e4a448" />
      </group>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[0, TRUCK_BOUNDS.centerY, roadZ]}
      >
        <CuboidCollider args={TRUCK_BOUNDS.half} />
      </RigidBody>
      <group ref={porter} visible={false} name="DeliveryPorter">
        <BaseAvatarV2
          avatar={NPC_AVATARS["npc-courier"]}
          animation="Walk"
          speed={1.2}
          groundToWorld
        />
        <group ref={carried} position={[-0.25, 1.05, 0.32]} name="DeliveryBox">
          <StyledBatch items={boxStack(1, 0, 0)} />
        </group>
      </group>
    </group>
  );
}

/** Trips live above house streaming, so walking away never removes a truck still on the road. */
export function DeliveryFleet({ area }: { area: "city" | "gang" }) {
  const channel = useChannels((s) => s.lease?.channel);
  const shared = useWarung((s) => s.deliveryTrips);
  const own = useWarung((s) => s.data?.warung?.deliveryTrips);
  const gang = useGang((s) => s.data);
  const inside = useGang((s) => s.inside);
  const cached = useRef(new Map<number, DeliveryTrip>());
  const previousChannel = useRef(channel);
  if (previousChannel.current !== channel) {
    cached.current.clear();
    previousChannel.current = channel;
  }
  for (const trip of [...shared, ...(own ?? []), ...(gang?.deliveryTrips ?? [])])
    cached.current.set(trip.id, trip);
  for (const [id, trip] of cached.current)
    if (Date.now() > trip.returnAt + 120000) cached.current.delete(id);
  useEffect(() => {
    void loadDeliveryTrips();
    const timer = setInterval(() => {
      if (!document.hidden) void loadDeliveryTrips();
    }, 5000);
    return () => clearInterval(timer);
  }, [channel]);
  const layout = gang?.layout ?? { origin: [6000, 0, 3000], house_spacing: 24, house_offset: 18 };
  return (
    <group name="DeliveryFleet">
      {[...cached.current.values()]
        .filter((t) => area === "city" || t.gang === inside)
        .map((trip) => (
          <DeliveryTruck
            key={trip.id}
            card={{ id: trip.warungId, truckEta: trip.etaAt }}
            depth={15.4}
            journey={{ trip, area, layout }}
          />
        ))}
    </group>
  );
}
