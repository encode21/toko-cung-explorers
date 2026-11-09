/** @jsxImportSource @/game/jsx */
import { useChannels } from "@/net/channel-store";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { takeSplashes, clearSplashes } from "./splash-pool";
import { playCue } from "../audio/sound-palette";
import { reducedMotion } from "../vehicles/visual";
import { useRenderBudget } from "../engine/AdaptiveQuality";
const MAX_DROPS = 64,
  MAX_RINGS = 12;
export function WaterEffects() {
  const room = useChannels((s) => s.lease?.channel);
  const drops = useRef<T.InstancedMesh>(null),
    rings = useRef<T.InstancedMesh>(null);
  const state = useMemo(
    () => ({
      drops: Array.from({ length: MAX_DROPS }, () => ({
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vz: 0,
        age: 2,
        strength: 1,
      })),
      rings: Array.from({ length: MAX_RINGS }, () => ({ x: 0, y: 0, z: 0, age: 2, strength: 1 })),
      drop: 0,
      ring: 0,
      soundAt: 0,
      o: new T.Object3D(),
      color: new T.Color(),
      foam: new T.Color("#d8f5e8"),
      water: new T.Color("#78bfc2"),
    }),
    [],
  );
  useEffect(() => {
    clearSplashes();
    for (const p of [...state.drops, ...state.rings]) p.age = 2;
    return clearSplashes;
  }, [room, state]);
  useFrame(({ camera, clock }, rawDt) => {
    if (!drops.current || !rings.current) return;
    const dt = Math.min(rawDt, 0.05),
      low = useRenderBudget.getState().tier === "LOW",
      reduced = reducedMotion();
    for (const e of takeSplashes()) {
      const distance = Math.hypot(
        camera.position.x - e.x,
        camera.position.y - e.y,
        camera.position.z - e.z,
      );
      if (distance > 32) continue;
      Object.assign(state.rings[state.ring++ % MAX_RINGS]!, e, { age: 0 });
      if (!reduced)
        for (let i = 0; i < (low ? 4 : 7); i++) {
          const angle = i * 2.4 + state.drop * 0.7;
          Object.assign(state.drops[state.drop++ % (low ? 32 : MAX_DROPS)]!, e, {
            age: 0,
            vx: Math.cos(angle) * e.strength,
            vz: Math.sin(angle) * e.strength,
          });
        }
      if (clock.elapsedTime > state.soundAt) {
        playCue("splash", (1 - distance / 32) * Math.min(1, e.strength));
        state.soundAt = clock.elapsedTime + 0.22;
      }
    }
    let liveDrops = 0,
      liveRings = 0;
    for (const p of state.drops) {
      p.age += dt;
      if (p.age > 0.65 || reduced) continue;
      const t = p.age / 0.65;
      state.o.position.set(
        p.x + p.vx * p.age,
        p.y + Math.sin(t * Math.PI) * 0.35 * p.strength,
        p.z + p.vz * p.age,
      );
      state.o.rotation.set(0, 0, 0);
      state.o.scale.setScalar(0.055 * p.strength * (1 - t));
      state.o.updateMatrix();
      drops.current.setMatrixAt(liveDrops++, state.o.matrix);
    }
    for (const p of state.rings) {
      p.age += dt;
      if (p.age > 0.85) continue;
      const t = p.age / 0.85;
      state.o.position.set(p.x, p.y, p.z);
      state.o.rotation.set(-Math.PI / 2, 0, 0);
      state.o.scale.setScalar(0.18 + t * 0.75 * p.strength);
      state.o.updateMatrix();
      rings.current.setMatrixAt(liveRings, state.o.matrix);
      rings.current.setColorAt(liveRings++, state.color.copy(state.foam).lerp(state.water, t));
    }
    drops.current.count = liveDrops;
    rings.current.count = liveRings;
    drops.current.instanceMatrix.needsUpdate = rings.current.instanceMatrix.needsUpdate = true;
    if (rings.current.instanceColor) rings.current.instanceColor.needsUpdate = true;
  });
  return (
    <group name="WaterContactPool">
      <instancedMesh
        ref={drops}
        args={[undefined, undefined, MAX_DROPS]}
        frustumCulled={false}
        raycast={() => {}}
      >
        <sphereGeometry args={[1, 5, 4]} />
        <meshBasicMaterial color="#dbf8ed" transparent opacity={0.8} depthWrite={false} />
      </instancedMesh>
      <instancedMesh
        ref={rings}
        args={[undefined, undefined, MAX_RINGS]}
        frustumCulled={false}
        raycast={() => {}}
      >
        <ringGeometry args={[0.88, 1, 20]} />
        <meshBasicMaterial transparent opacity={0.38} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
