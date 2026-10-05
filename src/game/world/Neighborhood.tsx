/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { GAME_ASSETS } from "@/assets/game-assets";
import { Model } from "@/game/world/Model";
import { Text } from "@react-three/drei";
import { STREET_Z } from "@/game/world/layout";
import { PLACES, PLACE_TONE_COLOR } from "@/game/world/places";
import { LOW_QUALITY, thin } from "@/game/engine/quality";

const ASPHALT = "#3a3a40";
const SIDEWALK = "#b9b2a4";
const GROUND = "#8ca06a";
const PATH = "#c9b998";

/** Kendaraan kurir yang lewat depan toko (world simulation ringan). */
function PassingVan({ z = STREET_Z + 1.6, speed = 6, color = "#e2574c", offset = -30 }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    g.position.x += delta * speed;
    if (g.position.x > 60) g.position.x = -60;
    if (g.position.x < -60) g.position.x = 60;
  });
  return (
    <group ref={ref} position={[offset, 0, z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[4.6, 1.5, 2.1]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[1.4, 1.9, 0]} castShadow>
        <boxGeometry args={[1.8, 1, 2]} />
        <meshStandardMaterial color="#f4f0e6" roughness={0.6} />
      </mesh>
      {[
        [-1.5, 0.4, 1.05],
        [1.5, 0.4, 1.05],
        [-1.5, 0.4, -1.05],
        [1.5, 0.4, -1.05],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.25, 12]} />
          <meshStandardMaterial color="#26262a" />
        </mesh>
      ))}
    </group>
  );
}

/** Rumah warga sederhana: dinding + atap pelana + teras. */
function House({
  position,
  rotationY = 0,
  wall = "#f0e2c8",
  roof = "#a45a3c",
  width = 7,
  depth = 6,
}: {
  position: [number, number, number];
  rotationY?: number;
  wall?: string;
  roof?: string;
  width?: number;
  depth?: number;
}) {
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 3, depth]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      {/* Atap pelana */}
      <mesh position={[0, 3.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0.001, width * 0.72, 1.7, 4, 1]} />
        <meshStandardMaterial color={roof} roughness={0.85} />
      </mesh>
      {/* Pintu & jendela */}
      <mesh position={[0, 1, depth / 2 + 0.02]}>
        <planeGeometry args={[1.1, 2]} />
        <meshStandardMaterial color="#6b4a32" />
      </mesh>
      <mesh position={[-2.1, 1.7, depth / 2 + 0.02]}>
        <planeGeometry args={[1.3, 1.1]} />
        <meshStandardMaterial color="#9ec4d6" roughness={0.3} />
      </mesh>
      <mesh position={[2.1, 1.7, depth / 2 + 0.02]}>
        <planeGeometry args={[1.3, 1.1]} />
        <meshStandardMaterial color="#9ec4d6" roughness={0.3} />
      </mesh>
      {/* Teras */}
      <mesh position={[0, 0.06, depth / 2 + 1.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, 2.2]} />
        <meshStandardMaterial color="#cfc4ad" roughness={1} />
      </mesh>
      <CuboidCollider args={[width / 2, 1.8, depth / 2]} position={[0, 1.8, 0]} />
    </RigidBody>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 2.2, 8]} />
        <meshStandardMaterial color="#6b4a2f" roughness={1} />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow>
        <sphereGeometry args={[1.25, 14, 12]} />
        <meshStandardMaterial color="#4e7a3c" roughness={0.95} />
      </mesh>
      <mesh position={[0.7, 2.1, 0.4]} castShadow>
        <sphereGeometry args={[0.8, 12, 10]} />
        <meshStandardMaterial color="#5d8c45" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Bench({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 0.55]} />
        <meshStandardMaterial color="#8a5f3c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, -0.25]} castShadow>
        <boxGeometry args={[1.8, 0.5, 0.12]} />
        <meshStandardMaterial color="#8a5f3c" roughness={0.9} />
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]}>
          <boxGeometry args={[0.12, 0.44, 0.5]} />
          <meshStandardMaterial color="#5c5750" />
        </mesh>
      ))}
    </group>
  );
}

