/** @jsxImportSource @/game/jsx */
import { DeliveryTruck } from "@/game/missions/DeliveryTruck";
import { OCEAN_PLAY_LIMIT } from "@/game/swimming/model";
import { BeachGround } from "@/game/swimming/BeachGround";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { GAME_ASSETS } from "@/assets/game-assets";
import { Model } from "./Model";
import { ReferenceNeighbor } from "./ReferenceNeighbors";
import { NEIGHBOR_SKINS } from "./neighbor-skins";
import { BuildingLot } from "./BuildingLot";
import { StreetFurniture } from "./props/StreetFurniture";
import { CommercialFrontage } from "./props/CommercialFrontage";
import { RoadNetwork } from "./RoadNetwork";
import { BUILDING_LOTS, validateLots } from "./outdoor-layout";
import { TrafficSystem } from "@/game/traffic/TrafficSystem";
import { LOW_QUALITY, thin } from "@/game/engine/quality";

const lotErrors = validateLots();
if (import.meta.env.DEV && lotErrors.length) console.warn("Invalid outdoor lots", lotErrors);

function WorldBounds() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[OCEAN_PLAY_LIMIT, 8, 0.25]} position={[0, 0, -OCEAN_PLAY_LIMIT]} />
      <CuboidCollider args={[OCEAN_PLAY_LIMIT, 8, 0.25]} position={[0, 0, OCEAN_PLAY_LIMIT]} />
      <CuboidCollider args={[0.25, 8, OCEAN_PLAY_LIMIT]} position={[-OCEAN_PLAY_LIMIT, 0, 0]} />
      <CuboidCollider args={[0.25, 8, OCEAN_PLAY_LIMIT]} position={[OCEAN_PLAY_LIMIT, 0, 0]} />
    </RigidBody>
  );
}

/** Intentional neighborhood: every visible building is a validated lot around a shared road plan. */
export function OutdoorNeighborhood() {
  const lots = BUILDING_LOTS.filter((lot) => lot.id !== "toko-cung" && lot.id !== "partner-4");
  return (
    <>
      <BeachGround />
      <RoadNetwork />
      <StreetFurniture />
      {lots.map((lot) =>
        NEIGHBOR_SKINS[lot.id] ? (
          <ReferenceNeighbor key={lot.id} lot={lot} />
        ) : (
          <BuildingLot key={lot.id} lot={lot} />
        ),
      )}
      <CommercialFrontage />
      {!LOW_QUALITY &&
        thin(GAME_ASSETS.skyline, 3).map((url, i) => (
          <Model key={url} url={url} height={24 + i * 5} position={[-38 + i * 38, 0, 58]} />
        ))}
      <TrafficSystem />
      <DeliveryTruck />
      <WorldBounds />
    </>
  );
}
