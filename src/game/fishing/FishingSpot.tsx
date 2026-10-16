/** @jsxImportSource @/game/jsx */
import { useRef, useMemo, useEffect } from "react";
import { Text, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as T from "three";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { useGame } from "@/state/game-store";
import { fishingNow, useFishing } from "./store";
import { fishingPhase } from "./model";

const box = (p: OutdoorPart["p"], s: OutdoorPart["s"], color: string): OutdoorPart => ({
  p,
  s,
  color,
});
// Empty northeast parcel: beyond obby z=-30.3, east of the rear road ending at x=22.
const parts: OutdoorPart[] = [
  box([30.6, 0.006, -34], [10.4, 0.015, 1.6], "#e8d7aa"),
  box([35, 0.008, -35.3], [2.4, 0.015, 2.6], "#e8d7aa"),
  ...Array.from({ length: 13 }, (_, i) =>
    box([26.2, 0.125, -9 - i * 2], [0.3, 0.015, 0.6], "#39bedc"),
  ),
  ...Array.from({ length: 4 }, (_, i) =>
    box([28 + i * 2, 0.02, -34], [0.65, 0.02, 0.3], "#39bedc"),
  ),
  ...Array.from({ length: 12 }, (_, i) =>
    box([35, 0.1, -37.8 - i * 0.36], [5, 0.2, 0.32], i % 2 ? "#bd8d63" : "#cea276"),
  ),
  ...[32.55, 37.45].flatMap((x) => [
    ...[-38.1, -40, -42].map((z) => box([x, 0.6, z], [0.14, 1.2, 0.14], "#79584d")),
    box([x, 0.95, -40], [0.12, 0.13, 4.2], "#ffe1a3"),
  ]),
  box([35, 0.95, -42.05], [5, 0.13, 0.12], "#ffe1a3"),
  ...[38.5, 40.1].map((x) => box([x, 0.55, -33.3], [0.12, 1.1, 0.16], "#79584d")),
  box([39.3, 0.18, -33.3], [1.8, 0.18, 0.65], "#cea276"),
  box([39.3, 0.86, -33.3], [1.8, 0.14, 0.16], "#79584d"),
  ...[38.9, 39.7].map((x, i) =>
    box([x, 1.1, -33.3], [0.055, 2.1, 0.055], i ? "#225e71" : "#a07342"),
  ),
  box([39.4, 1.35, -35], [0.18, 2.7, 0.18], "#79584d"),
  box([39.4, 2.6, -35], [4.4, 1.05, 0.16], "#39bedc"),
  box([39.4, 3.2, -35], [4.7, 0.16, 0.25], "#ffb546"),
  box([27.5, 1.4, -8.8], [0.14, 2.8, 0.14], "#79584d"),
  box([27.5, 2.7, -8.8], [2.3, 0.85, 0.12], "#39bedc"),
];
const reeds = Array.from({ length: 32 }, (_, i) => {
  const angle = (i / 32) * Math.PI * 2;
  return box(
    [42 + Math.cos(angle) * 10.4, 0.42, -45 + Math.sin(angle) * 8],
    [0.12, 0.8 + (i % 3) * 0.13, 0.12],
    i % 2 ? "#87b66c" : "#c8cb6e",
  );
}).filter((p) => p.p[0] > 38 || p.p[2] < -43);
const lilies = [
  [39, -47],
  [40, -49],
  [45, -43],
  [48, -47],
  [44, -51],
].map(([x, z]) => box([x!, 0.05, z!], [0.9, 0.035, 0.72], "#8aba74"));
const stones = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  return box(
    [42 + Math.cos(angle) * 10.9, 0.16, -45 + Math.sin(angle) * 8.5],
    [1.1, 0.42, 0.75],
    i % 2 ? "#d7d5b5" : "#abc4b7",
  );
}).filter((p) => p.p[0] > 38 || p.p[2] < -43);

