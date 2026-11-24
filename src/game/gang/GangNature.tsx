/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import * as T from "three";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { MountainNatureBatch } from "@/game/mountain/MountainNatureBatch";
import { LOW_QUALITY } from "@/game/engine/quality";
import { grassGeometry } from "@/game/world/natural-grass-geometry";
import { naturalGroundMaterial } from "@/game/world/natural-ground";
import type { OutdoorPart } from "@/game/world/OutdoorBatch";
import { WaterMaterial } from "@/game/swimming/WaterMaterial";
import { WATER_BODIES, setGangCoast } from "@/game/swimming/model";
import { WaterEffects } from "@/game/swimming/WaterEffects";
import { housePose, type GangData } from "./model";
import {
  LAND_HALF,
  PLAY_HALF,
  LAND_START,
  GANG_SEA_Y,
  GANG_SHORE,
  gangBeachTerrain,
  gangGrassBlend,
} from "./beach";

export function GangBeach({ end }: { end: number }) {
  const terrain = useMemo(() => gangBeachTerrain(end), [end]);
  const geometry = useMemo(() => {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(terrain.vertices, 3));
    g.setIndex(new T.BufferAttribute(terrain.indices, 1));
    const colors: number[] = [];
    const dry = new T.Color("#efdaad"),
      wet = new T.Color("#c6ba8d"),
      deep = new T.Color("#8da994"),
      color = new T.Color();
    for (let i = 1; i < terrain.vertices.length; i += 3) {
      const y = terrain.vertices[i]!;
      color.copy(dry).lerp(wet, 1 - T.MathUtils.smoothstep(y - GANG_SEA_Y, -0.15, 0.45));
      if (y < GANG_SEA_Y) color.lerp(deep, Math.min(1, (GANG_SEA_Y - y) / 1.5));
      colors.push(color.r, color.g, color.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.setAttribute("grassCoverage", new T.Float32BufferAttribute(terrain.coverage, 1));
    g.computeVertexNormals();
    return g;
  }, [terrain]);
  const material = useMemo(() => naturalGroundMaterial(true), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group name="GangBeach">
      <mesh geometry={geometry} material={material} receiveShadow />
      <RigidBody type="fixed" colliders={false}>
        <TrimeshCollider args={[terrain.vertices, terrain.indices]} friction={0.5} />
      </RigidBody>
    </group>
  );
}

/** Ocean in world space (the water shader colours depth from world XZ). */
export function GangSea({ data, end }: { data: GangData; end: number }) {
  const [ox, , oz] = data.layout.origin;
  useEffect(() => {
    setGangCoast({ origin: data.layout.origin, end });
    return () => setGangCoast(null);
  }, [data.layout.origin, end]);
  const shore = useMemo<[number, number, number, number]>(
    () => [
      ox - LAND_HALF - GANG_SHORE,
      ox + LAND_HALF + GANG_SHORE,
      oz + LAND_START - GANG_SHORE,
      oz + end + GANG_SHORE,
    ],
    [ox, oz, end],
  );
  return (
    <>
      <WaterEffects />
      <mesh
        name="GangSea"
        position={[ox, GANG_SEA_Y, oz + (LAND_START + end) / 2]}
        rotation-x={-Math.PI / 2}
      >
        <planeGeometry args={[900, 900]} />
        <WaterMaterial body={WATER_BODIES[0]!} shore={shore} />
      </mesh>
    </>
  );
}

/** Seeded meadow tufts like the city's; road, walks, front paths, houses and gates stay clear. */
function makeGangGrass(data: GangData, end: number) {
  let seed = 61237 + data.gang;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const houses = data.houses.map((h) => housePose(h.number, data.layout));
  const blocked = (x: number, z: number) =>
    Math.abs(x) < 6 ||
    (Math.abs(x) < 9 && (z < LAND_START + 9 || z > end - 9)) ||
    houses.some(
      (p) =>
        Math.sign(p.x) === Math.sign(x) &&
        Math.abs(z - p.z) < (Math.abs(x) < 11 ? 2.6 : 8) &&
        Math.abs(x) < Math.abs(p.x) + 8,
    );
  const [ox, , oz] = data.layout.origin;
  const items: OutdoorPart[] = [];
  const step = LOW_QUALITY ? 2.1 : 1.4;
  for (let z = LAND_START + 0.5; z < end; z += step)
    for (let x = -PLAY_HALF + 0.5; x < PLAY_HALF; x += step) {
      const px = x + (random() - 0.5) * step,
        pz = z + (random() - 0.5) * step;
      if (Math.abs(px) > PLAY_HALF - 0.6 || blocked(px, pz)) continue;
      if (random() > gangGrassBlend(px, pz, end)) continue;
      const patch =
        (Math.sin(px * 0.32 + pz * 0.15) + Math.cos(pz * 0.43 - px * 0.18)) * 0.25 + 0.5;
      if (random() > 0.42 + patch * 0.5) continue;
      const size = 0.5 + random() * 0.42;
      items.push({
        p: [ox + px, -0.03, oz + pz],
        s: [size, 0.18 + random() * 0.28, size],
        ry: random() * Math.PI * 2,
        color: ["#9cb969", "#73954c", "#8daa53", "#b3c87d", "#b4ab72"][items.length % 5]!,
      });
    }
  return items;
}

export function GangGrass({ data, end }: { data: GangData; end: number }) {
  const items = useMemo(() => makeGangGrass(data, end), [data, end]);
  const geometry = useMemo(grassGeometry, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <MountainNatureBatch
      name="GangMeadowGrass"
      items={items}
      geometry={geometry}
      distance={55}
      wind
    />
  );
}
