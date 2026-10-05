/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { useMemo } from "react";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import type { BuildingLot as Lot } from "./outdoor-layout";

/** All protrusions fit the validated 1 m envelope. Collision uses the same dimensions. */
export function BuildingLot({ lot, label = lot.label }: { lot: Lot; label?: string }) {
  const { width: w, depth: d, height: h } = lot;
  const parts = useMemo(() => {
    const out: OutdoorPart[] = [];
    const box = (p: OutdoorPart["p"], s: OutdoorPart["s"], color: string) =>
      out.push({ p, s, color });
    box([0, h / 2, 0], [w, h, d], lot.color);
    box([0, 0.13, 0], [w + 0.3, 0.26, d + 0.3], "#b1ac9b");
    box([0, 0.045, d / 2 + 0.5], [w, 0.08, 0.9], "#d5c9b3");
    box([0, 1.1, d / 2 + 0.025], [1.1, 2.2, 0.04], "#465c5c");
    for (const side of [-1, 1]) {
      box([side * w * 0.29, 1.65, d / 2 + 0.04], [1.65, 1.3, 0.08], "#b2d0d1");
      box([side * w * 0.29, 1.65, d / 2 + 0.09], [0.055, 1.32, 0.04], "#f5ead7");
      box([side * (w / 2 - 0.12), h / 2, d / 2 + 0.07], [0.16, h, 0.16], "#f0e7d6");
    }
    if (h > 4) {
      for (const side of [-1, 1])
        box([side * 1.85, 4.1, d / 2 + 0.03], [1.5, 1.3, 0.08], "#9dbdc4");
      box([0, 3.4, d / 2 + 0.35], [w - 0.6, 0.16, 0.65], "#f0e3cd");
      box([0, 3.85, d / 2 + 0.68], [w - 0.6, 0.08, 0.05], "#506666");
      for (let x = -w / 2 + 0.5; x < w / 2; x += 0.65)
        box([x, 3.62, d / 2 + 0.68], [0.035, 0.5, 0.035], "#506666");
    }
    box([w / 2 - 0.65, 2.35, d / 2 + 0.17], [0.7, 0.38, 0.28], "#f1ebdd");
    if (lot.kind !== "house") {
      box([0, 2.8, d / 2 + 0.3], [w - 0.5, 0.12, 0.8], lot.kind === "cafe" ? "#ae6853" : "#51736c");
      box([0, 2.45, d / 2 + 0.13], [w - 1.8, 0.45, 0.15], "#354e52");
      box([0, h + 0.14, 0], [w + 0.4, 0.28, d + 0.4], "#8b8f80");
    }
    return out;
  }, [lot, w, d, h]);
  return (
    <group name={lot.id} position={[lot.x, 0, lot.z]} rotation-y={lot.rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      </RigidBody>
      <OutdoorBatch items={parts} />
      {lot.kind === "house" && (
        <mesh
          position={[0, h + 0.48, 0]}
          rotation-y={Math.PI / 4}
          scale={[w * 0.76, 1, d * 0.76]}
          castShadow
        >
          <coneGeometry args={[1, 1.2, 4]} />
          <meshStandardMaterial color="#a16c56" roughness={0.95} />
        </mesh>
      )}
      {lot.kind !== "house" && (
        <Text position={[0, 2.46, d / 2 + 0.215]} fontSize={0.22} maxWidth={w - 2} color="#fff3db">
          {label}
        </Text>
      )}
    </group>
  );
}
