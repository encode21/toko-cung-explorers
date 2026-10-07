/** @jsxImportSource @/game/jsx */
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
      <CuboidCollider args={[56, 1.4, 0.25]} position={[0, 1.4, -56]} />
      <CuboidCollider args={[56, 1.4, 0.25]} position={[0, 1.4, 56]} />
      <CuboidCollider args={[0.25, 1.4, 56]} position={[-56, 1.4, 0]} />
      <CuboidCollider args={[0.25, 1.4, 56]} position={[56, 1.4, 0]} />
    </RigidBody>
  );
}

/** Intentional neighborhood: every visible building is a validated lot around a shared road plan. */
export function OutdoorNeighborhood() {
  const lots = BUILDING_LOTS.filter((lot) => lot.id !== "toko-cung");
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]} receiveShadow>
          <planeGeometry args={[640, 640]} />
          <meshStandardMaterial color="#91a875" roughness={1} />
        </mesh>
        <CuboidCollider args={[120, 0.1, 120]} position={[0, -0.14, 0]} />
      </RigidBody>
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
      <WorldBounds />
    </>
  );
}
