/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useMemo } from "react";
import {
  AdditiveBlending,
  CylinderGeometry,
  MeshBasicMaterial,
  Object3D,
  ShaderMaterial,
} from "three";
import { useOwnedInstancedMesh } from "@/game/engine/use-owned-instanced-mesh";
import { OutdoorBatch } from "@/game/world/OutdoorBatch";
import type { Vec3 } from "@/game/world/layout";

type Platform = { x: number; z: number; width: number; depth: number };
type Lamp = { x: number; z: number; pitch: number; roll: number };
const edgeInset = 0.23;
const lensHeight = 0.045;
const lensMaterial = new MeshBasicMaterial({ toneMapped: false });

const shaftVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vToCamera;

  void main() {
    vec4 viewPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vUv = uv;
    vNormal = normalMatrix * mat3(instanceMatrix) * normal;
    vToCamera = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const shaftFragment = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vToCamera;

  void main() {
    float facing = max(dot(normalize(vNormal), normalize(vToCamera)), 0.0);
    float center = pow(facing, 1.8);
    float height = 1.0 - smoothstep(0.02, 1.0, vUv.y);
    float strength = center * height * (0.44 + 0.24 * facing);
    gl_FragColor = vec4(1.0, 0.95, 0.85, strength);
    #include <colorspace_fragment>
  }
`;

// Leave the thin end flush with each lens while the shaft leans inward.
const shaftGeometry = new CylinderGeometry(0.26, 0.051, 1.25, 12, 1, true).translate(0, 0.625, 0);
const shaftMaterial = new ShaderMaterial({
  vertexShader: shaftVertex,
  fragmentShader: shaftFragment,
  transparent: true,
  blending: AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
});

function lampsOn({ x, z, width, depth }: Platform): Lamp[] {
  const alongWidth = Math.ceil(width / 1.7);
  const alongDepth = Math.ceil(depth / 1.8) - 1;
  return [-1, 1].flatMap((side) => [
    ...Array.from({ length: alongWidth }, (_, index) => ({
      x: x + ((index + 0.5) / alongWidth - 0.5) * width,
      z: z + side * (depth / 2 - edgeInset),
      pitch: -side * 0.13,
      roll: 0,
    })),
    ...Array.from({ length: alongDepth }, (_, index) => ({
      x: x + side * (width / 2 - edgeInset),
      z: z + ((index + 1) / (alongDepth + 1) - 0.5) * depth,
      pitch: 0,
      roll: side * 0.13,
    })),
  ]);
}

export function ShowroomStandLights({
  platforms,
  surface,
}: {
  platforms: readonly Platform[];
  surface: number;
}) {
  const lamps = useMemo(() => platforms.flatMap(lampsOn), [platforms]);
  const [shafts, attachShafts] = useOwnedInstancedMesh();
  const housings = useMemo(
    () =>
      lamps.map(({ x, z }) => ({
        p: [x, surface + 0.012, z] as Vec3,
        s: [0.18, 0.045, 0.18] as Vec3,
        color: "#242b34",
      })),
    [lamps, surface],
  );
  const lenses = useMemo(
    () =>
      lamps.map(({ x, z }) => ({
        p: [x, surface + lensHeight - 0.007, z] as Vec3,
        s: [0.117, 0.015, 0.117] as Vec3,
        color: "#fff4e8",
      })),
    [lamps, surface],
  );

  useLayoutEffect(() => {
    const mesh = shafts.current;
    if (!mesh) return;
    const transform = new Object3D();
    lamps.forEach(({ x, z, pitch, roll }, index) => {
      transform.position.set(x, surface + lensHeight, z);
      transform.rotation.set(pitch, 0, roll);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [lamps, shafts, surface]);

  return (
    <group name="ShowroomStandLights">
      <OutdoorBatch items={housings} shape="round" shadows={false} />
      <OutdoorBatch items={lenses} shape="round" shadows={false} material={lensMaterial} />
      <instancedMesh
        ref={attachShafts}
        args={[shaftGeometry, shaftMaterial, lamps.length]}
        dispose={null}
      />
    </group>
  );
}
