/** @jsxImportSource @/game/jsx */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import type { VehicleKind } from "./traffic-math";

export interface ImpactState {
  at: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  vy: number;
  /** truck = terpental; car = jatuh duduk. */
  kind: VehicleKind;
  recovered: boolean;
}
export const emptyImpact = (): ImpactState => ({
  at: -Infinity,
  x: 0,
  z: 0,
  vx: 0,
  vz: 0,
  vy: 0,
  kind: "car",
  recovered: true,
});
export function reactionLean(age: number, kind: VehicleKind = "car") {
  const max = kind === "truck" ? 0.55 : 1.25;
  if (age < 0 || age > max) return 0;
  if (kind === "truck") {
    if (age < 0.12) return age / 0.12;
    if (age < 0.32) return 1;
    const t = (age - 0.32) / 0.23;
    return 1 - t * t * (3 - 2 * t);
  }
  if (age < 0.18) return age / 0.18;
  if (age < 0.65) return 1;
  const t = (age - 0.65) / 0.6;
  return 1 - t * t * (3 - 2 * t);
}
export function ImpactVfx({ hit }: { hit: { current: ImpactState } }) {
  const root = useRef<THREE.Group>(null);
  const stars = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const age = clock.elapsedTime - hit.current.at;
    const window = hit.current.kind === "truck" ? 0.7 : 1.35;
    if (root.current) root.current.visible = age >= 0 && age < window;
    if (stars.current) {
      stars.current.rotation.y = age * 3;
      stars.current.position.y = 0.07 * Math.sin(age * 8);
    }
  });
  return (
    <group ref={root} visible={false} userData={{ ignoreCameraCollision: true }}>
      <Billboard position={[0, 1.4, 0]}>
        <Text fontSize={0.22} color="#ffdf80" outlineWidth={0.014} outlineColor="#624839">
          Waduh!
        </Text>
      </Billboard>
      <group ref={stars}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[Math.cos(i * Math.PI * 0.4) * 0.42, 1.1, Math.sin(i * Math.PI * 0.4) * 0.42]}
          >
            <octahedronGeometry args={[0.085, 0]} />
            <meshBasicMaterial color="#f7d478" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
