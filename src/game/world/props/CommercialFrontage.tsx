/** @jsxImportSource @/game/jsx */
import { Plang } from "@/game/world/Plang";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import type { Group } from "three";
import { OutdoorBatch, type OutdoorPart } from "../OutdoorBatch";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { STAGED_VEHICLES, VEHICLE_SIZE, type StagedVehicle } from "@/game/assets/vehicles";
import { useGame } from "@/state/game-store";
import { Fixture } from "../Fixture";

const STAGED_CULL_DIST_SQ = 26 * 26;

const parts: OutdoorPart[] = [
  // Commercial forecourt edge and recessed delivery-yard surface.
  { p: [0, 0.065, -26], s: [19, 0.025, 5], color: "#687579" },
  { p: [4.7, 0.07, 10.3], s: [9, 0.02, 0.1], color: "#bf303b" },
  { p: [10.4, 0.07, -10], s: [0.08, 0.02, 24], color: "#dec778" },
  // Compact directory sign for pickup, off the pedestrian spine.
  { p: [11, 1.5, 10], s: [2, 0.65, 0.12], color: "#33494f" },
  { p: [11, 0.6, 10], s: [0.1, 1.2, 0.1], color: "#59676a" },
];

/** Distance-culled parked vehicle: avoids drawing rear-yard trucks while standing at the front, and vice versa. */
function StagedVehicleProp({ vehicle }: { vehicle: StagedVehicle }) {
  const visualRef = useRef<Group>(null);
  useFrame(() => {
    const g = visualRef.current;
    if (!g) return;
    const [px, , pz] = useGame.getState().playerPos;
    const dx = px - vehicle.p[0];
    const dz = pz - vehicle.p[2];
    const show = dx * dx + dz * dz <= STAGED_CULL_DIST_SQ;
    if (g.visible !== show) g.visible = show;
  });

  return (
    <group name={vehicle.id} position={vehicle.p}>
      <group ref={visualRef}>
        <Fixture
          {...(vehicle.assetUrl ? { assetUrl: vehicle.assetUrl } : {})}
          height={VEHICLE_SIZE[vehicle.kind][1]}
        >
          <VehicleModel color={vehicle.color} kind={vehicle.kind} />
        </Fixture>
      </group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={VEHICLE_SIZE[vehicle.kind].map((v) => v / 2) as [number, number, number]}
          position={[0, VEHICLE_SIZE[vehicle.kind][1] / 2, 0]}
        />
      </RigidBody>
    </group>
  );
}

export function CommercialFrontage() {
  return (
    <group name="CommercialFrontage">
      <OutdoorBatch items={parts} shadows={false} />
      <Plang text="PICKUP · KURIR" position={[11, 1.5, 10.08]} size={0.19} board="#344b50" />
      {STAGED_VEHICLES.map((vehicle) => (
        <StagedVehicleProp key={vehicle.id} vehicle={vehicle} />
      ))}
    </group>
  );
}