function FishingTackle() {
  const data = useFishing((s) => s.data);
  const open = useFishing((s) => s.open);
  const castClock = useRef({ id: "", started: 0 });
  const group = useRef<T.Group>(null),
    bobber = useRef<T.Mesh>(null);
  const lineGeometry = useMemo(
    () => new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
    [],
  );
  const line = useMemo(
    () => new T.Line(lineGeometry, new T.LineBasicMaterial({ color: "#397780" })),
    [lineGeometry],
  );
  // Resources are per venue, not allocated during a frame or a cast.
  useFrame(({ clock }) => {
    if (!group.current || !bobber.current) return;
    const state = useFishing.getState();
    const cast = state.data?.cast ?? null;
    const phase = fishingPhase(cast, fishingNow());
    group.current.visible = state.open && !!cast && (phase === "waiting" || phase === "bite");
    if (!group.current.visible) return;
    const p = useGame.getState().playerPos;
    group.current.position.set(p[0], p[1] - 0.83, p[2]);
    if (castClock.current.id !== cast!.id)
      castClock.current = { id: cast!.id, started: performance.now() };
    const castProgress = Math.min(1, (performance.now() - castClock.current.started) / 350);
    const bobY =
      phase === "bite"
        ? 0.05 + Math.sin(clock.elapsedTime * 16) * 0.075
        : 0.1 + Math.sin(clock.elapsedTime * 3) * 0.025;
    bobber.current.position.set(
      0.45,
      bobY - group.current.position.y + Math.sin(castProgress * Math.PI) * 1.4,
      -1.7 - castProgress * 3.1,
    );
    const vertices = lineGeometry.attributes["position"] as T.BufferAttribute;
    vertices.setXYZ(0, 0.45, 2.915, -1.747);
    vertices.setXYZ(1, ...bobber.current.position.toArray());
    vertices.needsUpdate = true;
    lineGeometry.computeBoundingSphere();
  });
  // Dispose when leaving the outdoor world.
  useTackleCleanup(lineGeometry, line);
  return (
    <group name="FishingTackle" ref={group} visible={open && !!data?.cast}>
      <group position={[0.45, 1.8, -0.9]} rotation={[-0.65, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.03, 0.045, 2.8, 6]} />
          <meshStandardMaterial color={data?.cast?.rodId === "river" ? "#225e71" : "#a07342"} />
        </mesh>
        <mesh position={[0, -0.85, 0.06]}>
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshStandardMaterial color="#79584d" />
        </mesh>
      </group>
      <primitive object={line} />
      <mesh ref={bobber}>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshStandardMaterial color="#ff965d" />
      </mesh>
    </group>
  );
}
function useTackleCleanup(
  geometry: T.BufferGeometry,
  line: T.Line<T.BufferGeometry, T.LineBasicMaterial>,
) {
  useEffect(
    () => () => {
      geometry.dispose();
      line.material.dispose();
    },
    [geometry, line],
  );
}

export function FishingSpot() {
  return (
    <group>
      <OutdoorBatch items={parts} />
      <OutdoorBatch items={reeds} />
      <OutdoorBatch items={lilies} shape="round" shadows={false} />
      <OutdoorBatch items={stones} shape="foliage" />
      {/* Shallow decorative water rests on existing terrain; no hidden hole or swimming controller. */}
      <mesh position={[42, 0.025, -45]} rotation={[-Math.PI / 2, 0, 0]} scale={[11, 8.5, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#59cbd2" roughness={0.4} />
      </mesh>
      {[-2, 0, 2].map((offset) => (
        <Line
          key={offset}
          points={[
            [40 + offset, 0.035, -45],
            [41 + offset, 0.035, -45.2],
            [42 + offset, 0.035, -45],
          ]}
          color="#b6f3e4"
          lineWidth={1.5}
        />
      ))}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[2.5, 0.1, 2.2]} position={[35, 0.1, -39.9]} />
        {[32.55, 37.45].map((x) => (
          <CuboidCollider key={x} args={[0.07, 0.48, 2.1]} position={[x, 0.65, -40]} />
        ))}
        <CuboidCollider args={[2.5, 0.48, 0.07]} position={[35, 0.65, -42.05]} />
        <CuboidCollider
          args={[1.2, 0.04, 1.5]}
          position={[35, 0.08, -36.3]}
          rotation={[Math.atan(0.2 / 3), 0, 0]}
        />
      </RigidBody>
      <mesh position={[35, 0.08, -36.3]} rotation={[Math.atan(0.2 / 3), 0, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.08, 3]} />
        <meshStandardMaterial color="#cea276" />
      </mesh>
      <Text position={[39.4, 2.67, -34.9]} fontSize={0.47} color="#134e63" anchorX="center">
        Fishing Spot
      </Text>
      <Text position={[39.4, 2.24, -34.9]} fontSize={0.18} color="#134e63">
        DERMAGA CUNG · PILIH PANCING & LEMPAR
      </Text>
      <Text position={[27.5, 2.78, -8.72]} fontSize={0.25} color="#134e63">
        ↑ Fishing Spot
      </Text>
      <Text position={[27.5, 2.42, -8.72]} fontSize={0.16} color="#134e63">
        Ikuti jalur biru
      </Text>
      <Text
        position={[35, 0.215, -40]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.26}
        color="#fff7d9"
      >
        MANCING DI SINI
      </Text>
      <mesh position={[35, 0.211, -40]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1, 32]} />
        <meshBasicMaterial color="#ffe1a3" />
      </mesh>
      <FishingTackle />
    </group>
  );
}
