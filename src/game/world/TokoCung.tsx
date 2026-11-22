/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { WarehouseRack } from "@/game/assets/WarehouseRack";
import { ThreeFloorBuilding } from "./building/ThreeFloorBuilding";
import { CommerceAccess } from "./building/CommerceAccess";
import { GAME_ASSETS } from "@/assets/game-assets";
import { Model } from "@/game/world/Model";
import { Shelf } from "@/game/world/Shelf";
import { CASHIERS, SHELVES, STORE, WAREHOUSE } from "@/game/world/layout";
import { P } from "@/game/world/palette";
import { useTileTexture } from "@/game/world/StoreProps";
import { useGame } from "@/state/game-store";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { CashierCounter } from "./RetailFixtures";
import { Storefront, CeilingDetails, RetailDetails } from "./StoreBuilding";
import { StoreInterior } from "./StoreInterior";

const WALL = "#929b9d";
const WAREHOUSE_WALL = "#e3dccd";
const FLOOR = P.floorStore;
const T = STORE.wallThickness;
const H = STORE.wallHeight;

type WallSpec = { center: [number, number, number]; size: [number, number, number]; color: string };
const WALLS: WallSpec[] = [
  // Dinding retail
  {
    center: [STORE.minX, H / 2, (STORE.minZ + STORE.maxZ) / 2],
    size: [T, H, STORE.maxZ - STORE.minZ],
    color: WALL,
  },
  {
    center: [STORE.maxX, H / 2, (STORE.minZ + STORE.maxZ) / 2],
    size: [T, H, STORE.maxZ - STORE.minZ],
    color: WALL,
  },
  // Dinding belakang retail dengan pintu ke gudang
  { center: [-2.2, H / 2, STORE.minZ], size: [13.6, H, T], color: WALL },
  { center: [8.4, H / 2, STORE.minZ], size: [1.2, H, T], color: WALL },
  { center: [WAREHOUSE.passageX, H - 0.4, STORE.minZ], size: [3.2, 0.8, T], color: WALL },
  // Dinding gudang
  {
    center: [WAREHOUSE.minX, H / 2, (WAREHOUSE.minZ + WAREHOUSE.maxZ) / 2],
    size: [T, H, WAREHOUSE.maxZ - WAREHOUSE.minZ],
    color: WAREHOUSE_WALL,
  },
  {
    center: [WAREHOUSE.maxX, H / 2, (WAREHOUSE.minZ + WAREHOUSE.maxZ) / 2],
    size: [T, H, WAREHOUSE.maxZ - WAREHOUSE.minZ],
    color: WAREHOUSE_WALL,
  },
  // Rear loading door: 3.2 m clear, at grade for players and stock routes.
  { center: [-5.3, H / 2, WAREHOUSE.minZ], size: [7.4, H, T], color: WAREHOUSE_WALL },
  { center: [5.3, H / 2, WAREHOUSE.minZ], size: [7.4, H, T], color: WAREHOUSE_WALL },
  { center: [0, H - 0.25, WAREHOUSE.minZ], size: [3.2, 0.5, T], color: WAREHOUSE_WALL },
];

const wallParts: OutdoorPart[] = WALLS.map((w) => ({
  p: w.center,
  s: w.size,
  color: w.color,
}));

const WAREHOUSE_BOXES: [number, number][] = [
  [-5.6, -15],
  [-6.4, -15.9],
  [0.4, -15.2],
  [1.4, -16.4],
  [5.2, -20.4],
];

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

/** Bangunan Toko Cung: retail area, kasir, dan gudang di belakang (di-batch & di-cull seperti Pegunungan). */
export function TokoCung() {
  const interiorDetailsRef = useRef<Group>(null);
  const warehouseVisualRef = useRef<Group>(null);
  const gl = useThree((s) => s.gl);
  // Leaving the city scene from inside the store must not keep the shadow map frozen.
  useEffect(() => () => void (gl.shadowMap.autoUpdate = true), [gl]);

  // Zero-rerender distance culling: hide fine interior & rear warehouse when outside/far.
  useFrame(({ gl }) => {
    const { playerPos, inside } = useGame.getState();
    const [px, , pz] = playerPos;
    // The roof shades the whole interior, so the sun shadow pass (~half the draw calls) is wasted
    // indoors: take one snapshot with the player already inside, then freeze it until they leave.
    if (gl.shadowMap.autoUpdate === inside) {
      gl.shadowMap.autoUpdate = !inside;
      gl.shadowMap.needsUpdate = true;
    }
    if (interiorDetailsRef.current) {
      const showInterior = Math.abs(px) < 18 && pz > -25 && pz < 16;
      if (interiorDetailsRef.current.visible !== showInterior) {
        interiorDetailsRef.current.visible = showInterior;
      }
    }
    if (warehouseVisualRef.current) {
      const showWarehouse = Math.abs(px) < 22 && pz < 2;
      if (warehouseVisualRef.current.visible !== showWarehouse) {
        warehouseVisualRef.current.visible = showWarehouse;
      }
    }
  });

  return (
    <group name="TokoCung">
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

      {/* Semua dinding retail + gudang dalam 1 draw call; collider tetap presisi. */}
      <group userData={{ cameraObstacle: true }}>
        <OutdoorBatch items={wallParts} shape="box" />
      </group>
      <RigidBody type="fixed" colliders={false}>
        {WALLS.map((w, i) => (
          <CuboidCollider
            key={i}
            args={[w.size[0] / 2, w.size[1] / 2, w.size[2] / 2]}
            position={w.center}
          />
        ))}
      </RigidBody>

      <Storefront />
      <ThreeFloorBuilding />
      <CommerceAccess />

      {/* Pintu masuk */}
      <Model url={GAME_ASSETS.doormat} height={0.05} position={[0, 0.06, STORE.maxZ + 0.9]} />
      <mesh position={[0, 0.06, STORE.maxZ - 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 1.6]} />
        <meshStandardMaterial color="#c9bfae" />
      </mesh>

      {/* Rak-rak & meja kasir */}
      {SHELVES.map((zone) => (
        <Shelf key={zone.id} zone={zone} />
      ))}
      {CASHIERS.map((counter) => (
        <group
          key={counter.id}
          name={counter.id}
          position={counter.position}
          rotation-y={counter.yaw}
        >
          <CashierCounter number={counter.number} />
        </group>
      ))}

      {/* Detail interior: disembunyikan saat jauh dari Toko Cung */}
      <group ref={interiorDetailsRef}>
        <CeilingDetails />
        <RetailDetails />
        <Model url={GAME_ASSETS.plant} height={1.2} position={[-7.8, 0.06, 1.6]} />
        <StoreInterior />
      </group>

      {/* Gudang: rak besi & dus (disembunyikan saat berdiri di depan toko) */}
      <group ref={warehouseVisualRef} name="TokoCung-Warehouse">
        <WarehouseRack position={[-7, 0.06, -20]} />
        <WarehouseRack position={[-2.5, 0.06, -20]} />
        <WarehouseRack position={[2, 0.06, -20]} />
        {WAREHOUSE_BOXES.map(([x, z], i) => (
          <Model
            key={i}
            url={GAME_ASSETS.boxClosed}
            height={0.55}
            position={[x, 0.06, z]}
            rotationY={i * 0.7}
          />
        ))}
      </group>
    </group>
  );
}
