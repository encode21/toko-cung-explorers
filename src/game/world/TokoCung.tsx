/** @jsxImportSource @/game/jsx */
import { TimedPointLight } from "@/game/time/TimedFixtures";
import { WarehouseRack } from "@/game/assets/WarehouseRack";
import { ThreeFloorBuilding } from "./building/ThreeFloorBuilding";
import { CommerceAccess } from "./building/CommerceAccess";
import { RigidBody } from "@react-three/rapier";
import { GAME_ASSETS } from "@/assets/game-assets";
import { Model } from "@/game/world/Model";
import { Shelf } from "@/game/world/Shelf";
import { CASHIER_POS, SHELVES, STORE, WAREHOUSE } from "@/game/world/layout";
import { P } from "@/game/world/palette";
import { thin } from "@/game/engine/quality";
import { useTileTexture } from "@/game/world/StoreProps";
import { CashierCounter } from "./RetailFixtures";
import { Storefront, CeilingDetails, RetailDetails } from "./StoreBuilding";
import { StoreInterior } from "./StoreInterior";

const WALL = "#929b9d";
const FLOOR = P.floorStore;

function Wall({
  center,
  size,
  color = WALL,
}: {
  center: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <RigidBody type="fixed" position={center}>
      <mesh castShadow receiveShadow userData={{ cameraObstacle: true }}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </RigidBody>
  );
}

function Floor({
  minX,
  maxX,
  minZ,
  maxZ,
  color,
}: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  color: string;
}) {
  const w = maxX - minX;
  const d = maxZ - minZ;
  const map = useTileTexture(color, "rgba(100,103,98,0.10)", [w / 1.2, d / 1.2]);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[(minX + maxX) / 2, 0.05, (minZ + maxZ) / 2]}
      receiveShadow
    >
      <planeGeometry args={[maxX - minX, maxZ - minZ]} />
      <meshStandardMaterial map={map} roughnessMap={map} roughness={0.55} metalness={0.02} />
    </mesh>
  );
}

/** Bangunan Toko Cung: retail area, kasir, dan gudang di belakang. */
export function TokoCung() {
  const t = STORE.wallThickness;
  const h = STORE.wallHeight;

  return (
    <>
      <Floor
        minX={STORE.minX}
        maxX={STORE.maxX}
        minZ={STORE.minZ}
        maxZ={STORE.maxZ}
        color={FLOOR}
      />
      <Floor
        minX={WAREHOUSE.minX}
        maxX={WAREHOUSE.maxX}
        minZ={WAREHOUSE.minZ}
        maxZ={WAREHOUSE.maxZ}
        color={P.floorWarehouse}
      />
      <CeilingDetails />
      <RetailDetails />

      {/* Dinding retail */}
      <Wall
        center={[STORE.minX, h / 2, (STORE.minZ + STORE.maxZ) / 2]}
        size={[t, h, STORE.maxZ - STORE.minZ]}
      />
      <Wall
        center={[STORE.maxX, h / 2, (STORE.minZ + STORE.maxZ) / 2]}
        size={[t, h, STORE.maxZ - STORE.minZ]}
      />
      <Storefront />
      {/* Dinding belakang retail dengan pintu ke gudang */}
      <Wall center={[-2.2, h / 2, STORE.minZ]} size={[13.6, h, t]} />
      <Wall center={[8.4, h / 2, STORE.minZ]} size={[1.2, h, t]} />
      <Wall center={[WAREHOUSE.passageX, h - 0.4, STORE.minZ]} size={[3.2, 0.8, t]} />

      {/* Dinding gudang */}
      <Wall
        center={[WAREHOUSE.minX, h / 2, (WAREHOUSE.minZ + WAREHOUSE.maxZ) / 2]}
        size={[t, h, WAREHOUSE.maxZ - WAREHOUSE.minZ]}
        color="#e3dccd"
      />
      <Wall
        center={[WAREHOUSE.maxX, h / 2, (WAREHOUSE.minZ + WAREHOUSE.maxZ) / 2]}
        size={[t, h, WAREHOUSE.maxZ - WAREHOUSE.minZ]}
        color="#e3dccd"
      />
      {/* Rear loading door: 3.2 m clear, at grade for players and stock routes. */}
      <Wall center={[-5.3, h / 2, WAREHOUSE.minZ]} size={[7.4, h, t]} />
      <Wall center={[5.3, h / 2, WAREHOUSE.minZ]} size={[7.4, h, t]} />
      <Wall center={[0, h - 0.25, WAREHOUSE.minZ]} size={[3.2, 0.5, t]} />

      <ThreeFloorBuilding />
      <CommerceAccess />

      {/* Pintu masuk */}
      <Model url={GAME_ASSETS.doormat} height={0.05} position={[0, 0.06, STORE.maxZ + 0.9]} />
      <mesh position={[0, 0.06, STORE.maxZ - 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 1.6]} />
        <meshStandardMaterial color="#c9bfae" />
      </mesh>

      {/* Rak-rak */}
      {SHELVES.map((zone) => (
        <Shelf key={zone.id} zone={zone} />
      ))}

      {/* Meja kasir + POS */}
      <group position={CASHIER_POS}>
        <CashierCounter />
      </group>

      {/* Detail interior */}
      <Model url={GAME_ASSETS.plant} height={1.2} position={[-7.8, 0.06, 1.6]} />
      <StoreInterior />

      {/* Gudang: rak besi, dus, meja packing */}
      <WarehouseRack position={[-7, 0.06, -20]} />
      <WarehouseRack position={[-2.5, 0.06, -20]} />
      <WarehouseRack position={[2, 0.06, -20]} />
      {(
        [
          [-5.6, -15],
          [-6.4, -15.9],
          [0.4, -15.2],
          [1.4, -16.4],
          [5.2, -20.4],
        ] as [number, number][]
      ).map(([x, z], i) => (
        <Model
          key={i}
          url={GAME_ASSETS.boxClosed}
          height={0.55}
          position={[x, 0.06, z]}
          rotationY={i * 0.7}
        />
      ))}
      {thin([-16, -20]).map((z) => (
        <TimedPointLight
          key={z}
          position={[0, STORE.wallHeight - 0.3, z]}
          intensity={7}
          distance={14}
        />
      ))}
    </>
  );
}
