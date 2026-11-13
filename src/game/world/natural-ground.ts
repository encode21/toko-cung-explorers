import * as THREE from "three";
import { mountainTexture } from "../mountain/MountainTextures";

/** Opaque, world-sized meadow/soil detail shared by city lawns and pond edges. */
export function naturalGroundMaterial(masked = false) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: masked, roughness: 1 });
  const scan = mountainTexture("ground");
  material.name = "NaturalCityGround";
  material.onBeforeCompile = (shader) => {
    shader.uniforms["lawnScan"] = { value: scan.texture };
    shader.uniforms["lawnScanReady"] = scan.ready;
    shader.vertexShader = [
      "varying vec3 lawnWorld; varying float lawnCoverage;",
      masked ? "attribute float grassCoverage;" : "",
      shader.vertexShader,
    ].join("\n");
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      [
        "#include <begin_vertex>",
        "vec4 lawnPoint = vec4(transformed, 1.);",
        "#ifdef USE_INSTANCING",
        "lawnPoint = instanceMatrix * lawnPoint;",
        "#endif",
        "lawnWorld = (modelMatrix * lawnPoint).xyz;",
        masked ? "lawnCoverage = grassCoverage;" : "lawnCoverage = 1.;",
      ].join("\n"),
    );
    shader.fragmentShader = [
      "varying vec3 lawnWorld; varying float lawnCoverage;",
      "uniform sampler2D lawnScan; uniform float lawnScanReady;",
      "float lawnHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }",
      "float lawnNoise(vec2 p) {",
      "vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);",
      "return mix(mix(lawnHash(i),lawnHash(i+vec2(1,0)),f.x),",
      "mix(lawnHash(i+vec2(0,1)),lawnHash(i+vec2(1,1)),f.x),f.y); }",
      shader.fragmentShader,
    ].join("\n");
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      [
        "#include <color_fragment>",
        "vec2 p=lawnWorld.xz;",
        "float meadowPatch=lawnNoise(p*.19)*.65+lawnNoise(p*.53)*.35;",
        "float soil=smoothstep(.56,.78,lawnNoise(p*.32+23.));",
        "float detail=lawnNoise(p*5.);",
        "float detailFade=1.-smoothstep(.12,.8,length(fwidth(p)));",
        // Linear-space mountain greens with olive tips and dry earth between tufts.
        "vec3 meadow=mix(vec3(.038,.085,.025),vec3(.17,.225,.065),smoothstep(.18,.8,meadowPatch));",
        "meadow=mix(meadow,vec3(.19,.145,.078),soil*.62);",
        "vec3 earth=texture2D(lawnScan,p/3.6).rgb;",
        "float scanGrain=dot(earth,vec3(.299,.587,.114));",
        "meadow*=mix(1.,.67+scanGrain*1.9,lawnScanReady*.66);",
        "meadow*=.88+detail*.24*detailFade;",
        "diffuseColor.rgb=mix(diffuseColor.rgb,meadow,clamp(lawnCoverage,0.,1.));",
      ].join("\n"),
    );
  };
  material.customProgramCacheKey = () => "natural-city-ground-v1-" + masked;
  return material;
}
