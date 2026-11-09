/** @jsxImportSource @/game/jsx */
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { Text } from "@react-three/drei";
import { CuboidCollider, RigidBody, TrimeshCollider } from "@react-three/rapier";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { MOUNTAIN_CHALLENGES, MOUNTAIN_TRAIL } from "./model";
import { challengePlatforms, stairMesh } from "./obstacles";

const LABELS = { stairs: "TANGGA PENDAKI", stones: "LOMPAT BATU", balance: "TITIAN AWAN" };
export function MountainChallenges() {
  const platforms = useMemo(
    () =>
      MOUNTAIN_CHALLENGES.filter((c) => c.kind !== "stairs").flatMap((c) =>
        challengePlatforms(c).map((p) => ({ ...p, kind: c.kind })),
      ),
    [],
  );
  const parts = useMemo<OutdoorPart[]>(
    () =>
      platforms.map((p) => ({
        p: [p.x, p.y - 0.18, p.z],
        s: [p.width, 0.36, p.depth],
        ry: p.yaw,
        color: p.kind === "stones" ? "#9b967b" : "#b78b58",
      })),
    [platforms],
  );
  return (
    <group name="MountainChallenges">
      <OutdoorBatch items={parts} />
      {MOUNTAIN_CHALLENGES.filter((c) => c.kind === "stairs").map((c) => (
        <MountainStairs key={c.segment} challenge={c} />
      ))}
      <RigidBody type="fixed" colliders={false} userData={{ mountainTrail: true }}>
        {platforms.map((p, i) => (
          <CuboidCollider
            key={i}
            position={[p.x, p.y - 0.18, p.z]}
            rotation={[0, p.yaw, 0]}
            args={[p.width / 2, 0.18, p.depth / 2]}
            friction={0.8}
          />
        ))}
      </RigidBody>
      {MOUNTAIN_CHALLENGES.map((c) => {
        const a = MOUNTAIN_TRAIL[c.segment]!;
        const p = challengePlatforms(c)[0]!;
        return (
          <group
            key={c.segment}
            position={[a[0] + Math.cos(p.yaw) * 3.5, a[1], a[2] - Math.sin(p.yaw) * 3.5]}
          >
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[0.13, 2, 0.13]} />
              <meshStandardMaterial color="#67513d" />
            </mesh>
            <Text
              position={[0, 2.15, 0]}
              fontSize={0.25}
              color="#fff2c8"
              outlineWidth={0.035}
              outlineColor="#3f5038"
            >
              {LABELS[c.kind]}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function MountainStairs({ challenge }: { challenge: (typeof MOUNTAIN_CHALLENGES)[number] }) {
  const mesh = useMemo(() => {
    const data = stairMesh(challenge);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(data.triangles, 1));
    geometry.computeVertexNormals();
    return { ...data, geometry };
  }, [challenge]);
  useEffect(() => () => mesh.geometry.dispose(), [mesh]);
  return (
    <RigidBody type="fixed" colliders={false} userData={{ mountainTrail: true }}>
      <mesh geometry={mesh.geometry} receiveShadow castShadow>
        <meshStandardMaterial color="#b78b58" roughness={1} side={THREE.DoubleSide} flatShading />
      </mesh>
      <TrimeshCollider args={[mesh.positions, mesh.triangles]} friction={0.6} />
    </RigidBody>
  );
}
