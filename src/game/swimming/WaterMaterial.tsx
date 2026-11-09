/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import type { WaterBody } from "./model";
import { reducedMotion } from "../vehicles/visual";
/** Analytic depth matches the existing shore/pond beds; no reflection or fluid simulation. */
export function WaterMaterial({ body }: { body: WaterBody }) {
  const value = useMemo(() => {
    const ocean = body.kind === "ocean";
    const m = new T.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.48,
      metalness: 0.06,
      transparent: !ocean,
      opacity: ocean ? 1 : 0.88,
      depthWrite: ocean,
    });
    const time = { value: 0 };
    m.name = "CartoonWater";
    m.userData["time"] = time;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, {
        waterTime: time,
        waterCenter: { value: new T.Vector2(body.x, body.z) },
        waterRadius: { value: new T.Vector2(ocean ? 12 : body.rx, ocean ? 12 : body.rz) },
        waterDepth: { value: body.depth },
        waterOcean: { value: ocean ? 1 : 0 },
        waterShallow: { value: new T.Color("#8bd4c1") },
        waterDeep: { value: new T.Color("#358fae") },
      });
      shader.vertexShader = "varying vec2 waterXZ;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nwaterXZ=(modelMatrix*vec4(transformed,1.)).xz;",
      );
      shader.fragmentShader =
        `varying vec2 waterXZ;
    uniform float waterTime; uniform vec2 waterCenter; uniform vec2 waterRadius;
    uniform float waterDepth; uniform float waterOcean; uniform vec3 waterShallow; uniform vec3 waterDeep;
   ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
    float coast=min(max(max(abs(waterXZ.x)-64.,abs(waterXZ.y)-64.),min(-38.-waterXZ.x,-29.-waterXZ.y)),max(max(60.-waterXZ.x,waterXZ.x-148.),max(-32.-waterXZ.y,waterXZ.y-132.)));
    float slope=waterOcean>.5?coast/12.:(1.-length((waterXZ-waterCenter)/waterRadius))/.6;
    float depth=clamp(slope,0.,1.);
    float wave=sin(waterXZ.x*1.7+waterXZ.y*.9+waterTime*.85)+sin(waterXZ.y*2.4-waterTime*.65);
    float foam=(1.-smoothstep(.015,.085,depth))*(.45+.3*sin(waterXZ.x*4.+waterXZ.y*3.+waterTime));
    float glint=pow(max(0.,wave*.5),14.)*.12;
    diffuseColor.rgb=mix(waterShallow,waterDeep,smoothstep(0.,.85,depth))*(1.+wave*.025)+vec3(glint);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.87,.98,.91),max(0.,foam));
   `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_begin>",
        "#include <normal_fragment_begin>\nnormal=normalize(normal+vec3(sin(waterXZ.x*1.7+waterTime)*.025,cos(waterXZ.y*1.3-waterTime)*.025,0.));",
      );
    };
    m.customProgramCacheKey = () => "cartoon-water-v1";
    return { m, time };
  }, [body]);
  useEffect(() => () => value.m.dispose(), [value]);
  useFrame(({ clock }) => {
    value.time.value = reducedMotion() ? 0 : clock.elapsedTime;
  });
  return <primitive object={value.m} attach="material" />;
}
