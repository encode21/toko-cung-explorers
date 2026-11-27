/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { naturalGroundMaterial } from "../world/natural-ground";
import * as T from "three";
import { RigidBody, CuboidCollider, TrimeshCollider } from "@react-three/rapier";
import {
  WATER_BODIES,
  BEACH,
  CITY_BEACH_BOUNDS,
  beachTerrain,
  waterRadius,
  coastDistance,
  OCEAN_VISUAL_EXTENT,
  type WaterBody,
} from "./model";
export function WaterBed({ body }: { body: WaterBody }) {
  const terrain = useMemo(() => beachTerrain(48, body), [body]);
  const bounds = body.bounds;
  const geometry = useMemo(() => {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(terrain.vertices, 3));
    g.setIndex(new T.BufferAttribute(terrain.indices, 1));
    const colors: number[] = [];
    const coverage: number[] = [];
    const dry = new T.Color("#efdaad"),
      wet = new T.Color("#c6ba8d"),
      deep = new T.Color("#8da994");
    for (let i = 0; i < terrain.vertices.length; i += 3) {
      const r = waterRadius(terrain.vertices[i]!, terrain.vertices[i + 2]!, body);
      const floor = terrain.vertices[i + 1]!;
      const color =
        body.kind === "ocean"
          ? dry
              .clone()
              .lerp(wet, 1 - T.MathUtils.smoothstep(floor - body.surface, -0.15, 0.45))
              .lerp(deep, T.MathUtils.clamp((body.surface - floor) / 1.5, 0, 1))
          : r > 1
            ? dry.clone()
            : wet.clone().lerp(deep, Math.min(1, (1 - r) * 1.8));
      const x = terrain.vertices[i]!,
        z = terrain.vertices[i + 2]!;
      const edge = Math.min(x - bounds.minX, bounds.maxX - x, z - bounds.minZ, bounds.maxZ - z);
      let grassCoverage =
        body.kind === "ocean"
          ? 1 -
            T.MathUtils.smoothstep(
              coastDistance(x, z) +
                Math.sin(x * 0.37 + z * 0.11) +
                Math.sin(z * 0.23 - x * 0.41) * 0.7,
              -5,
              1,
            )
          : 1 - T.MathUtils.smoothstep(edge, 0, 1.3);
      if (body.kind === "ocean") {
        const b = CITY_BEACH_BOUNDS;
        const outside = Math.max(b.minX - x, x - b.maxX, b.minZ - z, z - b.maxZ);
        grassCoverage *= T.MathUtils.smoothstep(outside, -1, 2);
      }
      coverage.push(grassCoverage);
      colors.push(color.r, color.g, color.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.setAttribute("grassCoverage", new T.Float32BufferAttribute(coverage, 1));
    g.computeVertexNormals();
    return g;
  }, [terrain, body, bounds]);
  const material = useMemo(() => naturalGroundMaterial(true), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <>
      <mesh geometry={geometry} material={material} receiveShadow />
      <TrimeshCollider args={[terrain.vertices, terrain.indices]} friction={0.5} />
      {body.kind === "pond" && (
        <CuboidCollider
          args={[
            (body.bounds.maxX - body.bounds.minX) / 2,
            0.2,
            (body.bounds.maxZ - body.bounds.minZ) / 2,
          ]}
          position={[
            (body.bounds.minX + body.bounds.maxX) / 2,
            -body.depth - 0.3,
            (body.bounds.minZ + body.bounds.maxZ) / 2,
          ]}
        />
      )}
    </>
  );
}
/** Every water parcel uses the same visible and physical bed, with sloped exits. */
export function BeachGround() {
  return (
    <RigidBody type="fixed" colliders={false} name="WorldGround">
      <CuboidCollider
        args={[OCEAN_VISUAL_EXTENT, 0.2, OCEAN_VISUAL_EXTENT]}
        position={[0, -BEACH.depth - 0.28, 0]}
      />
      <WaterBed body={WATER_BODIES[0]!} />
    </RigidBody>
  );
}
