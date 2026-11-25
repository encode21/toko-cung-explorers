/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { Quaternion, Vector3, type Group, type Mesh } from "three";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { trafficVehicles } from "@/game/traffic/traffic-runtime";
import { deliveryPose } from "./delivery-motion";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart, Finish, Shape } from "@/game/assets/parts";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { NPC_AVATARS } from "@/identity/characters";
import { PICKUP_SPOT, type PublicWarung } from "./model";
import { useWarung } from "./store";

const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  shape: Shape = "box",
  finish: Finish = "paint",
): AssetPart => ({ p, s, color, shape, finish });

/** A small stack of cardboard boxes (dus) with tape, n boxes, max 6 drawn. */
function boxStack(n: number, ox = 0, oz = 0): AssetPart[] {
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
  const boxes = useWarung((s) =>
    (s.data?.shipments ?? [])
      .filter((x) => x.status === "CARRYING")
      .reduce((a, x) => a + x.boxes, 0),
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
}: {
  card: Pick<PublicWarung, "id" | "truckEta">;
  depth: number;
  roadZ?: number;
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
  const trafficId = `kulakan:${card.id}`;
  useEffect(
    () => () => {
      trafficVehicles.delete(trafficId);
    },
    [trafficId],
  );
  useFrame(() => {
    if (!lastEta.current || !root.current || !truck.current) return;
    const p = deliveryPose(Date.now(), lastEta.current, depth / 2, roadZ);
    root.current.visible = p.visible;
    body.current?.setEnabled(p.visible);
    if (!p.visible) {
      trafficVehicles.delete(trafficId);
      return;
    }
    truck.current.position.x = p.truckX;
    truck.current.updateWorldMatrix(true, false);
    truck.current.getWorldPosition(transform.position);
    truck.current.getWorldQuaternion(transform.rotation);
    transform.direction.set(1, 0, 0).applyQuaternion(transform.rotation);
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
      speed: p.truckX === 0 ? 0 : 3,
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
  if (!lastEta.current) return null;
  return (
    <group ref={root} name={`DeliveryTruck:${card.id}`}>
      <group ref={truck} position={[0, 0, roadZ]} name="DeliveryVehicle">
        <group rotation-y={Math.PI / 2}>
          <VehicleModel kind="truck" color="#e4a448" />
        </group>
      </group>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[0, TRUCK_BOUNDS.centerY, roadZ]}
      >
        <CuboidCollider args={[TRUCK_BOUNDS.half[2], TRUCK_BOUNDS.half[1], TRUCK_BOUNDS.half[0]]} />
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
