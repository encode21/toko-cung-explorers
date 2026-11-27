/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MountainNatureBatch } from "@/game/mountain/MountainNatureBatch";
import { sceneLighting } from "@/game/time/lighting";
import { grassGeometry } from "@/game/world/natural-grass-geometry";
import { naturalPineGeometry } from "@/game/world/natural-tree-geometry";
import type { OutdoorPart } from "@/game/world/OutdoorBatch";
import { naturalTreeParts } from "@/game/world/vegetation";

const TREE_SITES = [
  [-4.7, -8.5, 0.51],
  [-9.2, -10, 0.68],
  [-2.2, -11.4, 0.79],
  [-7.1, -13.7, 1.0],
  [1.5, -14, 0.86],
  [-12.8, -15.4, 1.08],
  [5.2, -16.6, 0.8],
  [-17.3, -16, 0.9],
  [-4.4, -19.4, 0.77],
  [-11.1, -22, 1.1],
  [-20.5, -22.5, 0.93],
  [3, -24.7, 1.14],
  [-0.3, -29, 0.88],
  [-14.4, -30, 0.94],
  [-6.2, -31.2, 0.93],
  [7.6, -23.3, 1.06],
  [-11.8, 1.8, 0.7],
  [10.1, 1.6, 0.88],
  [8.1, 10.1, 0.65],
  [-6.7, 12.6, 0.75],
] as const;

const RIDGES = [
  { x: -25, z: -29, width: 16, depth: 8, height: 8.4 },
  { x: -10, z: -37, width: 11, depth: 10, height: 12.5 },
  { x: 8, z: -35, width: 12, depth: 9, height: 9.8 },
  { x: 20, z: -44, width: 13, depth: 8, height: 12.8 },
  { x: -26, z: -49, width: 15, depth: 8, height: 14.2 },
];

function groundHeight(x: number, z: number) {
  // Reserve a level site around the room and its existing exit threshold.
  const distance = Math.max(Math.abs(x) - 6.6, Math.abs(z) - 6.8);
  const rise = THREE.MathUtils.smoothstep(distance, 0, 8);
  const rolling = 0.8 + Math.sin(x * 0.41 + z * 0.25) * 0.51 + Math.cos(z * 0.48) * 0.37;
  let height = -0.36 + rise * rolling;
  for (const ridge of RIDGES) {
    const side = (x - ridge.x) / ridge.width;
    const depth = (z - ridge.z) / ridge.depth;
    height += Math.exp(-(side * side + depth * depth) * 1.8) * ridge.height * rise;
  }
  return height;
}

function makeTerrain() {
  const terrain = new THREE.PlaneGeometry(94, 85, 70, 66);
  terrain.rotateX(-Math.PI / 2);
  terrain.translate(0, 0, -20);
  const vertices = terrain.getAttribute("position");
  const tint = new THREE.Color();
  const meadow = new THREE.Color("#789050");
  const olive = new THREE.Color("#a6ad69");
  const ridge = new THREE.Color("#698781");
  const summit = new THREE.Color("#a2b3ab");
  const colors: number[] = [];
  for (let i = 0; i < vertices.count; i += 1) {
    const x = vertices.getX(i);
    const z = vertices.getZ(i);
    const y = groundHeight(x, z);
    vertices.setY(i, y);
    const patch = 0.42 + Math.sin(x * 0.71 + z * 0.48) * 0.17 + Math.cos(z * 0.84) * 0.08;
    tint.copy(meadow).lerp(olive, patch);
    tint.lerp(ridge, THREE.MathUtils.smoothstep(-z, 17, 39));
    tint.lerp(summit, THREE.MathUtils.smoothstep(y, 6, 14) * 0.78);
    colors.push(tint.r, tint.g, tint.b);
  }
  terrain.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  return terrain;
}

function makeGrass() {
  const grass: OutdoorPart[] = [];
  const tones = ["#91a860", "#a1b66b", "#829b54", "#aec279"];
  for (let column = 0; column < 19; column += 1) {
    for (let row = 0; row < 12; row += 1) {
      const seed = column * 37 + row * 19;
      if (seed % 7 < 2) continue;
      const x = -19 + column * 1.42 + Math.sin(seed * 0.9) * 0.52;
      const z = -6.4 - row * 1.21 + Math.cos(seed * 0.63) * 0.44;
      const size = 0.59 + ((seed * 7) % 29) / 42;
      grass.push({
        p: [x, groundHeight(x, z) - 0.11, z],
        s: [size, size * 0.76, size],
        ry: seed * 0.61,
        color: tones[seed % tones.length]!,
      });
    }
  }
  return grass;
}

function HomeSky() {
  const scene = useThree((state) => state.scene);
  const local = useMemo(
    () => ({ sky: new THREE.Color("#b7d8ee"), mist: new THREE.Fog("#b7d8ee", 16, 74) }),
    [],
  );
  useEffect(() => {
    const { background, fog } = scene;
    scene.background = local.sky;
    scene.fog = local.mist;
    return () => {
      scene.background = background;
      scene.fog = fog;
    };
  }, [local, scene]);
  useFrame(() => {
    local.sky.copy(sceneLighting.horizon);
    local.mist.color.copy(local.sky);
  });
  return null;
}

/** Real terrain and foliage outside the room, visible through the window aperture. */
export function HomeMountainYard() {
  const geometry = useMemo(
    () => ({
      terrain: makeTerrain(),
      grass: grassGeometry(),
      pine: naturalPineGeometry(),
      bark: new THREE.CylinderGeometry(0.32, 0.5, 1, 7),
      rock: new THREE.DodecahedronGeometry(0.5, 0),
    }),
    [],
  );
  useEffect(() => () => Object.values(geometry).forEach((shape) => shape.dispose()), [geometry]);
  const yard = useMemo(() => {
    const trees = TREE_SITES.map(([x, z, scale], index) =>
      naturalTreeParts({ x, z, scale, y: groundHeight(x, z) - 0.11, seed: index * 5 + 4 }),
    );
    const rocks: OutdoorPart[] = [
      [-5.2, -8.2],
      [-10.1, -12.7],
      [-1, -9.8],
      [-8.4, -15.9],
    ].map(([x, z], index) => ({
      p: [x!, groundHeight(x!, z!) + 0.13, z!],
      s: [0.92 - 0.08 * index, 0.48 + 0.08 * index, 0.7],
      ry: index * 1.73,
      color: "#9caa9d",
    }));
    return {
      trunks: trees.flatMap((tree) => [...tree.trunks, ...tree.branches]),
      pine: trees.map((tree) => tree.canopy),
      grass: makeGrass(),
      rocks,
    };
  }, []);
  return (
    <group name="HomeMountainYard">
      <HomeSky />
      <mesh name="HomeYardTerrain" geometry={geometry.terrain} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <MountainNatureBatch name="HomeYardPineTrunks" items={yard.trunks} geometry={geometry.bark} />
      <MountainNatureBatch name="HomeYardPines" items={yard.pine} geometry={geometry.pine} wind />
      <MountainNatureBatch name="HomeYardGrass" items={yard.grass} geometry={geometry.grass} wind />
      <MountainNatureBatch name="HomeYardRocks" items={yard.rocks} geometry={geometry.rock} />
    </group>
  );
}
