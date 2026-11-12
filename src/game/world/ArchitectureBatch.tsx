/** @jsxImportSource @/game/jsx */
import { useLayoutEffect, useRef } from "react";
import { BoxGeometry, Color, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import type { OutdoorPart } from "./OutdoorBatch";

const geometry = new BoxGeometry(1, 1, 1);
const wallMaterial = new MeshStandardMaterial({ roughness: 0.96 });
const trimMaterial = new MeshStandardMaterial({ roughness: 0.76, metalness: 0.12 });
const glazingMaterial = new MeshStandardMaterial({ roughness: 0.23, metalness: 0.3 });
wallMaterial.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vWallPosition;")
    .replace(
      "#include <project_vertex>",
      `vec4 wallPoint = vec4(transformed, 1.0);
     #ifdef USE_INSTANCING
       wallPoint = instanceMatrix * wallPoint;
     #endif
     vWallPosition = (modelMatrix * wallPoint).xyz;
     #include <project_vertex>`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
     varying vec3 vWallPosition;
     float wallHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
     float wallNoise(vec2 p) {
       vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
       return mix(mix(wallHash(i),wallHash(i+vec2(1.,0.)),f.x),
                  mix(wallHash(i+vec2(0.,1.)),wallHash(i+vec2(1.,1.)),f.x),f.y);
     }`,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
     vec2 wallUV=vec2(vWallPosition.x+vWallPosition.z, vWallPosition.y);
     float plaster=wallNoise(wallUV*9.0);
     float stains=wallNoise(wallUV*vec2(4.0,0.65));
     float damp=exp(-max(0.0,vWallPosition.y)*2.1);
     diffuseColor.rgb *= 0.88 + 0.12*plaster - 0.09*smoothstep(0.58,0.87,stains) - damp*0.1;`,
    );
};
wallMaterial.customProgramCacheKey = () => "city-plaster-v1";

/** Shared geometry/materials retain a small draw-call budget even with dense facades. */
export function ArchitectureBatch({
  items,
  surface,
}: {
  items: OutdoorPart[];
  surface: "masonry" | "trim" | "glazing";
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const transform = new Object3D(),
      color = new Color();
    items.forEach((part, index) => {
      transform.position.set(...part.p);
      transform.scale.set(...part.s);
      transform.rotation.set(part.rx ?? 0, part.ry ?? 0, part.rz ?? 0);
      transform.updateMatrix();
      ref.current!.setMatrixAt(index, transform.matrix);
      ref.current!.setColorAt(index, color.set(part.color));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[
        geometry,
        surface === "masonry" ? wallMaterial : surface === "trim" ? trimMaterial : glazingMaterial,
        items.length,
      ]}
      castShadow={surface !== "glazing"}
      receiveShadow
      dispose={null}
    />
  );
}
