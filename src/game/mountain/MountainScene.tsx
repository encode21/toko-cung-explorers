/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody, TrimeshCollider } from "@react-three/rapier";
import * as THREE from "three";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { LOW_QUALITY } from "@/game/engine/quality";
import { useMountain } from "./store";
import { Helipad } from "./Helicopter";
import {
  CITY_HELIPAD,
  MOUNTAIN_HELIPAD,
  MOUNTAIN_BOUNDS,
  MOUNTAIN_CHECKPOINTS,
  MOUNTAIN_SUMMIT,
  MOUNTAIN_TRAIL,
  MOUNTAIN_PATH_WIDTH,
  MOUNTAIN_BRIDGE_SEGMENT,
  mountainGroundHeight,
  nearestMountainTrail,
  type MountainPoint,
} from "./model";

const P = { wood: "#a67d51", dark: "#5c4937", light: "#f6edcc", leaf: "#4f8056", gold: "#f2bd53" };
const part = (
  p: [number, number, number],
  s: [number, number, number],
  color: string,
  ry = 0,
): OutdoorPart => ({ p, s, color, ry });
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));

function makeTerrain() {
  const vertices: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const columns = 80,
    rows = 100,
    b = MOUNTAIN_BOUNDS;
  const green = new THREE.Color("#769f60"),
    rock = new THREE.Color("#8c917b"),
    low = new THREE.Color("#597d56");
  for (let z = 0; z <= rows; z++)
    for (let x = 0; x <= columns; x++) {
      const wx = b.minX + (x / columns) * (b.maxX - b.minX),
        wz = b.minZ + (z / rows) * (b.maxZ - b.minZ);
      const y = mountainGroundHeight(wx, wz);
      vertices.push(wx, y, wz);
      const slope =
        Math.abs(mountainGroundHeight(wx + 1, wz) - y) +
        Math.abs(mountainGroundHeight(wx, wz + 1) - y);
      const c = green
        .clone()
        .lerp(low, clamp(Math.sin(wx * 0.11 + wz * 0.16) * 0.22 + 0.15))
        .lerp(rock, clamp(slope * 0.4));
      colors.push(c.r, c.g, c.b);
    }
  for (let z = 0; z < rows; z++)
    for (let x = 0; x < columns; x++) {
      const a = z * (columns + 1) + x,
        c = a + columns + 1;
      indices.push(a, c, a + 1, a + 1, c, c + 1);
    }
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(vertices),
    triangles = new Uint32Array(indices);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(triangles, 1));
  geometry.computeVertexNormals();
  return { geometry, positions, triangles };
}

function Terrain() {
  const terrain = useMemo(makeTerrain, []);
  useEffect(() => () => terrain.geometry.dispose(), [terrain]);
  return (
    <RigidBody type="fixed" colliders={false} name="MountainTerrain">
      <mesh geometry={terrain.geometry} receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={1} />
      </mesh>
      <TrimeshCollider args={[terrain.positions, terrain.triangles]} friction={0.85} />
    </RigidBody>
  );
}

/** Miter joins make one continuous ribbon: no gaps, invisible steps, or corner shortcuts. */
function trailEdges(index: number) {
  const p = MOUNTAIN_TRAIL[index]!;
  const prev = MOUNTAIN_TRAIL[Math.max(0, index - 1)]!;
  const next = MOUNTAIN_TRAIL[Math.min(MOUNTAIN_TRAIL.length - 1, index + 1)]!;
  const a = new THREE.Vector2(p[0] - prev[0], p[2] - prev[2]).normalize();
  const b = new THREE.Vector2(next[0] - p[0], next[2] - p[2]).normalize();
  if (index === 0) a.copy(b);
  if (index === MOUNTAIN_TRAIL.length - 1) b.copy(a);
  const n1 = new THREE.Vector2(-a.y, a.x),
    n2 = new THREE.Vector2(-b.y, b.x);
  const miter = n1.clone().add(n2).normalize();
  miter.multiplyScalar(MOUNTAIN_PATH_WIDTH / 2 / Math.max(0.45, miter.dot(n1)));
  return [
    [p[0] + miter.x, p[1], p[2] + miter.y],
    [p[0] - miter.x, p[1], p[2] - miter.y],
  ];
}

