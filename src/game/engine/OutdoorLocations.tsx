/** @jsxImportSource @/game/jsx */
import type { ReactNode } from "react";
import { useMountainLocation } from "./location";

/** Inactive scenery and its colliders are unmounted, not merely hidden behind fog. */
export function OutdoorLocations({ city, mountain }: { city: ReactNode; mountain: ReactNode }) {
  const inMountain = useMountainLocation();
  return inMountain ? (
    <group key="mountain" name="MountainLocation">
      {mountain}
    </group>
  ) : (
    <group key="city" name="CityLocation">
      {city}
    </group>
  );
}
