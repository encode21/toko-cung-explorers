/** @jsxImportSource @/game/jsx */
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OutdoorPart } from "@/game/world/OutdoorBatch";
import { useRenderBudget } from "@/game/engine/AdaptiveQuality";
import { reducedMotion } from "@/game/vehicles/visual";
import { mountainSurfaceMaterial } from "./MountainMaterials";

export function MountainNatureBatch({
  items,
  geometry,
  wind = false,
  name,
  shadows = false,
  surface,
  distance = 0,
  minimumDistance = 0,
}: {
  items: OutdoorPart[];
  geometry: THREE.BufferGeometry;
  wind?: boolean;
  name: string;
  shadows?: boolean;
  surface?: "rock" | "bark";
  distance?: number;
  minimumDistance?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const nextCull = useRef(0);
  const instances = useMemo(() => {
    const object = new THREE.Object3D();
    return items.map((item) => {
      object.position.set(...item.p);
      object.scale.set(...item.s);
      object.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0);
      object.updateMatrix();
      return { matrix: object.matrix.clone(), color: new THREE.Color(item.color) };
    });
  }, [items]);
  const uniforms = useMemo(() => ({ time: { value: 0 }, strength: { value: 0 } }), []);
  const material = useMemo(() => {
    if (surface) return mountainSurfaceMaterial(surface, !!geometry.getAttribute("color"));
    const m = new THREE.MeshStandardMaterial({
      roughness: 1,
      side: THREE.DoubleSide,
      vertexColors: !!geometry.getAttribute("color"),
    });
    if (wind) {
      m.onBeforeCompile = (shader) => {
        shader.uniforms["natureTime"] = uniforms.time;
        shader.uniforms["natureStrength"] = uniforms.strength;
        shader.vertexShader =
          "uniform float natureTime; uniform float natureStrength;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nfloat phase=instanceMatrix[3].x*.71+instanceMatrix[3].z*.33;transformed.x+=sin(natureTime*1.8+phase)*natureStrength*min(position.y*position.y,2.0);",
        );
      };
      m.customProgramCacheKey = () => "mountain-foliage-wind-v2";
    }
    return m;
  }, [surface, geometry, wind, uniforms]);
  useEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => {
    const object = new THREE.Object3D(),
      color = new THREE.Color();
    items.forEach((p, i) => {
      object.position.set(...p.p);
      object.scale.set(...p.s);
      object.rotation.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
      object.updateMatrix();
      mesh.current!.setMatrixAt(i, object.matrix);
      mesh.current!.setColorAt(i, color.set(p.color));
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    if (mesh.current!.instanceColor) mesh.current!.instanceColor.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
  }, [items]);
  useFrame(({ clock, camera }) => {
    if (distance && mesh.current && clock.elapsedTime >= nextCull.current) {
      nextCull.current = clock.elapsedTime + 0.75;
      const range = distance * (useRenderBudget.getState().tier === "LOW" ? 0.65 : 1);
      let visible = 0;
      items.forEach((item, index) => {
        const separation = Math.hypot(item.p[0] - camera.position.x, item.p[2] - camera.position.z);
        if (
          separation > range ||
          separation < minimumDistance * (useRenderBudget.getState().tier === "LOW" ? 0.65 : 1)
        )
          return;
        mesh.current!.setMatrixAt(visible, instances[index]!.matrix);
        mesh.current!.setColorAt(visible, instances[index]!.color);
        visible++;
      });
      mesh.current.count = visible;
      mesh.current.instanceMatrix.needsUpdate = true;
      if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
      mesh.current.computeBoundingSphere();
    }
    uniforms.time.value = clock.elapsedTime;
    uniforms.strength.value = wind && !reducedMotion() ? 0.055 : 0;
  });
  return (
    <instancedMesh
      ref={mesh}
      name={name}
      args={[geometry, material, items.length]}
      castShadow={shadows}
      receiveShadow
      dispose={null}
    />
  );
}