function TrailSegment({ index }: { index: number }) {
  const bridge = index === MOUNTAIN_BRIDGE_SEGMENT;
  const mesh = useMemo(() => {
    const [a, b] = trailEdges(index),
      [c, d] = trailEdges(index + 1);
    const top = [a!, b!, c!, d!];
    const positions = new Float32Array([
      ...top.flat(),
      ...top.flatMap((p) => [p[0]!, p[1]! - 0.3, p[2]!]),
    ]);
    const triangles = new Uint32Array([
      0, 2, 1, 1, 2, 3, 0, 2, 4, 2, 6, 4, 1, 5, 3, 3, 5, 7, 0, 4, 1, 1, 4, 5, 2, 3, 6, 3, 7, 6,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(triangles, 1));
    geometry.computeVertexNormals();
    return { positions, triangles, geometry };
  }, [index]);
  useEffect(() => () => mesh.geometry.dispose(), [mesh]);
  return (
    <RigidBody type="fixed" colliders={false} userData={{ mountainTrail: true }}>
      <mesh receiveShadow castShadow geometry={mesh.geometry}>
        <meshStandardMaterial
          color={bridge ? P.wood : "#b8a07a"}
          roughness={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <TrimeshCollider args={[mesh.positions, mesh.triangles]} friction={0.8} />
    </RigidBody>
  );
}

function Bridge() {
  const parts = useMemo(() => {
    const result: OutdoorPart[] = [];
    for (let i = 0; i <= 32; i++) {
      const x = 344 + (i / 32) * 22;
      result.push(part([x, 20.015, 18], [0.045, 0.012, 4.8], P.dark));
      if (i % 4 === 0)
        for (const side of [-1, 1])
          result.push(part([x, 20.65, 18 + side * 2.45], [0.14, 1.5, 0.14], P.dark));
    }
    for (const side of [-1, 1]) {
      result.push(part([355, 21.25, 18 + side * 2.45], [22.3, 0.1, 0.1], "#e5c38c"));
      result.push(part([355, 20.65, 18 + side * 2.45], [22.3, 0.07, 0.07], "#cba573"));
    }
    return result;
  }, []);
  return (
    <>
      <OutdoorBatch items={parts} />
      <RigidBody type="fixed" colliders={false}>
        {[-1, 1].map((side) => (
          <CuboidCollider
            key={side}
            args={[11.2, 0.7, 0.09]}
            position={[355, 20.6, 18 + side * 2.45]}
          />
        ))}
      </RigidBody>
    </>
  );
}

/** Deterministic foliage; hundreds of plants share a handful of instanced draw calls. */
function makeVegetation() {
  const trunks: OutdoorPart[] = [],
    crowns: OutdoorPart[] = [],
    grass: OutdoorPart[] = [],
    rocks: OutdoorPart[] = [];
  let state = 74231;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const allowed = (x: number, z: number, clearance: number) => {
    if (nearestMountainTrail(x, z).distance < clearance) return false;
    if (Math.hypot(x - 360, z - 65) < 19) return false;
    return [...MOUNTAIN_CHECKPOINTS, { id: 5, ...MOUNTAIN_SUMMIT }].every(
      (cp) => Math.hypot(x - cp.position[0], z - cp.position[2]) > 10,
    );
  };
  const count = LOW_QUALITY ? 130 : 240;
  for (let i = 0; i < count * 5 && trunks.length < count; i++) {
    const x = 311 + random() * 116,
      z = -76 + random() * 157,
      y = mountainGroundHeight(x, z);
    if (!allowed(x, z, 6.3) || y < 4 || (z < -42 && random() > 0.35)) continue;
    const h = 4 + random() * 4.5,
      w = 2.8 + random() * 2.6;
    trunks.push(
      part([x, y + h * 0.39, z], [0.4 + h * 0.035, h * 0.78, 0.4 + h * 0.035], "#785a3c"),
    );
    crowns.push(
      part(
        [x, y + h * 0.8, z],
        [w, h * 0.8, w],
        ["#4f8056", "#5b915d", "#83a765", "#3e6f51"][Math.floor(random() * 4)]!,
      ),
    );
    if (!LOW_QUALITY)
      crowns.push(
        part([x + w * 0.25, y + h * 0.62, z + w * 0.18], [w * 0.8, h * 0.5, w * 0.85], "#68945b"),
      );
  }
  for (let i = 0; i < (LOW_QUALITY ? 500 : 1100); i++) {
    const x = 310 + random() * 120,
      z = -80 + random() * 163,
      y = mountainGroundHeight(x, z);
    if (!allowed(x, z, 3.6) || y < 1) continue;
    if (i % 5 === 0) {
      const size = 0.7 + random() * 2.6;
      rocks.push(
        part(
          [x, y + size * 0.22, z],
          [size * 1.4, size, size],
          ["#8a9183", "#a1a58e", "#727e76"][i % 3]!,
          random() * Math.PI,
        ),
      );
    } else {
      const h = 0.24 + random() * 0.55;
      for (let stem = 0; stem < 2; stem++) {
        grass.push({
          ...part(
            [x + stem * 0.16, y + h * 0.35, z],
            [0.09, h, 0.42],
            ["#8da95f", "#b0bc70", "#5d9254"][i % 3]!,
            random() * Math.PI,
          ),
          rz: (random() - 0.5) * 0.7,
        });
      }
    }
  }
  return { trunks, crowns, grass, rocks };
}

function Vegetation() {
  const v = useMemo(makeVegetation, []);
  return (
    <>
      <OutdoorBatch items={v.trunks} shape="round" />
      <OutdoorBatch items={v.crowns} shape="foliage" shadows={!LOW_QUALITY} />
      <OutdoorBatch items={v.grass} shadows={false} />
      <OutdoorBatch items={v.rocks} shape="foliage" shadows={!LOW_QUALITY} />
    </>
  );
}

function Lantern({ position, active = false }: { position: MountainPoint; active?: boolean }) {
  return (
    <group position={[...position]}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.1, 1.8, 0.1]} />
        <meshStandardMaterial color={P.dark} />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[0.42, 0.48, 0.42]} />
        <meshStandardMaterial
          color={active ? "#ceffb6" : "#ffdf9c"}
          emissive={active ? "#7bd66f" : "#ffbf58"}
          emissiveIntensity={active ? 0.75 : 0.35}
        />
      </mesh>
      <mesh position={[0, 2.04, 0]}>
        <coneGeometry args={[0.4, 0.22, 4]} />
        <meshStandardMaterial color={P.dark} />
      </mesh>
    </group>
  );
}

