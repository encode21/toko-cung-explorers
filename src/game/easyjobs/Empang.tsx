/** @jsxImportSource @/game/jsx */
import { useEffect } from "react";
import { SignLabel } from "@/game/world/SignLabel";
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
export function Empang({ origin }: { origin: [number, number, number] }) {
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
      <mesh position={[E.x, 0.03, E.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[E.rx, E.rz, 1]}>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color="#3f8aa0" roughness={0.2} />
      </mesh>
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
      <SignLabel position={[E.x, 1.6, E.z - E.rz - 0.9]}>EMPANG</SignLabel>
    </group>
  );
}
