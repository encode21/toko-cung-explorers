/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  MathUtils,
  Object3D,
  PlaneGeometry,
  Vector3,
} from "three";
import { selectBudgetLow, useRenderBudget } from "@/game/engine/AdaptiveQuality";
import { useOwnedInstancedMesh } from "@/game/engine/use-owned-instanced-mesh";
import { useGame } from "@/state/game-store";
import { floodSurfaceAtLocal } from "./flood-surface";
import { currentWeather } from "./store";

const MAX_IMPACTS = 88;
const LOW_IMPACTS = 34;
const IMPACT_RANGE = 12;
const FALL_PHASE = 0.24;

const vertexShader = `
  attribute vec3 impactData;
  varying vec3 vImpact;
  varying vec2 vUv;
  void main() {
    vImpact = impactData;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = `
  uniform vec3 tint;
  varying vec3 vImpact;
  varying vec2 vUv;
  void main() {
    vec2 point = (vUv - 0.5) * 2.0;
    float shape;
    if (vImpact.x > 0.5) {
      shape = (1.0 - smoothstep(0.05, 0.87, abs(point.x)))
        * smoothstep(0.0, 0.19, vUv.y) * (1.0 - vUv.y * 0.78);
    } else {
      float radius = length(point);
      float outer = 1.0 - smoothstep(0.03, 0.13, abs(radius - 0.78));
      float inner = 1.0 - smoothstep(0.025, 0.10, abs(radius - 0.49));
      float strike = (1.0 - smoothstep(0.10, 0.34, radius))
        * (1.0 - smoothstep(0.0, 0.23, vImpact.z));
      shape = max(strike, outer * 0.92 + inner * 0.42);
    }
    float alpha = shape * vImpact.y;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(tint, alpha);
    #include <colorspace_fragment>
  }
`;

/** Only sample impacts around the player and reuse the same quad for the falling drop and its ripples. */
export function FloodRainImpacts({ width, from, to }: { width: number; from: number; to: number }) {
  const low = useRenderBudget(selectBudgetLow);
  const [mesh, attach] = useOwnedInstancedMesh();
  const reducedMotion = useRef(false);
  const previousCount = useRef(0);
  const slots = useMemo(
    () =>
      Array.from({ length: MAX_IMPACTS }, () => ({
        x: 0,
        z: 0,
        phase: 0,
        pace: 0.9 + Math.random() * 0.8,
        placed: false,
      })),
    [],
  );
  const { geometry, impactData, point, center, previous } = useMemo(() => {
    const geometry = new PlaneGeometry(1, 1);
    const impactData = new InstancedBufferAttribute(new Float32Array(MAX_IMPACTS * 3), 3);
    impactData.setUsage(DynamicDrawUsage);
    geometry.setAttribute("impactData", impactData);
    return {
      geometry,
      impactData,
      point: new Object3D(),
      center: new Vector3(),
      previous: new Vector3(),
    };
  }, []);
  const uniforms = useMemo(() => ({ tint: { value: new Color("#e3f4ef") } }), []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => (reducedMotion.current = media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useFrame(({ camera }, delta) => {
    const batch = mesh.current;
    if (!batch) return;
    const { rain, flood } = currentWeather();
    const strength = MathUtils.smoothstep(rain, 0.04, 1) * MathUtils.smoothstep(flood, 0.02, 0.3);
    const count = reducedMotion.current
      ? 0
      : Math.round(strength * (low ? LOW_IMPACTS : MAX_IMPACTS));
    if (count === 0) {
      batch.visible = false;
      batch.count = 0;
      previousCount.current = 0;
      return;
    }

    const [x, , z] = useGame.getState().playerPos;
    batch.worldToLocal(center.set(x, 0, z));
    const reset = center.distanceToSquared(previous) > IMPACT_RANGE ** 2;
    previous.copy(center);
    const rotate = Math.atan2(camera.position.x - x, camera.position.z - z);
    const step = Math.min(delta, 0.07);
    let drawn = 0;
    for (let index = 0; index < count; index++) {
      const impact = slots[index]!;
      const newSlot = reset || index >= previousCount.current;
      impact.phase += step * impact.pace;
      if (newSlot || impact.phase >= 1) {
        impact.phase = newSlot ? Math.random() : impact.phase % 1;
        impact.placed = false;
        for (let attempt = 0; attempt < 4; attempt++) {
          impact.x = center.x + (Math.random() * 2 - 1) * IMPACT_RANGE;
          impact.z = center.z + (Math.random() * 2 - 1) * IMPACT_RANGE;
          if (floodSurfaceAtLocal(impact.x, impact.z, width, from, to, flood) !== null) {
            impact.placed = true;
            break;
          }
        }
      }
      if (!impact.placed) continue;
      const surface = floodSurfaceAtLocal(impact.x, impact.z, width, from, to, flood);
      if (surface === null) continue;
      if (impact.phase < FALL_PHASE) {
        const falling = impact.phase / FALL_PHASE;
        const length = 0.28 + falling * 0.21;
        point.position.set(impact.x, surface + length / 2 + (1 - falling) * 2.2, impact.z);
        point.rotation.set(0, rotate, 0);
        point.scale.set(0.038, length, 1);
        impactData.setXYZ(drawn, 1, strength * 0.72 * Math.min(1, falling * 4), falling);
      } else {
        const age = (impact.phase - FALL_PHASE) / (1 - FALL_PHASE);
        const diameter = 0.15 + age * 0.65;
        point.position.set(impact.x, surface + 0.016, impact.z);
        point.rotation.set(-Math.PI / 2, 0, 0);
        point.scale.set(diameter, diameter, 1);
        impactData.setXYZ(drawn, 0, strength * 0.8 * (1 - age) ** 1.4, age);
      }
      point.updateMatrix();
      batch.setMatrixAt(drawn++, point.matrix);
    }
    previousCount.current = count;
    batch.count = drawn;
    batch.visible = drawn > 0;
    batch.instanceMatrix.needsUpdate = true;
    impactData.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={attach}
      name="KampungFloodRainImpacts"
      args={[undefined, undefined, MAX_IMPACTS]}
      geometry={geometry}
      frustumCulled={false}
      visible={false}
      renderOrder={3}
      raycast={() => {}}
    >
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={DoubleSide}
      />
    </instancedMesh>
  );
}
