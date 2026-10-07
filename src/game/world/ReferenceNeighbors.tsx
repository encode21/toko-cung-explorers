/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { OutdoorBatch, type OutdoorPart } from "./OutdoorBatch";
import type { BuildingLot } from "./outdoor-layout";

import { NEIGHBOR_SKINS } from "./neighbor-skins";
export function ReferenceNeighbor({ lot }: { lot: BuildingLot }) {
  const style = NEIGHBOR_SKINS[lot.id];
  const { width: w, depth: d, height: h } = lot;
  const parts = useMemo(() => {
    const a: OutdoorPart[] = [];
    const box = (p: OutdoorPart["p"], s: OutdoorPart["s"], color: string) =>
      a.push({ p, s, color });
    box([0, h / 2, 0], [w, h, d], style === "glass" ? "#527f91" : "#d6d5c9");
    box([0, h - 0.12, 0], [w + 0.2, 0.24, d + 0.2], "#b8ac88");
    box([0, 0.15, 0], [w + 0.2, 0.3, d + 0.2], "#7e8686");
    // Cream tiled office and blue glazing evoke the Mampang reference at low detail.
    for (let x = -w / 2 + 0.8; x < w / 2; x += 1.5) {
      for (let y = 1.4; y < h - 0.5; y += 1.8)
        box([x, y, d / 2 + 0.035], [0.82, 0.9, 0.05], style === "glass" ? "#a4cbd2" : "#688eaa");
    }
    for (let y = 0.7; y < h; y += 0.65) box([0, y, d / 2 + 0.075], [w, 0.018, 0.02], "#b7bcb9");
    for (let x = -w / 2 + 0.7; x < w / 2; x += 0.7)
      box([x, h / 2, d / 2 + 0.075], [0.018, h, 0.02], "#b7bcb9");
    box([0, 1, d / 2 + 0.09], [1.2, 2, 0.12], "#304851");
    box([0, 2.55, d / 2 + 0.24], [w - 0.3, 0.16, 0.65], style === "shops" ? "#c57c53" : "#425b64");
    box([0, 2.15, d / 2 + 0.13], [w - 1, 0.4, 0.08], "#334850");
    // Frames and sill shadows remain inside the existing detail envelope.
    for (let x = -w / 2 + 0.8; x < w / 2; x += 1.5) {
      for (let y = 1.4; y < h - 0.5; y += 1.8) {
        for (const side of [-1, 1])
          box([x + side * 0.44, y, d / 2 + 0.08], [0.035, 0.96, 0.1], "#9ba9a8");
        box([x, y - 0.48, d / 2 + 0.11], [0.94, 0.07, 0.15], "#9ba9a8");
      }
    }
    box([0, 1, d / 2 + 0.16], [0.035, 1.9, 0.025], "#bdc7c2");
    box([0.36, 1, d / 2 + 0.18], [0.035, 0.3, 0.04], "#d8dcd2");
    box([w / 2 - 0.6, h - 0.22, -d / 2 + 0.65], [0.8, 0.4, 0.9], "#a4b0ad");
    // Small rooftop utility block stays inside the original building height.
    box([-w / 2 + 0.55, h - 0.7, -d / 2 + 0.6], [1, 1.4, 1.1], "#bcbfb7");
    return a;
  }, [w, d, h, style]);
  return (
    <group name={`reference-${lot.id}`} position={[lot.x, 0, lot.z]} rotation-y={lot.rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      </RigidBody>
      <OutdoorBatch items={parts} />
      <Text position={[0, 2.15, d / 2 + 0.19]} fontSize={0.17} color="#f2f0e7">
        {style === "office"
          ? "KANTOR · LAYANAN"
          : style === "glass"
            ? "GEDUNG USAHA"
            : "RUKO · USAHA LOKAL"}
      </Text>
    </group>
  );
}
