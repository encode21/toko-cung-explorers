/** @jsxImportSource @/game/jsx */
import { emitSplash } from "../swimming/splash-pool";
import { useRef, useMemo, useEffect } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { useGame } from "@/state/game-store";
import { FishModel } from "./FishModel";
import { fishingNow, useFishing } from "./store";
import { fishingPhase, TIER_COLORS, CATCH_REVEAL_MS, catchRevealing } from "./model";
import { BEACH, waterAt } from "@/game/swimming/model";
import { FISHING_SPOT } from "./model";
import { FishingPier } from "./FishingPier";

function FishingTackle() {
  const data = useFishing((s) => s.data);
  const open = useFishing((s) => s.open);
  const splash = useRef({ key: "", point: new T.Vector3() });
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
    const waterY =
      (waterAt(p[0] + 0.45, p[2] - 4.8)?.surface ?? BEACH.surface) - group.current.position.y;
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
    const splashKey = cast!.id + ":" + (revealing ? "catch" : phase);
    if ((phase === "bite" || revealing) && splash.current.key !== splashKey) {
      splash.current.key = splashKey;
      group.current.localToWorld(splash.current.point.set(0.45, waterY, -4.8));
      emitSplash(splash.current.point.x, splash.current.point.z, revealing ? 1.15 : 0.45);
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
        <FishModel
          fishId={data?.catch?.fishId}
          sizeCm={data?.catch?.sizeCm ?? 20}
          glow={TIER_COLORS[data?.catch?.tier ?? "Basic"]}
        />
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
    <group name="FishingSpot">
      <FishingPier />
      <group position={FISHING_SPOT}>
        <Text
          position={[0, 0.015, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.26}
          color="#fff7d9"
        >
          MANCING DI SINI
        </Text>
        <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.85, 1, 32]} />
          <meshBasicMaterial color="#ffe1a3" />
        </mesh>
      </group>
      <FishingTackle />
    </group>
  );
}
