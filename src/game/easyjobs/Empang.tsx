/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { WaterMaterial } from "@/game/swimming/WaterMaterial";
import { Plang } from "@/game/world/Plang";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { setFishingExtraSpot } from "@/game/fishing/model";
import { EMPANG_LOCAL as E, EMPANG_STAND } from "./model";

/** Posts every ~1.5 m on the east, north and south sides; the west bank stays open for the angler. */
const FENCE: { p: [number, number, number]; s: [number, number, number] }[] = [
  { p: [E.x + E.rx + 0.8, 0.45, E.z], s: [0.1, 0.9, (E.rz + 0.8) * 2] },
  { p: [E.x, 0.45, E.z - E.rz - 0.8], s: [E.rx + 0.8, 0.9, 0.1] },
  { p: [E.x, 0.45, E.z + E.rz + 0.8], s: [E.rx + 0.8, 0.9, 0.1] },
];

/** Scene-local (inside the gang origin group). Water sits above the flood plane's rest height. */
const POND_COLORS: [string, string] = ["#7fa36a", "#2f5a48"];
/** [x, z] as a fraction of the radii, pad radius, has a flower. */
const LILIES: [number, number, number, boolean][] = [
  [0.35, 0.4, 0.28, true],
  [0.55, -0.2, 0.22, false],
  [0.1, -0.55, 0.3, false],
  [-0.15, 0.6, 0.2, true],
  [0.68, 0.35, 0.18, false],
  [0.2, 0.05, 0.16, false],
];
const REEDS: [number, number][] = [
  [E.rx + 0.4, -1.4],
  [E.rx + 0.3, 1.1],
  [1.6, -E.rz - 0.3],
  [-1.2, E.rz + 0.35],
  [2.8, E.rz + 0.2],
];
export function Empang({ origin }: { origin: [number, number, number] }) {
  const body = useMemo(
    () => ({
      kind: "pond" as const,
      x: origin[0] + E.x,
      z: origin[2] + E.z,
      rx: E.rx,
      rz: E.rz,
      surface: 0.06,
      depth: 1.4,
      bounds: {
        minX: origin[0] + E.x - E.rx,
        maxX: origin[0] + E.x + E.rx,
        minZ: origin[2] + E.z - E.rz,
        maxZ: origin[2] + E.z + E.rz,
      },
    }),
    [origin],
  );
  useEffect(() => {
    setFishingExtraSpot([
      origin[0] + EMPANG_STAND[0],
      origin[1] + EMPANG_STAND[1],
      origin[2] + EMPANG_STAND[2],
    ]);
    return () => setFishingExtraSpot(null);
  }, [origin]);
  return (
    <group>
      {/* Tepian lumpur, lalu air empang (shader air yang sama dengan pantai/danau, warna kehijauan). */}
      <mesh
        position={[E.x, 0.02, E.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[E.rx + 0.7, E.rz + 0.7, 1]}
      >
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#6b5a3e" roughness={1} />
      </mesh>
      <mesh position={[E.x, 0.06, E.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[E.rx, E.rz, 1]}>
        <circleGeometry args={[1, 48]} />
        <WaterMaterial body={body} colors={POND_COLORS} />
      </mesh>
      {LILIES.map(([x, z, r, flower], i) => (
        <group key={i} position={[E.x + x * E.rx, 0.075, E.z + z * E.rz]} rotation-y={i * 1.7}>
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[r, 16, 0.35, Math.PI * 1.8]} />
            <meshStandardMaterial color={i % 2 ? "#4f8a3a" : "#5f9a44"} side={2} />
          </mesh>
          {flower && (
            <mesh position={[0.05, 0.06, 0]}>
              <coneGeometry args={[0.08, 0.12, 6]} />
              <meshStandardMaterial color="#f2a6c4" />
            </mesh>
          )}
        </group>
      ))}
      {/* Rumpun ilalang / eceng di tepi timur & utara. */}
      {REEDS.map(([x, z], i) => (
        <group key={`r${i}`} position={[E.x + x, 0, E.z + z]}>
          {[0, 1, 2, 3].map((k) => (
            <group
              key={k}
              position={[Math.sin(k * 2.1 + i) * 0.18, 0, Math.cos(k * 1.7 + i) * 0.18]}
            >
              <mesh position={[0, 0.55 + (k % 2) * 0.12, 0]}>
                <cylinderGeometry args={[0.015, 0.02, 1.1 + (k % 2) * 0.24, 4]} />
                <meshStandardMaterial color="#7d9a4a" />
              </mesh>
              {k % 2 === 0 && (
                <mesh position={[0, 1.12, 0]}>
                  <capsuleGeometry args={[0.035, 0.16, 2, 6]} />
                  <meshStandardMaterial color="#6b4a2e" />
                </mesh>
              )}
            </group>
          ))}
        </group>
      ))}
      {/* Dermaga bambu kecil di tepi barat tempat memancing. */}
      {[-0.45, -0.15, 0.15, 0.45].map((dz) => (
        <mesh key={dz} position={[E.x - E.rx + 0.1, 0.14, E.z + dz]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.07, 0.07, 1.6, 8]} />
          <meshStandardMaterial color="#c9a45c" />
        </mesh>
      ))}
      {FENCE.map((f, i) => (
        <mesh key={i} position={f.p} castShadow>
          <boxGeometry args={f.s} />
          <meshStandardMaterial color="#8a6a43" />
        </mesh>
      ))}
      {FENCE.map((f, i) => (
        <RigidBody key={i} type="fixed" colliders={false}>
          <CuboidCollider args={[f.s[0] / 2, 0.5, f.s[2] / 2]} position={f.p} />
        </RigidBody>
      ))}
      <mesh position={[EMPANG_STAND[0] + 0.4, 0.06, EMPANG_STAND[2]]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.7, 0.9, 24]} />
        <meshBasicMaterial color="#ffe1a3" />
      </mesh>
      <Plang
        mode="post"
        text="EMPANG"
        position={[E.x, 0, E.z - E.rz - 0.9]}
        board="#2f5f78"
        twoSided
      />
    </group>
  );
}
