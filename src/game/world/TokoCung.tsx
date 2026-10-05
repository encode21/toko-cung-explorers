/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { GAME_ASSETS } from "@/assets/game-assets";
import { Model } from "@/game/world/Model";
import { Shelf } from "@/game/world/Shelf";
import { CASHIER_POS, SHELVES, STORE, WAREHOUSE } from "@/game/world/layout";
import { P } from "@/game/world/palette";
import { useGame } from "@/state/game-store";
import { thin } from "@/game/engine/quality";
import { useTileTexture } from "@/game/world/StoreProps";
import { CashierCounter } from "./RetailFixtures";
import { Storefront, CeilingDetails, RetailDetails } from "./StoreBuilding";
import { StoreInterior } from "./StoreInterior";

const WALL = "#efe3cf";
const FLOOR = P.floorStore;
const TRIM = "#c8443a";

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
  // Atap disembunyikan saat pemain di dalam supaya kamera third-person tetap jelas.
  const inside = useGame((s) => s.inside);

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
      <Wall center={[-1.6, h / 2, STORE.minZ]} size={[14.8, h, t]} />
      <Wall center={[8.2, h / 2, STORE.minZ]} size={[1.6, h, t]} />
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
      <Wall
        center={[0, h / 2, WAREHOUSE.minZ]}
        size={[WAREHOUSE.maxX - WAREHOUSE.minX + t, h, t]}
        color="#e3dccd"
      />

      {/* Atap + kanopi + papan nama */}
      <mesh position={[0, h + 0.1, (STORE.minZ + STORE.maxZ) / 2]} receiveShadow visible={!inside}>
        <boxGeometry args={[STORE.maxX - STORE.minX + 0.8, 0.3, STORE.maxZ - STORE.minZ + 0.8]} />
        <meshStandardMaterial color="#b7ab97" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, h + 0.1, (WAREHOUSE.minZ + WAREHOUSE.maxZ) / 2]}
        receiveShadow
        visible={!inside}
      >
        <boxGeometry
          args={[WAREHOUSE.maxX - WAREHOUSE.minX + 0.8, 0.3, WAREHOUSE.maxZ - WAREHOUSE.minZ]}
        />
        <meshStandardMaterial color="#a89d8b" roughness={0.9} />
      </mesh>
      <mesh position={[0, h - 0.7, STORE.maxZ + 1.1]} castShadow visible={!inside}>
        <boxGeometry args={[STORE.maxX - STORE.minX + 0.6, 0.18, 2.2]} />
        <meshStandardMaterial color={TRIM} roughness={0.7} />
      </mesh>
      <group position={[0, h + 0.75, STORE.maxZ + 0.35]} visible={!inside}>
        <mesh castShadow>
          <boxGeometry args={[11, 1.5, 0.3]} />
          <meshStandardMaterial color={TRIM} roughness={0.5} />
        </mesh>
        <Text
          position={[0, 0.05, 0.2]}
          fontSize={0.85}
          color="#fff6e6"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
        >
          TOKO CUNG
        </Text>
        <Text
          position={[0, -0.55, 0.2]}
          fontSize={0.24}
          color="#f6d9a5"
          anchorX="center"
          anchorY="middle"
        >
          GROSIR &amp; RETAIL · BUKA 07.00 - 22.00
        </Text>
      </group>

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
      <Model url={GAME_ASSETS.shelfClosed} height={2.4} position={[-7, 0.06, -20]} />
      <Model url={GAME_ASSETS.shelfClosed} height={2.4} position={[-2.5, 0.06, -20]} />
      <Model url={GAME_ASSETS.shelfClosed} height={2.4} position={[2, 0.06, -20]} />
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
        <pointLight
          key={z}
          position={[0, STORE.wallHeight - 0.3, z]}
          intensity={7}
          distance={14}
          color="#f2f5ff"
        />
      ))}
    </>
  );
}
