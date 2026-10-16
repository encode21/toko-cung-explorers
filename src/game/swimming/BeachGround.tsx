/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import * as T from "three";
import { RigidBody, CuboidCollider, TrimeshCollider } from "@react-three/rapier";
import {
  WATER_BODIES,
  beachTerrain,
  waterRadius,
  coastDistance,
  OCEAN_VISUAL_EXTENT,
  type WaterBody,
} from "./model";
function WaterBed({ body }: { body: WaterBody }) {
  const terrain = useMemo(() => beachTerrain(48, body), [body]);
  const bounds = body.bounds;
  const geometry = useMemo(() => {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(terrain.vertices, 3));
    g.setIndex(new T.BufferAttribute(terrain.indices, 1));
    const colors: number[] = [];
    const dry = new T.Color("#efdaad"),
      wet = new T.Color("#c6ba8d"),
      deep = new T.Color("#8da994");
    for (let i = 0; i < terrain.vertices.length; i += 3) {
      const r = waterRadius(terrain.vertices[i]!, terrain.vertices[i + 2]!, body);
      const color = r > 1 ? dry.clone() : wet.clone().lerp(deep, Math.min(1, (1 - r) * 1.8));
      const x = terrain.vertices[i]!,
        z = terrain.vertices[i + 2]!;
      const edge = Math.min(x - bounds.minX, bounds.maxX - x, z - bounds.minZ, bounds.maxZ - z);
      color.lerp(
        new T.Color("#91a875"),
        body.kind === "ocean"
          ? 1 - T.MathUtils.smoothstep(coastDistance(x, z), -3, -1)
          : 1 - T.MathUtils.smoothstep(edge, 0, 1.3),
      );
      colors.push(color.r, color.g, color.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [terrain, body, bounds]);
  return (
    <>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
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
        position={[0, -3.48, 0]}
      />
      {WATER_BODIES.map((body) => (
        <WaterBed key={body.x} body={body} />
      ))}
    </RigidBody>
  );
}
