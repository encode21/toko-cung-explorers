/** @jsxImportSource @/game/jsx */
import { useRef, useMemo, useEffect } from "react";
import { Text, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as T from "three";
import { OutdoorBatch, type OutdoorPart } from "@/game/world/OutdoorBatch";
import { useGame } from "@/state/game-store";
import { fishingNow, useFishing } from "./store";
import { fishingPhase, TIER_COLORS, CATCH_REVEAL_MS, catchRevealing } from "./model";
import { FISHING_WATER } from "@/game/swimming/model";

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
  const reelClock = useRef<number | null>(null);
  const rod = useRef<T.Group>(null),
    fish = useRef<T.Group>(null),
    ripple = useRef<T.Mesh>(null);
  const reducedMotion = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotion.current = query.matches;
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const group = useRef<T.Group>(null),
    bobber = useRef<T.Mesh>(null);
  const lineGeometry = useMemo(
    () => new T.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => new T.Vector3())),
    [],
  );
  const line = useMemo(
    () => new T.Line(lineGeometry, new T.LineBasicMaterial({ color: "#fff4d3" })),
    [lineGeometry],
  );
  // Resources are per venue, not allocated during a frame or a cast.
  useFrame(({ clock }) => {
    if (!group.current || !bobber.current) return;
    const state = useFishing.getState();
    const cast = state.data?.cast ?? null;
    const phase = fishingPhase(cast, fishingNow());
    const revealing = catchRevealing(state.revealStarted, performance.now());
    const reeling = state.busy && state.pending?.action === "reel";
    if (reeling && reelClock.current === null) reelClock.current = performance.now();
    if (!reeling) reelClock.current = null;
    group.current.visible =
      state.open && !!cast && (phase === "waiting" || phase === "bite" || reeling || revealing);
    if (!group.current.visible) return;
    const p = useGame.getState().playerPos;
    group.current.position.set(p[0], p[1] - 0.83, p[2]);
    if (castClock.current.id !== cast!.id)
      castClock.current = { id: cast!.id, started: performance.now() };
    const castProgress = Math.min(1, (performance.now() - castClock.current.started) / 350);
    const reveal = revealing ? (performance.now() - state.revealStarted!) / CATCH_REVEAL_MS : 0;
    const pull = revealing
      ? Math.min(1, reveal / 0.45)
      : reeling
        ? Math.min(0.7, (performance.now() - reelClock.current!) / 650)
        : 0;
    const shake =
      phase === "bite" && !reducedMotion.current && !reeling
        ? Math.sin(clock.elapsedTime * 22) * 0.045
        : 0;
    const angle = -0.65 + pull * 0.55 + shake;
    if (rod.current) rod.current.rotation.x = angle;
    const waterY = FISHING_WATER.surface - group.current.position.y;
    bobber.current.position.set(
      0.45 + shake,
      waterY +
        0.1 +
        Math.sin(clock.elapsedTime * (phase === "bite" ? 16 : 3)) *
          (phase === "bite" ? 0.075 : 0.025) +
        Math.sin(castProgress * Math.PI) * 1.4 +
        pull * 1.7 +
        (revealing ? Math.sin(pull * Math.PI) * 1.2 : 0),
      -1.7 - castProgress * 3.1 + pull * 4,
    );
    bobber.current.visible = !revealing;
    if (fish.current) {
      fish.current.visible = revealing;
      fish.current.position.copy(bobber.current.position);
      fish.current.rotation.set(
        0,
        0.25,
        reducedMotion.current ? 0 : Math.sin(clock.elapsedTime * 18) * 0.15,
      );
      // After showing the fish, tuck it toward the player's bag and fade by scaling down.
      const stored = Math.max(0, (reveal - 0.76) / 0.24);
      fish.current.position.y -= stored * 0.8;
      fish.current.position.z += stored * 0.8;
      fish.current.scale.setScalar(Math.max(0.001, 1 - stored));
    }
    if (ripple.current) {
      ripple.current.visible = phase === "bite" || (revealing && reveal < 0.45);
      ripple.current.position.set(0.45, waterY + 0.025, -4.8);
      ripple.current.scale.setScalar(
        revealing ? 1 + pull * 2 : 1 + Math.sin(clock.elapsedTime * 6) * 0.18,
      );
    }
    const vertices = lineGeometry.attributes["position"] as T.BufferAttribute;
    const tipY = 1.8 + Math.cos(angle) * 1.4,
      tipZ = -0.9 + Math.sin(angle) * 1.4;
    for (let i = 0; i < vertices.count; i++) {
      const t = i / (vertices.count - 1);
      vertices.setXYZ(
        i,
        0.45 + shake * t,
        T.MathUtils.lerp(tipY, bobber.current.position.y, t) -
          Math.sin(t * Math.PI) * (pull ? 0.03 : 0.2),
        T.MathUtils.lerp(tipZ, bobber.current.position.z, t),
      );
    }
    line.visible = !revealing || reveal < 0.76;
    vertices.needsUpdate = true;
    lineGeometry.computeBoundingSphere();
  });
  // Dispose when leaving the outdoor world.
  useTackleCleanup(lineGeometry, line);
  return (
    <group name="FishingTackle" ref={group} visible={open && !!data?.cast}>
      <group ref={rod} position={[0.45, 1.8, -0.9]} rotation={[-0.65, 0, 0]}>
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
      <group name="CaughtFish" ref={fish} visible={false}>
        <mesh scale={[0.48, 0.22, 0.16]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={TIER_COLORS[data?.catch?.tier ?? "Basic"]} />
        </mesh>
        <mesh position={[-0.48, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.4]}>
          <coneGeometry args={[0.24, 0.35, 3]} />
          <meshStandardMaterial color={TIER_COLORS[data?.catch?.tier ?? "Basic"]} />
        </mesh>
        <mesh position={[0.29, 0.07, 0.13]}>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshBasicMaterial color="#fffef5" />
        </mesh>
        <mesh position={[0.31, 0.07, 0.17]}>
          <sphereGeometry args={[0.028, 8, 6]} />
          <meshBasicMaterial color="#34312e" />
        </mesh>
      </group>
      <mesh ref={ripple} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.34, 0.39, 32]} />
        <meshBasicMaterial color="#dcf8ec" transparent opacity={0.7} depthWrite={false} />
      </mesh>
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
      {/* Shared water registry drives this surface, carved bed, and swimming depth. */}
      <mesh
        position={[FISHING_WATER.x, FISHING_WATER.surface, FISHING_WATER.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[FISHING_WATER.rx, FISHING_WATER.rz, 1]}
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial
          color="#59cbd2"
          roughness={0.4}
          transparent
          opacity={0.72}
          depthWrite={false}
        />
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
