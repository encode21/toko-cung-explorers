/** @jsxImportSource @/game/jsx */
import { useChannels } from "@/net/channel-store";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { takeSplashes, clearSplashes } from "./splash-pool";
import { playCue, preloadWaterSounds } from "../audio/sound-palette";
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
  const ringVisual = useMemo(() => {
    const geometry = new T.RingGeometry(0.9, 1, 32);
    const fade = new T.InstancedBufferAttribute(new Float32Array(MAX_RINGS), 1);
    fade.setUsage(T.DynamicDrawUsage);
    geometry.setAttribute("splashOpacity", fade);
    const material = new T.MeshBasicMaterial({
      color: "#d8f5e8",
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "attribute float splashOpacity; varying float splashFade;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nsplashFade=splashOpacity;",
      );
      shader.fragmentShader = "varying float splashFade;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.a*=splashFade;",
      );
    };
    return { geometry, material, fade };
  }, []);
  useEffect(() => {
    preloadWaterSounds();
    return () => {
      ringVisual.geometry.dispose();
      ringVisual.material.dispose();
    };
  }, [ringVisual]);
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
      if (e.kind === "plunge")
        Object.assign(state.rings[state.ring++ % MAX_RINGS]!, e, {
          age: -0.14,
          strength: e.strength * 0.75,
        });
      if (!reduced)
        for (let i = 0; i < (e.kind === "plunge" ? (low ? 8 : 14) : low ? 3 : 5); i++) {
          const angle = i * 2.4 + state.drop * 0.7;
          Object.assign(state.drops[state.drop++ % (low ? 32 : MAX_DROPS)]!, e, {
            age: 0,
            vx: Math.cos(angle) * e.strength,
            vz: Math.sin(angle) * e.strength,
          });
        }
      if (e.kind === "entry" || e.kind === "plunge" || clock.elapsedTime > state.soundAt) {
        playCue(
          e.kind === "plunge" ? "water-plunge" : e.kind === "ripple" ? "splash" : "water-entry",
          (1 - distance / 32) * Math.min(1, e.strength),
        );
        state.soundAt = clock.elapsedTime + 0.22;
      }
    }
    let liveDrops = 0,
      liveRings = 0;
    for (const p of state.drops) {
      p.age += dt;
      const rise = p.age * 2.8 * p.strength - 4.9 * p.age * p.age;
      if (p.age > 0.85 || rise < 0 || reduced) continue;
      const t = p.age / 0.85;
      state.o.position.set(p.x + p.vx * p.age, p.y + rise, p.z + p.vz * p.age);
      state.o.rotation.set(0, 0, 0);
      const size = 0.045 * p.strength * Math.max(0, 1 - t);
      state.o.scale.set(size, size * 1.5, size);
      state.o.updateMatrix();
      drops.current.setMatrixAt(liveDrops++, state.o.matrix);
    }
    for (const p of state.rings) {
      p.age += dt;
      if (p.age < 0 || p.age > 1.2) continue;
      const t = p.age / 1.2;
      state.o.position.set(p.x, p.y, p.z);
      state.o.rotation.set(-Math.PI / 2, 0, 0);
      state.o.scale.setScalar(0.18 + t * 1.35 * p.strength);
      state.o.updateMatrix();
      rings.current.setMatrixAt(liveRings, state.o.matrix);
      ringVisual.fade.setX(liveRings, (1 - t) * (1 - t));
      rings.current.setColorAt(liveRings++, state.color.copy(state.foam).lerp(state.water, t));
    }
    drops.current.count = liveDrops;
    rings.current.count = liveRings;
    drops.current.instanceMatrix.needsUpdate = rings.current.instanceMatrix.needsUpdate = true;
    if (rings.current.instanceColor) rings.current.instanceColor.needsUpdate = true;
    ringVisual.fade.needsUpdate = true;
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
        args={[ringVisual.geometry, ringVisual.material, MAX_RINGS]}
        frustumCulled={false}
        raycast={() => {}}
      />
    </group>
  );
}
