/** @jsxImportSource @/game/jsx */
import { StyledBatch } from "@/game/assets/StyledBatch";
import type { AssetPart } from "@/game/assets/parts";
import type { Vec3 } from "@/game/world/layout";

const box = (p: Vec3, s: Vec3, color: string): AssetPart => ({ p, s, color, shape: "box" });

const wall = "#b5c3ba";
const trim = "#394c50";
const marker = "#ddc392";

const workshop = [
  box([0, -0.18, 0], [54, 0.34, 54], "#6a7b76"),
  box([0, 2.8, -6.4], [15, 5.6, 0.22], wall),
  box([-7.4, 2.8, -2.4], [0.22, 5.6, 8.1], wall),
  box([0, 0.26, -6.26], [15, 0.52, 0.08], trim),
  box([-7.26, 0.26, -2.4], [0.08, 0.52, 8.1], trim),
  box([0, 4.55, -6.2], [15, 0.16, 0.12], trim),
  box([-7.22, 4.55, -2.4], [0.12, 0.16, 8.1], trim),
  // The shutter and workbench read as a garage even when the bay is empty.
  box([-1.55, 1.83, -6.22], [6.18, 3.66, 0.16], trim),
  box([-1.55, 1.83, -6.11], [5.86, 3.44, 0.07], "#7f9794"),
  ...Array.from({ length: 13 }, (_, i) =>
    box([-1.55, 0.32 + i * 0.25, -6.06], [5.85, 0.026, 0.04], "#58736f"),
  ),
  box([-1.55, 0.12, -6.06], [5.88, 0.1, 0.055], trim),
  box([-1.55, 0.32, -6.01], [0.45, 0.055, 0.055], trim),
  box([3.9, 1.95, -6.22], [3.58, 1.43, 0.1], "#6e9697"),
  ...[-1, 0, 1].map((index) =>
    box([3.9 + index * 1.17, 1.95, -6.12], [1.07, 1.29, 0.08], "#94b6b4"),
  ),
  box([3.78, 0.49, -5.78], [3.1, 0.94, 0.75], "#536763"),
  box([3.78, 0.99, -5.76], [3.25, 0.14, 0.83], "#b29165"),
  ...[-1, 0, 1].map((index) =>
    box([3.78 + index * 1.01, 0.67, -5.39], [0.34, 0.044, 0.06], "#a5ae9f"),
  ),
  box([4.49, 1.18, -5.68], [0.54, 0.24, 0.38], "#ac6048"),
  box([4.49, 1.33, -5.68], [0.24, 0.062, 0.07], trim),
  box([-5.8, 0.46, -5.79], [0.92, 0.9, 0.63], "#a4684d"),
  ...[0.28, 0.53, 0.77].map((y) => box([-5.8, y, -5.455], [0.52, 0.045, 0.06], "#d1a984")),
  ...[-2.1, 2.1].map((x) => box([x, 0.001, 0], [0.072, 0.014, 8.3], marker)),
  box([0, 0.001, -4.12], [4.26, 0.014, 0.072], marker),
  ...[-8.4, -4.2, 0, 4.2, 8.4].flatMap((offset) => [
    box([offset, -0.008, 0], [0.022, 0.008, 28], "#435c5f"),
    box([0, -0.008, offset], [28, 0.008, 0.022], "#435c5f"),
  ]),
];

const lightBars = [
  box([-1.55, 3.94, -6.13], [6.18, 0.18, 0.29], trim),
  box([3.9, 2.83, -6.13], [3.58, 0.12, 0.2], trim),
];

const shadowVertex = `
  varying vec2 shadowUv;
  void main() {
    shadowUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const shadowFragment = `
  varying vec2 shadowUv;
  void main() {
    float radius = length((shadowUv - 0.5) * 2.0);
    float alpha = (1.0 - smoothstep(0.28, 1.0, radius)) * 0.60;
    gl_FragColor = vec4(0.09, 0.13, 0.14, alpha);
  }
`;

export function GarageVehicleStage({
  orbitYaw,
  footprint,
}: {
  orbitYaw: number;
  footprint: [width: number, length: number] | null;
}) {
  return (
    <>
      <color attach="background" args={["#a8bbb5"]} />
      {/* Keep the open side of the preview bay facing the viewer throughout a full orbit. */}
      <group rotation={[0, orbitYaw, 0]}>
        <StyledBatch items={workshop} />
        <StyledBatch items={lightBars} />
        {lightBars.map(({ p, s }) => (
          <mesh key={p[0]} position={[p[0], p[1], p[2] + s[2] / 2]}>
            <boxGeometry args={[s[0] - 0.1, s[1] * 0.42, 0.024]} />
            <meshBasicMaterial color="#fff0c9" toneMapped={false} />
          </mesh>
        ))}
      </group>
      {footprint && (
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[footprint[0] * 1.55, footprint[1] * 1.45]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            vertexShader={shadowVertex}
            fragmentShader={shadowFragment}
          />
        </mesh>
      )}
    </>
  );
}
