/** @jsxImportSource @/game/jsx */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Group } from "three";
import { useGame } from "@/state/game-store";
import { Plang } from "@/game/world/Plang";
import {
  FISH_STALL,
  FRUIT_STALL,
  FRUIT_TREES,
  KULI_STALLS,
  KULI_TRUCK,
  kuliTarget,
  treeReady,
  type V3,
} from "./model";
import { useEasyJobs } from "./store";

function Stall({ at, label, color }: { at: V3; label: string; color: string }) {
  return (
    <group position={at}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[3, 1, 1.2]} />
        <meshStandardMaterial color="#9b6b3f" />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <boxGeometry args={[3.4, 0.12, 1.8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 1.15, 0.5]}>
          <boxGeometry args={[0.1, 2.3, 0.1]} />
          <meshStandardMaterial color="#5a3922" />
        </mesh>
      ))}
      <Plang
        text={label}
        position={[0, 2.2, 0.9]}
        size={0.25}
        board="#5a3922"
        textColor="#ffe9b8"
      />
    </group>
  );
}

// Shared fruit geometry. Mangga: a slightly flattened, kidney-ish ellipsoid with a green-to-orange
// blush (vertex colours). Rambutan: a red ball with soft "hairs" (instanced spikes).
const MANGO = (() => {
  const g = new THREE.SphereGeometry(1, 16, 12);
  const pos = g.getAttribute("position"),
    col: number[] = [];
  const green = new THREE.Color("#7fae3c"),
    gold = new THREE.Color("#f2b632"),
    red = new THREE.Color("#e0662e"),
    c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    // Kidney curve: bulge one side, flatten the other, pointed bottom.
    pos.setXYZ(i, x * 0.72 + Math.max(0, y) * 0.08, y * 1.05 - Math.max(0, -x) * 0.06, z * 0.62);
    const t = (y + 1) / 2;
    c.copy(green)
      .lerp(gold, Math.min(1, t * 1.3))
      .lerp(red, Math.max(0, x) * t * 0.6);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
})();
const RAMBUTAN_HAIRS = (() => {
  const dirs: THREE.Vector3[] = [];
  const n = 46;
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2,
      r = Math.sqrt(1 - y * y),
      a = i * 2.39996;
    dirs.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  return dirs;
})();
const hairGeo = new THREE.ConeGeometry(0.035, 0.13, 4).translate(0, 0.065, 0);
const up = new THREE.Vector3(0, 1, 0);

