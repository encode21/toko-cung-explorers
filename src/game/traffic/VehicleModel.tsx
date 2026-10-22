/** @jsxImportSource @/game/jsx */
import { VehicleLights } from "./VehicleLights";
import { Text } from "@react-three/drei";
import { useMemo } from "react";
import { StyledBatch } from "../assets/StyledBatch";
import { vehicleParts, type VehicleKind } from "../assets/vehicles";

/** Visual only. +Z forward and the existing traffic controller contract are retained. */
export function VehicleModel({
  color = "#b86552",
  van = false,
  kind,
  rider = false,
  emptyBed = false,
}: {
  color?: string;
  van?: boolean;
  kind?: VehicleKind;
  rider?: boolean;
  emptyBed?: boolean;
}) {
  const type = kind ?? (van ? "van" : "car");
  const parts = useMemo(
    () => vehicleParts(type, color, rider, emptyBed),
    [type, color, rider, emptyBed],
  );
  return (
    <group name={`vehicle-${type}`}>
      <StyledBatch items={parts} />
      <VehicleLights kind={type} />
      {type === "van" &&
        [-1, 1].map((side) => (
          <Text
            key={side}
            position={[side * 0.835, 1.52, -0.83]}
            rotation-y={(side * Math.PI) / 2}
            fontSize={0.16}
            color="#fff4df"
          >
            TOKO CUNG
          </Text>
        ))}
    </group>
  );
}
