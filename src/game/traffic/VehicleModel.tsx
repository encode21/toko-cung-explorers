/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { useMemo } from "react";
import { OutdoorBatch, type OutdoorPart } from "../world/OutdoorBatch";

/**
 * Kendaraan blocky: panjang sepanjang +Z (depan = +Z).
 * TrafficSystem memutar yaw = atan2(dx, dz) agar lurus di jalur.
 */
export function VehicleModel({
  color = "#b86552",
  van = false,
}: {
  color?: string;
  van?: boolean;
}) {
  const parts = useMemo<OutdoorPart[]>(
    () => [
      { p: [0, 0.63, 0], s: [1.8, 0.6, 4.1], color },
      {
        p: [0, 1.18, van ? -0.35 : -0.15],
        s: [1.65, 0.7, van ? 2.4 : 2.0],
        color: van ? "#e6ddc9" : color,
      },
      ...(van
        ? ([{ p: [0, 1.15, 1.15], s: [1.7, 0.85, 1.35], color }] as OutdoorPart[])
        : []),
      { p: [0, 1.2, van ? 1.85 : 0.95], s: [1.47, 0.48, 0.05], color: "#a4c8cf" },
      { p: [0, 1.19, van ? -1.45 : -1.2], s: [1.47, 0.48, 0.05], color: "#a4c8cf" },
      ...[-1, 1].flatMap((side): OutdoorPart[] => [
        { p: [side * 0.84, 1.18, 0.35], s: [0.025, 0.44, 1.05], color: "#a4c8cf" },
        { p: [side * 0.61, 0.68, 2.06], s: [0.35, 0.15, 0.035], color: "#fff0bd" },
        { p: [side * 0.61, 0.7, -2.06], s: [0.32, 0.13, 0.035], color: "#c04a3c" },
      ]),
      { p: [0, 0.38, 2.05], s: [1.7, 0.12, 0.12], color: "#4c5a5b" },
    ],
    [color, van],
  );
  return (
    <group>
      <OutdoorBatch items={parts} />
      {van && (
        <Text
          position={[0.92, 1.35, -0.2]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.28}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          TOKO CUNG
        </Text>
      )}
      {[-1, 1].flatMap((side) =>
        [-1.3, 1.3].map((z) => (
          <mesh
            key={`${side}-${z}`}
            position={[side * 0.91, 0.34, z]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.32, 0.32, 0.18, 12]} />
            <meshStandardMaterial color="#354046" roughness={0.9} />
          </mesh>
        )),
      )}
    </group>
  );
}
