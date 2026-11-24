/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { CITY_WATERLINE, type WaterBody } from "./model";
import { MOUNTAIN_COAST } from "../mountain/model";
import { reducedMotion } from "../vehicles/visual";
/** Analytic depth matches the existing shore/pond beds; no reflection or fluid simulation. */
/** `shore` (minX, maxX, minZ, maxZ): an ocean around a rectangular shoreline instead of the city coast. */
export function WaterMaterial({
  body,
  shore,
  colors,
}: {
  body: WaterBody;
  shore?: [number, number, number, number];
  /** [shallow, deep] tint; defaults to the clear sea/lake blue-green. */
  colors?: [string, string];
}) {
  const value = useMemo(() => {
    const ocean = body.kind === "ocean";
    const m = new T.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.32,
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
        waterMountain: { value: "mountain" in body ? 1 : 0 },
        waterShoreZ: { value: MOUNTAIN_COAST.shoreZ },
        waterShoreRect: { value: new T.Vector4(...(shore ?? [0, 0, 0, 0])) },
        waterShoreOn: { value: shore ? 1 : 0 },
        // City coast is dry sand until the waterline; foam and depth start there.
        waterCoastShift: { value: ocean && !shore && !("mountain" in body) ? CITY_WATERLINE : 0 },
        waterShallow: { value: new T.Color(colors?.[0] ?? "#8bd4c1") },
        waterDeep: { value: new T.Color(colors?.[1] ?? "#358fae") },
      });
      shader.vertexShader = "varying vec2 waterXZ;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nwaterXZ=(modelMatrix*vec4(transformed,1.)).xz;",
      );
      shader.fragmentShader =
        `varying vec2 waterXZ;
    uniform float waterTime; uniform vec2 waterCenter; uniform vec2 waterRadius;
    uniform float waterDepth; uniform float waterOcean; uniform float waterMountain; uniform float waterShoreZ; uniform vec4 waterShoreRect; uniform float waterShoreOn; uniform float waterCoastShift; uniform vec3 waterShallow; uniform vec3 waterDeep;
   ` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
    float coast=min(max(max(abs(waterXZ.x)-64.,abs(waterXZ.y)-64.),min(-38.-waterXZ.x,-29.-waterXZ.y)),max(max(60.-waterXZ.x,waterXZ.x-148.),max(-32.-waterXZ.y,waterXZ.y-132.)));
    if(waterMountain>.5) coast=waterXZ.y-waterShoreZ;
    if(waterShoreOn>.5) coast=max(max(waterShoreRect.x-waterXZ.x,waterXZ.x-waterShoreRect.y),max(waterShoreRect.z-waterXZ.y,waterXZ.y-waterShoreRect.w));
    float slope=waterOcean>.5?(coast-waterCoastShift)/(12.-waterCoastShift):(1.-length((waterXZ-waterCenter)/waterRadius))/.6;
    float depth=clamp(slope,0.,1.);
    float swell=sin(waterXZ.x*.74+waterXZ.y*1.18+waterTime*.8);
    float crossWave=sin(-waterXZ.x*1.31+waterXZ.y*.44-waterTime*1.05);
    float wave=swell+crossWave*.55+sin(waterXZ.x*2.7+waterXZ.y*1.9+waterTime*1.4)*.2;
    float wash=sin(depth*85.-waterTime*1.4+swell*.6)*.5+.5;
    float foam=(1.-smoothstep(.008,.065,depth))*(.2+.45*wash);
    float glint=pow(max(0.,wave/1.75),10.)*.16;
    diffuseColor.rgb=mix(waterShallow,waterDeep,smoothstep(0.,.85,depth))*(1.+wave*.025)+vec3(glint);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.87,.98,.91),max(0.,foam));
   `,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_begin>",
        "#include <normal_fragment_begin>\nnormal=normalize(normal+vec3(cos(waterXZ.x*.74+waterXZ.y*1.18+waterTime*.8)*.075,cos(-waterXZ.x*1.31+waterXZ.y*.44-waterTime*1.05)*.055,0.));\nfloat waterFresnel=pow(1.-max(0.,dot(normal,normalize(vViewPosition))),3.);\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.75,.8),waterFresnel*.22);",
      );
    };
    m.customProgramCacheKey = () => "cartoon-water-v3";
    return { m, time };
  }, [body, shore, colors]);
  useEffect(() => () => value.m.dispose(), [value]);
  useFrame(({ clock }) => {
    value.time.value = reducedMotion() ? 0 : clock.elapsedTime;
  });
  return <primitive object={value.m} attach="material" />;
}
