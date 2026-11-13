/** @jsxImportSource @/game/jsx */
import { BuildingLot as TownBuilding } from "./BuildingLot";
import type { BuildingLot } from "./outdoor-layout";

/** Existing neighbor parcels now use the same detailed Indonesian streetscape language. */
export function ReferenceNeighbor({ lot }: { lot: BuildingLot }) {
  return <TownBuilding lot={lot} />;
}
