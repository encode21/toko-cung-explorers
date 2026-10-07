/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { OutdoorBatch, type OutdoorPart } from "../OutdoorBatch";
import { VehicleModel } from "@/game/traffic/VehicleModel";

import { STAGED_VEHICLES, VEHICLE_SIZE } from "@/game/assets/vehicles";
import { Fixture } from "../Fixture";
const parts: OutdoorPart[] = [
  // Commercial forecourt edge and recessed delivery-yard surface.
  { p: [0, 0.065, -26], s: [19, 0.025, 5], color: "#687579" },
  { p: [4.7, 0.07, 10.3], s: [9, 0.02, 0.1], color: "#bf303b" },
  { p: [10.4, 0.07, -10], s: [0.08, 0.02, 24], color: "#dec778" },
  // Compact directory sign for pickup, off the pedestrian spine.
  { p: [11, 1.5, 10], s: [2, 0.65, 0.12], color: "#33494f" },
  { p: [11, 0.6, 10], s: [0.1, 1.2, 0.1], color: "#59676a" },
];
export function CommercialFrontage() {
  return (
    <group name="CommercialFrontage">
      <OutdoorBatch items={parts} shadows={false} />
      <Text position={[11, 1.5, 10.08]} fontSize={0.19} color="#fff2d6">
        PICKUP · KURIR
      </Text>
      {STAGED_VEHICLES.map((vehicle) => (
        <group key={vehicle.id} name={vehicle.id} position={vehicle.p}>
          <Fixture
            {...(vehicle.assetUrl ? { assetUrl: vehicle.assetUrl } : {})}
            height={VEHICLE_SIZE[vehicle.kind][1]}
          >
            <VehicleModel color={vehicle.color} kind={vehicle.kind} />
          </Fixture>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider
              args={VEHICLE_SIZE[vehicle.kind].map((v) => v / 2) as [number, number, number]}
              position={[0, VEHICLE_SIZE[vehicle.kind][1] / 2, 0]}
            />
          </RigidBody>
        </group>
      ))}
    </group>
  );
}