function Rambutan({ position }: { position: [number, number, number] }) {
  const hairs = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion();
    RAMBUTAN_HAIRS.forEach((d, i) => {
      q.setFromUnitVectors(up, d);
      m.compose(d.clone().multiplyScalar(0.12), q, new THREE.Vector3(1, 1, 1));
      hairs.current?.setMatrixAt(i, m);
    });
    if (hairs.current) hairs.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#c8212b" roughness={0.6} />
      </mesh>
      <instancedMesh ref={hairs} args={[hairGeo, undefined, RAMBUTAN_HAIRS.length]}>
        <meshStandardMaterial color="#e0484a" roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
function Mango({ position, tilt }: { position: [number, number, number]; tilt: number }) {
  return (
    <group position={position} rotation-z={tilt}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
        <meshStandardMaterial color="#5a4a2a" />
      </mesh>
      <mesh geometry={MANGO} scale={0.16} castShadow>
        <meshStandardMaterial vertexColors roughness={0.45} />
      </mesh>
    </group>
  );
}

function FruitTree({
  x,
  z,
  fruit,
  ready,
}: {
  x: number;
  z: number;
  fruit: string;
  ready: boolean;
}) {
  const mango = fruit === "Mangga";
  // Leafy canopy from a few overlapping clumps in two greens, not a single ball.
  const clumps: [number, number, number, number, string][] = [
    [0, 3.2, 0, 1.45, "#3f7f36"],
    [0.9, 2.9, 0.4, 1.0, "#4b8d3d"],
    [-0.8, 3.0, -0.3, 1.05, "#356f2e"],
    [0.2, 3.9, -0.5, 0.95, "#4b8d3d"],
    [-0.3, 2.7, 0.9, 0.9, "#356f2e"],
  ];
  // Hang just under the canopy's outer edge so the fruit reads from the street.
  const spots: [number, number, number][] = [
    [1.7, 2.05, 0.7],
    [-1.6, 2.1, 0.8],
    [0.6, 1.95, 1.75],
    [-0.7, 2.0, -1.7],
    [1.5, 2.25, -1.0],
    [-1.85, 2.3, -0.3],
    [0.1, 2.0, 1.85],
  ];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.3, 2.4, 8]} />
        <meshStandardMaterial color="#6b4a2e" roughness={1} />
      </mesh>
      {[-0.6, 0.7].map((a) => (
        <mesh key={a} position={[a * 0.5, 2.3, 0]} rotation-z={-a}>
          <cylinderGeometry args={[0.07, 0.1, 1.1, 6]} />
          <meshStandardMaterial color="#6b4a2e" />
        </mesh>
      ))}
      {clumps.map(([cx, cy, cz, r, c], i) => (
        <mesh key={i} position={[cx, cy, cz]} castShadow>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={c} roughness={0.9} flatShading />
        </mesh>
      ))}
      {ready &&
        spots.map((p, i) =>
          mango ? (
            <Mango key={i} position={p} tilt={(i % 3) * 0.2 - 0.2} />
          ) : (
            <group key={i}>
              <Rambutan position={p} />
              <Rambutan position={[p[0] + 0.18, p[1] - 0.08, p[2] + 0.1]} />
            </group>
          ),
        )}
    </group>
  );
}

const crate = (
  <mesh castShadow>
    <boxGeometry args={[0.6, 0.45, 0.5]} />
    <meshStandardMaterial color="#c8a063" />
  </mesh>
);

export function EasyJobsScene() {
  const pickedAt = useEasyJobs((s) => s.pickedAt),
    kuli = useEasyJobs((s) => s.kuli),
    [now, setNow] = useState(Date.now);
  const carried = useRef<Group>(null),
    marker = useRef<Group>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = kuli ? kuliTarget(kuli) : null;
  useFrame(({ clock }) => {
    const p = useGame.getState().playerPos;
    if (carried.current) {
      carried.current.visible = !!kuli?.carrying;
      carried.current.position.set(p[0], p[1] + 0.75, p[2]);
    }
    if (marker.current) marker.current.position.y = 0.06 + Math.sin(clock.elapsedTime * 4) * 0.03;
  });
  return (
    <group>
      {FRUIT_TREES.map((t) => (
        <FruitTree key={t.id} {...t} ready={treeReady(pickedAt[t.id], now)} />
      ))}
      <Stall at={FRUIT_STALL} label="KIOS BUAH" color="#e8a33d" />
      <Stall at={FISH_STALL} label="KIOS IKAN" color="#3d8fb8" />
      <mesh position={[KULI_TRUCK[0], 1.1, KULI_TRUCK[2]]} castShadow>
        <boxGeometry args={[3.2, 2.2, 5]} />
        <meshStandardMaterial color="#6f8f5a" />
      </mesh>
      <Plang
        mode="post"
        text="TRUK PASAR · JADI KULI"
        position={[KULI_TRUCK[0] + 2.4, 0, KULI_TRUCK[2] - 2.5]}
        size={0.25}
        board="#3f5a35"
        twoSided
      />
      {KULI_STALLS.map((s, i) => (
        <Stall key={i} at={s} label={`KIOS ${i + 1}`} color="#c4553d" />
      ))}
      {target && kuli?.carrying && (
        <group ref={marker} position={[target[0], 0.06, target[2] + 1.6]}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.8, 1.1, 32]} />
            <meshBasicMaterial color="#ffe14d" />
          </mesh>
        </group>
      )}
      <group ref={carried} visible={false}>
        {crate}
      </group>
    </group>
  );
}
