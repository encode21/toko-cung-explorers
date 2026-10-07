/** @jsxImportSource @/game/jsx */
import { TimedPointLight, TimedEmission } from "@/game/time/TimedFixtures";
import { ShoppingBaskets } from "@/game/assets/RetailAccessories";
import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { GAME_ASSETS } from "@/assets/game-assets";
import { Model } from "./Model";
import { CASHIER_POS, STORE, WAREHOUSE } from "./layout";
import { thin, LOW_QUALITY } from "@/game/engine/quality";
import { ProductBlocks, type Item } from "./StoreProps";
import { CategorySign as HangingSign } from "./CategorySign";
import { RetailShelf as RetailGondola } from "./RetailShelf";
const H = STORE.wallHeight;

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
    <group position={[STORE.maxX - 0.35, 0, 1.0]} rotation={[0, 0, 0]}>
      <mesh position={[0.1, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 1.6, 2.6]} />
        <meshStandardMaterial color="#2b3238" roughness={0.6} />
      </mesh>
      <group position={[-0.08, 0, 0]}>
        <ProductBlocks items={items} category="tobacco" />
      </group>
      <mesh position={[0.05, 0.45, 0]}>
        <boxGeometry args={[0.4, 0.9, 2.6]} />
        <meshStandardMaterial color="#d8dde0" roughness={0.5} />
      </mesh>
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

/** Pulau promo dekat pintu: meja rendah, tumpukan dus, papan harga kecil. */
function PromoIsland() {
  const items = useMemo(() => {
    const out: Item[] = [];
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++)
        for (let z = 0; z < 2; z++)
          if (y < 2 || (x + z) % 2 === 0)
            out.push({
              p: [-0.45 + x * 0.45, 0.72 + y * 0.3, -0.22 + z * 0.44],
              s: [0.42, 0.28, 0.42],
            });
    return out;
  }, []);
  return (
    <group position={[-2.6, 0, 0.6]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.8, 0.6, 0.55]} position={[0, 0.6, 0]} />
      </RigidBody>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.6, 1.1]} />
        <meshStandardMaterial color="#c8443a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.66, 0.04, 1.16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <ProductBlocks items={items} category="instant" seed={4} />
      <group position={[0, 1.75, 0]}>
        <mesh>
          <boxGeometry args={[0.9, 0.34, 0.03]} />
          <meshStandardMaterial color="#f2c230" />
        </mesh>
        <Text position={[0, 0, 0.02]} fontSize={0.12} color="#1e2a44">
          PROMO HEMAT
        </Text>
        <Text position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]} fontSize={0.12} color="#1e2a44">
          PROMO HEMAT
        </Text>
        <mesh position={[0, -0.45, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.6, 4]} />
          <meshBasicMaterial color="#6f7a80" />
        </mesh>
      </group>
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

/** Plafon (menghadap bawah, jadi tak menghalangi kamera dari atas) + lampu panel. */
function Ceiling() {
  const panels = useMemo(() => {
    const out: [number, number][] = [];
    for (const x of [-6, -2, 2, 6]) for (const z of [0, -4, -8, -11.5]) out.push([x, z]);
    return out;
  }, []);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H - 0.02, (STORE.minZ + STORE.maxZ) / 2]}>
        <planeGeometry args={[STORE.maxX - STORE.minX, STORE.maxZ - STORE.minZ]} />
        <meshStandardMaterial color="#f4f5f2" roughness={0.9} />
      </mesh>
      {panels.map(([x, z]) => (
        <mesh key={`${x}${z}`} rotation={[Math.PI / 2, 0, 0]} position={[x, H - 0.04, z]}>
          <planeGeometry args={[1.6, 0.4]} />
          <TimedEmission />
        </mesh>
      ))}
      {thin([
        [-4, -1.5],
        [4, -1.5],
        [-4, -8],
        [4, -8],
        [0, -5],
      ] as [number, number][]).map(([x, z]) => (
        <TimedPointLight
          key={`${x}-${z}`}
          position={[x, H - 0.25, z]}
          intensity={LOW_QUALITY ? 8 : 6}
          distance={10}
          decay={1.6}
        />
      ))}
    </group>
  );
}

/** Kolom, lis dinding, jendela depan, kusen pintu gudang. */
function Architecture() {
  return (
    <group>
      {[STORE.minX + 0.2, STORE.maxX - 0.2].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.15, (STORE.minZ + STORE.maxZ) / 2]}>
            <boxGeometry args={[0.06, 0.3, STORE.maxZ - STORE.minZ - 0.4]} />
            <meshStandardMaterial color="#8d9b8f" />
          </mesh>
          {[-1, -6, -11].map((z) => (
            <mesh key={z} position={[x, H / 2, z]} castShadow>
              <boxGeometry args={[0.3, H, 0.4]} />
              <meshStandardMaterial color="#e2ddd2" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      <group position={[WAREHOUSE.passageX, 0, STORE.minZ + 0.2]}>
        {[-1.65, 1.65].map((x) => (
          <mesh key={x} position={[x, (H - 0.8) / 2, 0]}>
            <boxGeometry args={[0.12, H - 0.8, 0.12]} />
            <meshStandardMaterial color="#c8443a" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Seluruh detail interior retail yang ringan dan teroptimasi. */
export function StoreInterior() {
  return (
    <group>
      <Ceiling />
      <Architecture />
      {/* Gondola tengah: snack & cemilan */}
      <group position={[0, 0, -4.9]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.5, 0.85, 1.9]} position={[0, 0.85, 0]} />
        </RigidBody>
        <RetailGondola length={3.8} height={1.7} category="snack" label="Snack & Cemilan" />
      </group>
      <PromoIsland />
      <Baskets />
      <CigaretteDisplay />
      {/* Short secondary bays tighten browsing aisles while keeping NPC paths clear. */}
      {[-2.2, 2.2].map((x, i) => (
        <group key={x} position={[x, 0, -8.1]}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[0.48, 0.85, 1.55]} position={[0, 0.85, 0]} />
          </RigidBody>
          <RetailGondola
            length={3}
            category={i ? "household" : "instant"}
            label={i ? "Personal Care" : "Pilihan Harian"}
          />
        </group>
      ))}
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
        position={[3.9, H - 0.55, -5.5]}
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
