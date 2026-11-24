/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { currentWeather } from "@/game/weather/store";
import { KALI, PLAY_HALF, kaliBridges, kampungHouses } from "./kampung-layout";

const box = new THREE.BoxGeometry(1, 1, 1);
// Four-sided cone = simple hip roof (limasan), rotated so its edges follow the walls.
const roofGeo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4);

/** Scene-local backdrop: packed kampung houses, boundary walls, and the kali that overflows in heavy rain. */
export function Kampung({ gang, from, to }: { gang: number; from: number; to: number }) {
  const houses = useMemo(() => kampungHouses(gang, from, to), [gang, from, to]);
  const bridges = useMemo(() => kaliBridges(from, to), [from, to]);
  const walls = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const water = useRef<THREE.Mesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      c = new THREE.Color();
    houses.forEach((h, i) => {
      m.compose(new THREE.Vector3(h.x, h.h / 2, h.z), q, new THREE.Vector3(h.w, h.h, h.d));
      walls.current?.setMatrixAt(i, m);
      walls.current?.setColorAt(i, c.set(h.wall));
      m.compose(
        new THREE.Vector3(h.x, h.h + 0.7, h.z),
        q,
        new THREE.Vector3(h.w + 0.8, 1.4, h.d + 0.8),
      );
      roofs.current?.setMatrixAt(i, m);
      roofs.current?.setColorAt(i, c.set(h.roof));
    });
    for (const r of [walls.current, roofs.current]) {
      if (!r) continue;
      r.instanceMatrix.needsUpdate = true;
      if (r.instanceColor) r.instanceColor.needsUpdate = true;
    }
  }, [houses]);
  // Kali runs near the brim; heavy rain pushes it over the banks (the gang flood follows).
  useFrame(() => {
    if (water.current) water.current.position.y = 0.05 + currentWeather().flood * 0.35;
  });
  const length = to - from,
    mid = (from + to) / 2,
    kaliMid = (KALI.x0 + KALI.x1) / 2,
    kaliW = KALI.x1 - KALI.x0;
  return (
    <group name="Kampung">
      <instancedMesh ref={walls} args={[box, undefined, houses.length]} castShadow receiveShadow>
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[roofGeo, undefined, houses.length]} castShadow>
        <meshStandardMaterial />
      </instancedMesh>
      {/* Pagar tembok at the edge of the walkable gang (the colliders sit here). */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (PLAY_HALF + 0.3), 0.5, mid]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 1, length]} />
          <meshStandardMaterial color="#cfc3ad" />
        </mesh>
      ))}
      {/* Kali: concrete banks and brown water. */}
      {[KALI.x0, KALI.x1].map((x) => (
        <mesh key={x} position={[x, 0.35, mid]} receiveShadow>
          <boxGeometry args={[0.4, 0.7, length]} />
          <meshStandardMaterial color="#9a9488" />
        </mesh>
      ))}
      <mesh position={[kaliMid, 0.01, mid]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[kaliW, length]} />
        <meshStandardMaterial color="#3d3a2c" />
      </mesh>
      <mesh ref={water} position={[kaliMid, 0.05, mid]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[kaliW - 0.4, length]} />
        <meshStandardMaterial color="#7a6a48" roughness={0.4} transparent opacity={0.9} />
      </mesh>
      {bridges.map((z) => (
        <group key={z} position={[kaliMid, 0, z]}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[kaliW + 1.2, 0.15, 1.6]} />
            <meshStandardMaterial color="#8a6a48" />
          </mesh>
          {[-0.75, 0.75].map((dz) => (
            <mesh key={dz} position={[0, 1.2, dz]}>
              <boxGeometry args={[kaliW + 1.2, 0.08, 0.08]} />
              <meshStandardMaterial color="#5a4a38" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
