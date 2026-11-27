/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import { BallCollider, CuboidCollider, RigidBody } from "@react-three/rapier";
import { ArchitectureBatch } from "./ArchitectureBatch";
import { Plang } from "./Plang";
import { MOSQUE, MOSQUE_TERRACE, mosqueArchitecture } from "./mosque-layout";

/** Mosque exterior facing Taman Kota from the southern waterfront. */
export function Mosque() {
  const parts = useMemo(mosqueArchitecture, []);
  const [width, height, depth] = MOSQUE_TERRACE.size;
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={MOSQUE_TERRACE.position}>
        <CuboidCollider args={[width / 2, height / 2, depth / 2]} />
        <mesh name="MosqueTerrace" receiveShadow>
          <boxGeometry args={MOSQUE_TERRACE.size} />
          <meshStandardMaterial color="#cfc2ac" roughness={0.9} />
        </mesh>
      </RigidBody>
      <group name="MasjidCung" position={MOSQUE.position} rotation-y={MOSQUE.rotation}>
        <ArchitectureBatch items={parts.masonry} surface="masonry" />
        <ArchitectureBatch items={parts.trim} surface="trim" />
        <ArchitectureBatch items={parts.glazing} surface="glazing" />
        <RigidBody type="fixed" colliders={false} name="MosqueStructure">
          {parts.colliders.map((c, i) => (
            <CuboidCollider key={i} position={c.p} args={[c.s[0] / 2, c.s[1] / 2, c.s[2] / 2]} />
          ))}
          <BallCollider position={MOSQUE.dome} args={[MOSQUE.domeRadius]} />
          <BallCollider position={[0, 3.8, 3.4]} args={[0.9]} />
        </RigidBody>
        <mesh position={[0, 8.65, -1.6]} castShadow>
          <cylinderGeometry args={[3.12, 3.12, 0.7, 32]} />
          <meshStandardMaterial color="#c8beaa" roughness={0.9} />
        </mesh>
        <mesh name="MosqueDome" position={MOSQUE.dome} castShadow receiveShadow>
          <sphereGeometry args={[MOSQUE.domeRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f3f0e5" roughness={0.58} metalness={0.12} />
        </mesh>
        <mesh position={[0, 12.42, -1.6]} castShadow>
          <cylinderGeometry args={[0.035, 0.055, 0.7, 8]} />
          <meshStandardMaterial color="#bfa66c" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 12.97, -1.6]} rotation-z={-Math.PI * 0.2}>
          <torusGeometry args={[0.23, 0.035, 6, 24, Math.PI * 1.4]} />
          <meshStandardMaterial color="#bfa66c" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 3.65, 3.4]} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 0.3, 20]} />
          <meshStandardMaterial color="#c8beaa" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3.8, 3.4]} castShadow>
          <sphereGeometry args={[0.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f3f0e5" roughness={0.58} />
        </mesh>
        <mesh name="MosqueMinaretCrown" position={[-5.05, 14.8, 4.9]} castShadow>
          <coneGeometry args={[0.68, 1.7, 16]} />
          <meshStandardMaterial color="#e6e4da" roughness={0.6} metalness={0.12} />
        </mesh>
        <mesh position={[-5.05, 15.92, 4.9]}>
          <cylinderGeometry args={[0.015, 0.045, 1.1, 8]} />
          <meshStandardMaterial color="#a89972" roughness={0.5} metalness={0.4} />
        </mesh>
        <Plang
          text="MASJID CUNG"
          position={[0, 3.3, 4.48]}
          size={0.24}
          board="#275646"
          textColor="#f8efd3"
        />
      </group>
    </>
  );
}
