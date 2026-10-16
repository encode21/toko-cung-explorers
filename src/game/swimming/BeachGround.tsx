/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import * as T from "three";
import { RigidBody, CuboidCollider, TrimeshCollider } from "@react-three/rapier";
import { subtract } from "@/game/world/outdoor-layout";
import { BEACH_BOUNDS, beachTerrain, beachRadius } from "./model";
const patches = subtract({ minX: -320, maxX: 320, minZ: -320, maxZ: 320 }, BEACH_BOUNDS);
const colliders = subtract({ minX: -120, maxX: 120, minZ: -120, maxZ: 120 }, BEACH_BOUNDS);
/** Preserve all city terrain except the explicitly reserved beach parcel. */
export function BeachGround() {
  const terrain = useMemo(beachTerrain, []);
  const geometry = useMemo(() => {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(terrain.vertices, 3));
    g.setIndex(new T.BufferAttribute(terrain.indices, 1));
    const colors: number[] = [];
    const dry = new T.Color("#efdaad"),
      wet = new T.Color("#c6ba8d"),
      deep = new T.Color("#8da994");
    for (let i = 0; i < terrain.vertices.length; i += 3) {
      const r = beachRadius(terrain.vertices[i]!, terrain.vertices[i + 2]!);
      const color = r > 1 ? dry.clone() : wet.clone().lerp(deep, Math.min(1, (1 - r) * 1.8));
      const x = terrain.vertices[i]!,
        z = terrain.vertices[i + 2]!;
      const edge = Math.min(
        x - BEACH_BOUNDS.minX,
        BEACH_BOUNDS.maxX - x,
        z - BEACH_BOUNDS.minZ,
        BEACH_BOUNDS.maxZ - z,
      );
      color.lerp(new T.Color("#91a875"), 1 - T.MathUtils.smoothstep(edge, 0, 1.3));
      colors.push(color.r, color.g, color.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [terrain]);
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
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <TrimeshCollider args={[terrain.vertices, terrain.indices]} friction={0.5} />
      {/* Solid bed beneath the mesh is a redundant catch floor, entirely inside the parcel. */}
      <CuboidCollider args={[9.5, 0.2, 13.5]} position={[-45, -2.5, -41]} />
    </RigidBody>
  );
}