function RestShelter({ theme }: { theme: number }) {
  const parts = useMemo(
    () => [
      ...[-1.5, 1.5].flatMap((x) =>
        [-1.35, 1.35].map((z) => part([x, 1.2, z], [0.18, 2.4, 0.18], P.dark)),
      ),
      part([0, 0.52, 0.85], [2.6, 0.16, 0.65], P.wood),
      part([0, 0.95, 1.15], [2.6, 0.7, 0.12], P.wood),
      part([-1, 0.22, 0.85], [0.14, 0.5, 0.45], P.dark),
      part([1, 0.22, 0.85], [0.14, 0.5, 0.45], P.dark),
    ],
    [],
  );
  return (
    <group position={[4, 0, 0]}>
      <OutdoorBatch items={parts} />
      <mesh castShadow position={[0, 2.45, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[2.7, 1.35, 4]} />
        <meshStandardMaterial color={["#8f5b3f", "#567566", "#8d6f55", "#507d81"][theme - 1]!} />
      </mesh>
      <Lantern position={[1.5, 0, -1.35]} />
    </group>
  );
}

function Checkpoint({ checkpoint }: { checkpoint: (typeof MOUNTAIN_CHECKPOINTS)[number] }) {
  const progress = useMountain((s) => s.checkpoint);
  const active = progress >= checkpoint.id;
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!pulse.current) return;
    const state = useMountain.getState();
    const age = (Date.now() - state.pulseAt) / 1000;
    pulse.current.visible = state.checkpoint === checkpoint.id && age >= 0 && age < 1.4;
    if (pulse.current.visible) {
      pulse.current.scale.setScalar(1 + age * 1.5);
      (pulse.current.material as THREE.MeshBasicMaterial).opacity = (1 - age / 1.4) * 0.55;
    }
  });
  return (
    <group position={[...checkpoint.position]} name={`MountainCP${checkpoint.id}`}>
      <RigidBody type="fixed" colliders={false} userData={{ mountainTrail: true }}>
        <CuboidCollider args={[7, 0.3, 6]} position={[0, -0.3, 0]} />
        <mesh receiveShadow position={[0, -0.3, 0]}>
          <boxGeometry args={[14, 0.6, 12]} />
          <meshStandardMaterial color="#a69b76" roughness={1} />
        </mesh>
      </RigidBody>
      <RigidBody
        type="fixed"
        colliders={false}
        userData={{ mountainCheckpoint: checkpoint.id, mountainTrail: true }}
      >
        <CylinderCollider args={[0.025, 2.35]} position={[0, 0.015, 0]} />
        <mesh receiveShadow position={[0, 0.015, 0]}>
          <cylinderGeometry args={[2.35, 2.35, 0.05, 32]} />
          <meshStandardMaterial color={active ? "#7ba86a" : "#d7c8a2"} />
        </mesh>
      </RigidBody>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.045, 0]}>
        <ringGeometry args={[2.05, 2.2, 40]} />
        <meshStandardMaterial
          color={active ? "#d9f4b8" : P.light}
          emissive={active ? "#79b75f" : "#000000"}
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh ref={pulse} visible={false} rotation-x={-Math.PI / 2} position={[0, 0.08, 0]}>
        <ringGeometry args={[1.95, 2.1, 40]} />
        <meshBasicMaterial color="#daffac" transparent depthWrite={false} />
      </mesh>
      <Text
        position={[0, 0.06, 0]}
        rotation-x={-Math.PI / 2}
        fontSize={0.8}
        color={active ? "#efffda" : "#6d6044"}
      >
        {active ? `CP ${checkpoint.id} ✓` : `CP ${checkpoint.id}`}
      </Text>
      <RestShelter theme={checkpoint.id} />
      <Lantern position={[-3.6, 0, 2.8]} active={active} />
      <Lantern position={[-3.6, 0, -2.8]} active={active} />
      <group position={[-4.3, 0, 0]}>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[0.15, 2.4, 0.15]} />
          <meshStandardMaterial color={P.dark} />
        </mesh>
        <mesh position={[0, 2.3, 0]}>
          <boxGeometry args={[3.6, 1, 0.18]} />
          <meshStandardMaterial color={P.dark} />
        </mesh>
        <Text position={[0, 2.45, 0.11]} fontSize={0.33} color={P.light}>
          {checkpoint.name.toUpperCase()}
        </Text>
        <Text position={[0, 2.06, 0.11]} fontSize={0.2} color={active ? "#d2f1a2" : "#ffd780"}>
          {active ? "Checkpoint aktif" : `CHECKPOINT ${checkpoint.id}`}
        </Text>
      </group>
    </group>
  );
}