/** Taman warga di sisi timur toko. */
function Park() {
  return (
    <group position={[34, 0, 4]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[26, 30]} />
        <meshStandardMaterial color="#7f9a5c" roughness={1} />
      </mesh>
      {/* Jalur setapak */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[3, 30]} />
        <meshStandardMaterial color={PATH} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[26, 3]} />
        <meshStandardMaterial color={PATH} roughness={1} />
      </mesh>
      {/* Kolam */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7, 0.05, -9]} receiveShadow>
        <circleGeometry args={[3.4, 28]} />
        <meshStandardMaterial color="#4f86a6" roughness={0.2} metalness={0.1} />
      </mesh>
      {[
        [-8, 0, 8],
        [8, 0, 9],
        [9, 0, -7],
        [-9, 0, 1],
        [6, 0, 1],
        [-4, 0, -12],
        [10, 0, 13],
      ].map((p, i) => (
        <Tree key={i} position={p as [number, number, number]} scale={0.9 + (i % 3) * 0.18} />
      ))}
      <Bench position={[2.4, 0, 6]} rotationY={-Math.PI / 2} />
      <Bench position={[-2.4, 0, -3]} rotationY={Math.PI / 2} />
      <Bench position={[2.4, 0, -10]} rotationY={-Math.PI / 2} />
      <Model url={GAME_ASSETS.parasol} height={2.6} position={[4.5, 0.05, 12]} />
    </group>
  );
}

/** Halaman gudang di belakang toko: dok bongkar muat, palet, dan truk. */
function WarehouseYard() {
  return (
    <group position={[0, 0, -30]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[40, 18]} />
        <meshStandardMaterial color="#9a978d" roughness={1} />
      </mesh>
      {/* Dok bongkar muat */}
      <RigidBody type="fixed" colliders={false} position={[-9, 0, 4]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[10, 1.1, 4]} />
          <meshStandardMaterial color="#b0a795" roughness={1} />
        </mesh>
        <CuboidCollider args={[5, 0.55, 2]} position={[0, 0.55, 0]} />
      </RigidBody>
      {/* Palet & dus */}
      {[
        [6, 0, 2],
        [8.6, 0, 3.6],
        [4.4, 0, 5],
      ].map((p, i) => (
        <group key={i} position={p as [number, number, number]}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[1.6, 0.24, 1.6]} />
            <meshStandardMaterial color="#8a6a45" roughness={1} />
          </mesh>
          <Model url={GAME_ASSETS.boxClosed} height={0.9} position={[0, 0.24, 0]} />
        </group>
      ))}
      <PassingVan z={-6} speed={0} offset={12} color="#3f7d55" />
    </group>
  );
}

