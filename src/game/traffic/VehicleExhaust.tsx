/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LOW_QUALITY } from "@/game/engine/quality";
import { useGame } from "@/state/game-store";
import { trafficVehicles } from "./traffic-runtime";

const CAPACITY = LOW_QUALITY ? 24 : 48;
/** One pooled draw call, world-space puffs only from nearby active tailpipes. */
export function VehicleExhaust() {
  const points = useRef<THREE.Points>(null);
  const pool = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const position = new Float32Array(CAPACITY * 3);
    const size = new Float32Array(CAPACITY);
    const opacity = new Float32Array(CAPACITY);
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      "puffSize",
      new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      "puffOpacity",
      new THREE.BufferAttribute(opacity, 1).setUsage(THREE.DynamicDrawUsage),
    );
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { pixelScale: { value: 300 } },
      vertexShader: `attribute float puffSize; attribute float puffOpacity;
        uniform float pixelScale; varying float alpha;
        void main() { vec4 p = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * p;
          gl_PointSize = clamp(puffSize * pixelScale / max(1.0, -p.z), 1.0, 64.0);
          alpha = puffOpacity; }`,
      fragmentShader: `varying float alpha;
        void main() { float r = length(gl_PointCoord - vec2(0.5));
          float fade = 1.0 - smoothstep(0.05, 0.5, r);
          if (fade * alpha < 0.002) discard;
          gl_FragColor = vec4(0.68, 0.70, 0.72, fade * alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    return {
      geometry,
      material,
      position,
      size,
      opacity,
      age: new Float32Array(CAPACITY).fill(2),
      vx: new Float32Array(CAPACITY),
      vz: new Float32Array(CAPACITY),
      cursor: 0,
      emission: 0,
    };
  }, []);
  useEffect(() => {
    const clear = () => {
      if (document.hidden) {
        pool.age.fill(2);
        pool.opacity.fill(0);
      }
    };
    document.addEventListener("visibilitychange", clear);
    return () => {
      document.removeEventListener("visibilitychange", clear);
      pool.geometry.dispose();
      pool.material.dispose();
    };
  }, [pool]);
  useFrame((state, raw) => {
    if (document.hidden) return;
    const dt = Math.min(raw, 0.1);
    const [x, , z] = useGame.getState().playerPos;
    pool.emission += dt;
    if (pool.emission >= 0.45) {
      pool.emission = 0;
      const nearby = [...trafficVehicles.values()]
        .filter((v) => Math.hypot(v.x - x, v.z - z) < (LOW_QUALITY ? 22 : 30))
        .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))
        .slice(0, LOW_QUALITY ? 4 : 6);
      for (const v of nearby) {
        const i = pool.cursor++ % CAPACITY;
        const tail = v.kind === "motorcycle" ? 0.9 : 2.12;
        const side = v.kind === "motorcycle" ? 0.24 : 0.58;
        pool.position[i * 3] = v.x - v.dx * tail + v.dz * side;
        pool.position[i * 3 + 1] = 0.28;
        pool.position[i * 3 + 2] = v.z - v.dz * tail - v.dx * side;
        pool.vx[i] = -v.dx * (0.18 + v.speed * 0.025);
        pool.vz[i] = -v.dz * (0.18 + v.speed * 0.025);
        pool.age[i] = 0;
      }
    }
    let active = 0;
    for (let i = 0; i < CAPACITY; i++) {
      pool.age[i] = pool.age[i]! + dt;
      const age = pool.age[i]!;
      if (age >= 1.3) {
        pool.opacity[i] = 0;
        continue;
      }
      active++;
      pool.position[i * 3] = pool.position[i * 3]! + pool.vx[i]! * dt;
      pool.position[i * 3 + 1] = pool.position[i * 3 + 1]! + 0.18 * dt;
      pool.position[i * 3 + 2] = pool.position[i * 3 + 2]! + pool.vz[i]! * dt;
      pool.size[i] = 0.18 + age * 0.42;
      pool.opacity[i] = Math.min(1, age / 0.12) * (1 - age / 1.3) * 0.12;
    }
    for (const key of ["position", "puffSize", "puffOpacity"])
      pool.geometry.attributes[key]!.needsUpdate = true;
    pool.material.uniforms["pixelScale"]!.value =
      state.size.height * state.gl.getPixelRatio() * 0.75;
    if (points.current) points.current.visible = active > 0;
  });
  return (
    <points
      ref={points}
      name="VehicleExhaust"
      geometry={pool.geometry}
      material={pool.material}
      frustumCulled={false}
      userData={{ ignoreCameraCollision: true }}
    />
  );
}