function Basecamp() {
  return (
    <>
      <RigidBody type="fixed" colliders={false} userData={{ mountainTrail: true }}>
        <mesh receiveShadow position={[360, 7.63, 65]}>
          <boxGeometry args={[31, 0.7, 29]} />
          <meshStandardMaterial color="#b5a17b" roughness={1} />
        </mesh>
        <CuboidCollider args={[15.5, 0.35, 14.5]} position={[360, 7.63, 65]} />
      </RigidBody>
      <Helipad position={MOUNTAIN_HELIPAD.position} location="mountain" />
      <group position={[350, 8, 68]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[2.1, 1.5, 2]} position={[0, 1.5, 0]} />
          <mesh castShadow position={[0, 1.4, 0]}>
            <boxGeometry args={[4.2, 2.8, 4]} />
            <meshStandardMaterial color={P.wood} />
          </mesh>
        </RigidBody>
        <mesh castShadow position={[0, 3.25, 0]} rotation-y={Math.PI / 4}>
          <coneGeometry args={[3.65, 1.8, 4]} />
          <meshStandardMaterial color="#785b48" />
        </mesh>
        <mesh position={[0, 1.05, 2.015]}>
          <boxGeometry args={[1.1, 2.1, 0.06]} />
          <meshStandardMaterial color={P.dark} />
        </mesh>
        {[-1.3, 1.3].map((x) => (
          <mesh key={x} position={[x, 1.65, 2.025]}>
            <boxGeometry args={[0.78, 0.75, 0.07]} />
            <meshStandardMaterial color="#ffc97b" emissive="#ca8f49" emissiveIntensity={0.25} />
          </mesh>
        ))}
        <Text position={[0, 2.62, 2.05]} fontSize={0.35} color={P.light}>
          BASECAMP
        </Text>
      </group>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[370, 8, 58 + i * 6]}>
          <mesh castShadow position={[0, 1, 0]} rotation-y={Math.PI / 4}>
            <coneGeometry args={[2.15, 2, 4]} />
            <meshStandardMaterial color={i % 2 ? "#e1a854" : "#c77d45"} />
          </mesh>
          <mesh position={[0, 0.7, 1.08]} rotation-z={Math.PI / 4}>
            <planeGeometry args={[0.95, 0.95]} />
            <meshStandardMaterial color="#4e5d48" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <group position={[360, 8, 53]}>
        {[-3, 3].map((x) => (
          <mesh key={x} castShadow position={[x, 1.8, 0]}>
            <boxGeometry args={[0.3, 3.6, 0.3]} />
            <meshStandardMaterial color={P.dark} />
          </mesh>
        ))}
        <mesh position={[0, 3.5, 0]}>
          <boxGeometry args={[7, 0.85, 0.3]} />
          <meshStandardMaterial color={P.dark} />
        </mesh>
        <Text position={[0, 3.55, 0.18]} fontSize={0.45} color={P.light}>
          JALUR PENDAKIAN
        </Text>
        <Text position={[0, 3.18, 0.18]} fontSize={0.2} color="#ffcf72">
          4 POS · SATU PUNCAK
        </Text>
      </group>
      <Lantern position={[365, 8, 56]} />
      <Lantern position={[355, 8, 56]} />
    </>
  );
}