export function Neighborhood() {
  return (
    <>
      {/* Tanah utama */}
      <RigidBody type="fixed" colliders={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color={GROUND} roughness={1} />
        </mesh>
        <CuboidCollider args={[200, 0.1, 200]} position={[0, -0.1, 0]} />
      </RigidBody>

      {/* Halaman depan toko + trotoar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 8]} receiveShadow>
        <planeGeometry args={[52, 12]} />
        <meshStandardMaterial color={SIDEWALK} roughness={0.9} />
      </mesh>

      {/* Jalan utama (timur–barat) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, STREET_Z + 1.5]} receiveShadow>
        <planeGeometry args={[300, 9]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.95} />
      </mesh>
      {thin(Array.from({ length: 40 }, (_, i) => i), 3).map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-120 + i * 6, 0.04, STREET_Z + 1.5]}>
          <planeGeometry args={[2.4, 0.22]} />
          <meshStandardMaterial color="#e8dcb5" />
        </mesh>
      ))}

      {/* Gang perumahan (utara–selatan) di sisi barat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-30, 0.03, 0]} receiveShadow>
        <planeGeometry args={[7, 80]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.95} />
      </mesh>
      {thin(Array.from({ length: 16 }, (_, i) => i), 3).map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-30, 0.04, -38 + i * 5]}>
          <planeGeometry args={[0.22, 2.2]} />
          <meshStandardMaterial color="#e8dcb5" />
        </mesh>
      ))}

      {/* Jalan menuju taman di sisi timur */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[22, 0.03, 4]} receiveShadow>
        <planeGeometry args={[6, 44]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.95} />
      </mesh>

      <PassingVan />
      {!LOW_QUALITY && <PassingVan z={STREET_Z - 1.8} speed={-5} color="#5570b8" offset={40} />}

      {/* Rumah warga menghadap gang barat */}
      {thin([-26, -14, -2, 10, 22]).map((z, i) => (
        <House
          key={`w${z}`}
          position={[-42, 0, z]}
          rotationY={Math.PI / 2}
          wall={["#f0e2c8", "#e6ded0", "#f3d9bb", "#e2e6d8", "#efe0d2"][i % 5]!}
          roof={["#a45a3c", "#8b5a44", "#b4694a", "#7a5344", "#a05840"][i % 5]!}
        />
      ))}
      {thin([-20, -8, 4, 16]).map((z, i) => (
        <House
          key={`e${z}`}
          position={[-19, 0, z]}
          rotationY={-Math.PI / 2}
          wall={["#e8ded0", "#f2e6cf", "#dfe4d5", "#f0dcc6"][i % 4]!}
          roof={["#8b5a44", "#a45a3c", "#7a5344", "#b4694a"][i % 4]!}
        />
      ))}

      <Park />
      <WarehouseYard />

      {/* Mitra nyata Toko Cung: supplier, drop point ekspedisi, pasar warga */}
      {PLACES.map((place, i) => {
        const url = GAME_ASSETS.neighborBuildings[i % GAME_ASSETS.neighborBuildings.length]!;
        const color = PLACE_TONE_COLOR[place.tone];
        return (
          <group key={place.id} position={[place.c[0], 0, place.c[1]]}>
            <RigidBody type="fixed" colliders={false}>
              <Model url={url} height={place.h} rotationY={Math.PI} />
              <CuboidCollider args={[4, 5, 4]} position={[0, 5, 0]} />
            </RigidBody>
            <group position={[0, 3.4, -4.3]}>
              <mesh castShadow>
                <boxGeometry args={[7.6, 1.5, 0.25]} />
                <meshStandardMaterial color={color} roughness={0.6} />
              </mesh>
              <Text position={[0, 0.28, -0.16]} rotation={[0, Math.PI, 0]} fontSize={0.42} color="#fff6e6" anchorX="center" maxWidth={7}>
                {place.name}
              </Text>
              <Text position={[0, -0.34, -0.16]} rotation={[0, Math.PI, 0]} fontSize={0.24} color="#f2e6cf" anchorX="center" maxWidth={7}>
                {place.subtitle}
              </Text>
            </group>
          </group>
        );
      })}

      {/* Skyline latar */}
      {thin(GAME_ASSETS.skyline, 3).map((url, i) => (
        <Model key={url} url={url} height={26 + i * 6} position={[-40 + i * 40, 0, STREET_Z + 60]} />
      ))}

      {/* Warung tetangga & payung di trotoar */}
      <Model url={GAME_ASSETS.parasol} height={2.6} position={[-13, 0.05, 8.5]} />
      <Model url={GAME_ASSETS.parasol} height={2.6} position={[13.5, 0.05, 8.5]} />
      <Model url={GAME_ASSETS.plant} height={1.1} position={[-11.4, 0.05, 4.2]} />
      <Model url={GAME_ASSETS.plant} height={1.1} position={[11.4, 0.05, 4.2]} />

      {/* Pohon di sepanjang trotoar */}
      {thin([-22, -16, 16, 22, 28]).map((x) => (
        <Tree key={x} position={[x, 0, 13.5]} scale={0.85} />
      ))}

      {/* Batas dunia supaya pemain tidak jalan tanpa akhir */}
      {[
        { p: [-56, 1.4, 0] as [number, number, number], s: [0.5, 2.8, 110] as [number, number, number] },
        { p: [56, 1.4, 0] as [number, number, number], s: [0.5, 2.8, 110] as [number, number, number] },
        { p: [0, 1.4, -55] as [number, number, number], s: [112, 2.8, 0.5] as [number, number, number] },
      ].map((w, i) => (
        <RigidBody key={i} type="fixed" position={w.p}>
          <mesh castShadow>
            <boxGeometry args={w.s} />
            <meshStandardMaterial color="#7d7466" roughness={0.9} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}
