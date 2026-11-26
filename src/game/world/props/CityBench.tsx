/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { ExtrudeGeometry, MeshStandardMaterial, Shape } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import type { Vec3 } from "../layout";

// The profile is drawn in (-Z, Y), then extruded across the bench's width.
const sideProfile = new Shape();
sideProfile.moveTo(-0.48, 0.02);
sideProfile.lineTo(-0.53, 0.26);
sideProfile.quadraticCurveTo(-0.55, 0.42, -0.39, 0.53);
sideProfile.quadraticCurveTo(-0.28, 0.59, -0.04, 0.48);
sideProfile.quadraticCurveTo(0.18, 0.4, 0.29, 0.62);
sideProfile.quadraticCurveTo(0.35, 0.77, 0.38, 1.05);
sideProfile.quadraticCurveTo(0.39, 1.18, 0.5, 1.27);
sideProfile.lineTo(0.59, 1.18);
sideProfile.quadraticCurveTo(0.47, 1.05, 0.45, 0.86);
sideProfile.quadraticCurveTo(0.42, 0.51, 0.26, 0.38);
sideProfile.quadraticCurveTo(0.11, 0.25, -0.1, 0.34);
sideProfile.quadraticCurveTo(-0.33, 0.4, -0.38, 0.31);
sideProfile.lineTo(-0.4, 0.02);
sideProfile.closePath();
const sideGeometry = new ExtrudeGeometry(sideProfile, {
  depth: 0.08,
  steps: 1,
  curveSegments: 6,
  bevelEnabled: true,
  bevelSegments: 1,
  bevelSize: 0.01,
  bevelThickness: 0.01,
});
sideGeometry.translate(0, 0, -0.04);
sideGeometry.rotateY(Math.PI / 2);
const frameMaterial = new MeshStandardMaterial({
  color: "#9ba2a8",
  metalness: 0.3,
  roughness: 0.6,
});

const woodColors = ["#b59069", "#bd9a73", "#b18b65"];
const slats = [
  { z: 0.27, y: 0.475, rx: 0 },
  { z: 0.13, y: 0.475, rx: 0 },
  { z: -0.01, y: 0.475, rx: 0 },
  { z: -0.15, y: 0.485, rx: 0.14 },
  { z: -0.27, y: 0.56, rx: 0.9 },
  { z: -0.335, y: 0.705, rx: 1.34 },
  { z: -0.365, y: 0.85, rx: 1.39 },
  { z: -0.395, y: 0.995, rx: 1.36 },
  { z: -0.435, y: 1.14, rx: 1.3 },
];
const parts: AssetPart[] = [
  ...slats.map(({ y, z, rx }, index): AssetPart => ({
    p: [0, y, z],
    s: [1.96, 0.07, 0.12],
    rx,
    color: woodColors[index % woodColors.length]!,
    finish: "wood",
  })),
  ...[-0.99, 0.99].map((x): AssetPart => ({
    p: [x, 0.245, -0.34],
    s: [0.1, 0.49, 0.12],
    rx: -0.12,
    color: "#9ba2a8",
    finish: "metal",
  })),
  { p: [0, 0.28, 0.16], s: [1.94, 0.06, 0.08], color: "#838d94", finish: "metal" },
];

/** Two-place slatted city bench, facing local +Z. Wood contact height is 0.51 m. */
export function CityBench({ position, yaw }: { position: Vec3; yaw: number }) {
  return (
    <group name="CityBench" position={position} rotation-y={yaw}>
      <StyledBatch items={parts} />
      {[-0.99, 0.99].map((x) => (
        <mesh
          key={x}
          geometry={sideGeometry}
          material={frameMaterial}
          position={[x, 0, 0]}
          castShadow
          receiveShadow
          dispose={null}
        />
      ))}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.98, 0.055, 0.34]} position={[0, 0.455, 0.05]} />
        <CuboidCollider
          args={[0.98, 0.38, 0.055]}
          position={[0, 0.86, -0.36]}
          rotation={[-0.2, 0, 0]}
        />
        {[-0.99, 0.99].map((x) => (
          <group key={x}>
            <CuboidCollider args={[0.05, 0.26, 0.085]} position={[x, 0.26, 0.46]} />
            <CuboidCollider args={[0.05, 0.245, 0.07]} position={[x, 0.245, -0.34]} />
          </group>
        ))}
      </RigidBody>
    </group>
  );
}