function Summit() {
  const complete = useMountain((s) => s.completed);
  return (
    <group position={[...MOUNTAIN_SUMMIT.position]} name="MountainSummit">
      <RigidBody
        type="fixed"
        colliders={false}
        userData={{ mountainCheckpoint: 5, mountainTrail: true }}
      >
        <CylinderCollider args={[0.3, 6]} position={[0, -0.26, 0]} />
        <mesh receiveShadow position={[0, -0.26, 0]}>
          <cylinderGeometry args={[6, 6.6, 0.6, 12]} />
          <meshStandardMaterial color="#b1b396" />
        </mesh>
      </RigidBody>
      <mesh castShadow position={[0, 2.4, -2.6]}>
        <cylinderGeometry args={[0.09, 0.12, 4.8, 10]} />
        <meshStandardMaterial color="#f7edce" />
      </mesh>
      <mesh position={[1.05, 4.17, -2.6]}>
        <boxGeometry args={[2.1, 0.68, 0.035]} />
        <meshStandardMaterial color="#e4473e" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1.05, 3.49, -2.6]}>
        <boxGeometry args={[2.1, 0.68, 0.035]} />
        <meshStandardMaterial color="#fff7e5" side={THREE.DoubleSide} />
      </mesh>
      <Text
        position={[0, 1.25, -1.9]}
        fontSize={0.65}
        color={P.light}
        outlineColor={P.dark}
        outlineWidth={0.045}
      >
        PUNCAK CUNG
      </Text>
      <Text
        position={[0, 0.7, -1.9]}
        fontSize={0.28}
        color={complete ? "#dcf6b5" : "#fff0bf"}
        outlineColor={P.dark}
        outlineWidth={0.025}
      >
        {complete ? "Pendakian selesai!" : "Selangkah lagi menuju puncak"}
      </Text>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.065, 0]}>
        <ringGeometry args={[2.1, 2.35, 40]} />
        <meshStandardMaterial color={complete ? "#bde99b" : P.gold} />
      </mesh>
      <Lantern position={[-4.4, 0, -1]} active={complete} />
      <Lantern position={[4.4, 0, -1]} active={complete} />
    </group>
  );
}

export function CityHelipad() {
  return (
    <group name="CityHelicopterDeparture">
      <Helipad position={CITY_HELIPAD.position} location="city" />
      <RigidBody type="fixed" colliders={false}>
        <mesh receiveShadow position={[67.5, -0.07, 49]}>
          <boxGeometry args={[4.5, 0.22, 4.2]} />
          <meshStandardMaterial color="#d9c9a9" roughness={1} />
        </mesh>
        <CuboidCollider args={[2.25, 0.11, 2.1]} position={[67.5, -0.07, 49]} />
      </RigidBody>
      <Lantern position={[66.7, 0.04, 46]} />
      <Lantern position={[66.7, 0.04, 52]} />
    </group>
  );
}

export function MountainScene() {
  return (
    <group name="PegununganCung">
      <Terrain />
      <Vegetation />
      {MOUNTAIN_TRAIL.slice(0, -1).map((_, i) => (
        <TrailSegment key={i} index={i} />
      ))}
      <Bridge />
      <Basecamp />
      {MOUNTAIN_CHECKPOINTS.map((checkpoint) => (
        <Checkpoint key={checkpoint.id} checkpoint={checkpoint} />
      ))}
      <Summit />
    </group>
  );
}
