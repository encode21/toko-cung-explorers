/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import * as T from "three";
import { RigidBody, CuboidCollider, TrimeshCollider } from "@react-three/rapier";
import { subtract } from "@/game/world/outdoor-layout";
import { WATER_BODIES, beachTerrain, waterRadius, type WaterBody } from "./model";
const carve = (extent: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  WATER_BODIES.reduce(
    (patches, body) => patches.flatMap((p) => subtract(p, body.bounds)),
    [extent],
  );
const patches = carve({ minX: -320, maxX: 320, minZ: -320, maxZ: 320 });
const colliders = carve({ minX: -120, maxX: 120, minZ: -120, maxZ: 120 });
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
      color.lerp(new T.Color("#91a875"), 1 - T.MathUtils.smoothstep(edge, 0, 1.3));
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
    </>
  );
}
/** Every water parcel uses the same visible and physical bed, with sloped exits. */
export function BeachGround() {
  return (
    <RigidBody type="fixed" colliders={false} name="WorldGround">
      {patches.map((b, i) => (
        <mesh
          key={i}
          rotation-x={-Math.PI / 2}
          position={[(b.minX + b.maxX) / 2, -0.03, (b.minZ + b.maxZ) / 2]}
          receiveShadow
        >
          <planeGeometry args={[b.maxX - b.minX, b.maxZ - b.minZ]} />
          <meshStandardMaterial color="#91a875" roughness={1} />
        </mesh>
      ))}
      {colliders.map((b, i) => (
        <CuboidCollider
          key={i}
          args={[(b.maxX - b.minX) / 2, 0.1, (b.maxZ - b.minZ) / 2]}
          position={[(b.minX + b.maxX) / 2, -0.14, (b.minZ + b.maxZ) / 2]}
        />
      ))}
      {WATER_BODIES.map((body) => (
        <WaterBed key={body.x} body={body} />
      ))}
    </RigidBody>
  );
}
