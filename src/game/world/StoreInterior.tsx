/** @jsxImportSource @/game/jsx */
import { KioskDevice } from "./KioskDevice";
import { TimedEmission } from "@/game/time/TimedFixtures";
import { ShoppingBaskets } from "@/game/assets/RetailAccessories";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { GAME_ASSETS } from "@/assets/game-assets";
import { Model } from "./Model";
import { CASHIER_POS, STORE, WAREHOUSE } from "./layout";
import { LOW_QUALITY } from "@/game/engine/quality";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import { ProductBlocks, type Item } from "./StoreProps";
import { CategorySign as HangingSign } from "./CategorySign";

const H = STORE.wallHeight;

const CEILING_PANELS: [number, number][] = [];
for (const x of [-6, -2, 2, 6]) for (const z of [0, -4, -8, -11.5]) CEILING_PANELS.push([x, z]);
const panelGeo = new THREE.PlaneGeometry(1.6, 0.4);

const architectureParts: OutdoorPart[] = (() => {
  const out: OutdoorPart[] = [];
  for (const x of [STORE.minX + 0.2, STORE.maxX - 0.2]) {
    out.push({
      p: [x, 0.15, (STORE.minZ + STORE.maxZ) / 2],
      s: [0.06, 0.3, STORE.maxZ - STORE.minZ - 0.4],
      color: "#8d9b8f",
    });
    for (const z of [-1, -6, -11]) {
      out.push({ p: [x, H / 2, z], s: [0.3, H, 0.4], color: "#e2ddd2" });
    }
  }
  for (const x of [-1.65, 1.65]) {
    out.push({
      p: [WAREHOUSE.passageX + x, (H - 0.8) / 2, STORE.minZ + 0.2],
      s: [0.12, H - 0.8, 0.12],
      color: "#c8443a",
    });
  }
  return out;
})();

const cigaretteFrame: OutdoorPart[] = [
  { p: [0.1, 1.3, 0], s: [0.3, 1.6, 2.6], color: "#2b3238" },
  { p: [0.05, 0.45, 0], s: [0.4, 0.9, 2.6], color: "#d8dde0" },
];

/** Rak rokok di belakang kasir: kotak-kotak kecil warna-warni dalam etalase. */
function CigaretteDisplay() {
  const items = useMemo(() => {
    const out: Item[] = [];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 12; c++)
        out.push({ p: [0.05, 0.95 + r * 0.22, -1.1 + c * 0.19], s: [0.06, 0.16, 0.13] });
    return out;
  }, []);
  return (
    <group position={[STORE.maxX - 0.2, 0, -4.6]}>
      <OutdoorBatch items={cigaretteFrame} shadows={false} />
      <group position={[-0.08, 0, 0]}>
        <ProductBlocks items={items} category="tobacco" />
      </group>
      <Text
        position={[-0.1, 2.25, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.14}
        color="#c8443a"
        letterSpacing={0.08}
      >
        ROKOK
      </Text>
    </group>
  );
}

/** Tumpukan keranjang belanja di dekat pintu. */
function Baskets() {
  return (
    <group position={[-1.9, 0, 2.3]}>
      <ShoppingBaskets />
    </group>
  );
}

/**
 * Plafon + 16 panel lampu dalam 1 InstancedMesh (tanpa dynamic pointLight per lampu,
 * mengikuti pola lentera/obor Pegunungan agar fragment shader tetap ringan di HP).
 */
function Ceiling() {
  const panelsRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = panelsRef.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    CEILING_PANELS.forEach(([x, z], i) => {
      o.position.set(x, H - 0.04, z);
      o.rotation.set(Math.PI / 2, 0, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H - 0.02, (STORE.minZ + STORE.maxZ) / 2]}>
        <planeGeometry args={[STORE.maxX - STORE.minX, STORE.maxZ - STORE.minZ]} />
        <meshStandardMaterial color="#f4f5f2" roughness={0.9} />
      </mesh>
      <instancedMesh
        ref={panelsRef}
        args={[panelGeo, undefined, CEILING_PANELS.length]}
        dispose={null}
      >
        <TimedEmission />
      </instancedMesh>
    </group>
  );
}

/** Seluruh detail interior retail yang ringan dan teroptimasi (batched seperti Pegunungan). */
export function StoreInterior() {
  return (
    <group name="TokoCung-Interior">
      <Ceiling />
      <OutdoorBatch items={architectureParts} shadows={false} />
      {/* Jalur tengah terbuka dari pintu masuk sampai gudang. */}
      <KioskDevice />
      <Baskets />
      <CigaretteDisplay />
      <HangingSign
        text="Kasir"
        position={[CASHIER_POS[0], H - 0.6, CASHIER_POS[2] - 0.2]}
        ceiling={H}
        tone="#2f7d59"
      />
      <HangingSign
        text="Makanan Instan · Minuman"
        position={[-3.9, H - 0.55, -5.5]}
        rotationY={Math.PI / 2}
        ceiling={H}
        width={2.2}
      />
      <HangingSign
        text="Rumah Tangga · Sembako"
        position={[0.3, H - 0.55, -9.5]}
        rotationY={Math.PI / 2}
        ceiling={H}
        width={2.2}
      />
      <HangingSign
        text="Gudang · Packing →"
        position={[WAREHOUSE.passageX, H - 0.55, STORE.minZ + 0.8]}
        ceiling={H}
        tone="#c8443a"
        width={1.9}
      />
      {!LOW_QUALITY && <Model url={GAME_ASSETS.plant} height={1.1} position={[7.8, 0.06, 2.2]} />}
    </group>
  );
}
