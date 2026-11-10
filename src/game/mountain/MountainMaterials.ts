import * as THREE from "three";
import { mountainTexture, mountainTriplanar } from "./MountainTextures";

/** World-sized mineral detail keeps a large cliff and a small pebble in the same material family. */
export function mountainSurfaceMaterial(kind: "rock" | "bark" = "rock", vertexColors = false) {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.96, vertexColors });
  const scan = kind === "rock" ? mountainTexture("rock") : null;
  material.onBeforeCompile = (shader) => {
    if (scan) {
      shader.uniforms["rockScan"] = { value: scan.texture };
      shader.uniforms["rockScanReady"] = scan.ready;
    }
    shader.vertexShader =
      "varying vec3 naturePosition; varying vec3 natureUp;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vec4 natureWorld=vec4(transformed,1.0);
      vec3 natureNormal=objectNormal;
      #ifdef USE_INSTANCING
        natureWorld=instanceMatrix*natureWorld;
        natureNormal=mat3(instanceMatrix)*natureNormal;
      #endif
      naturePosition=(modelMatrix*natureWorld).xyz;
      natureUp=normalize(mat3(modelMatrix)*natureNormal);`,
    );
    shader.fragmentShader =
      `varying vec3 naturePosition; varying vec3 natureUp;
      ${kind === "rock" ? `uniform sampler2D rockScan; uniform float rockScanReady; ${mountainTriplanar}` : ""}
      float natureHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float natureNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(natureHash(i),natureHash(i+vec3(1,0,0)),f.x),mix(natureHash(i+vec3(0,1,0)),natureHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(natureHash(i+vec3(0,0,1)),natureHash(i+vec3(1,0,1)),f.x),mix(natureHash(i+vec3(0,1,1)),natureHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      kind === "rock"
        ? `#include <color_fragment>
      float patches=natureNoise(naturePosition*.65);
      vec3 scanned=mountainScan(rockScan,naturePosition,natureUp,2.7);
      // The scan supplies mineral variation; the instance color supplies only a gentle local tint.
      vec3 tint=normalize(max(diffuseColor.rgb,vec3(.025)))*1.732;
      vec3 mineral=scanned*mix(vec3(1.),tint,.25)*1.28;
      diffuseColor.rgb=mix(diffuseColor.rgb,mineral,rockScanReady*.92);
      float moss=smoothstep(.40,.75,natureUp.y)*smoothstep(.36,.66,patches);
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.78,1.10,.57),moss*.60);
      `
        : `#include <color_fragment>
      float lines=natureNoise(vec3(naturePosition.x*24.,naturePosition.y*1.5,naturePosition.z*24.));
      float broad=natureNoise(naturePosition*2.);
      diffuseColor.rgb *= .58+lines*.63+broad*.24;
      `,
    );
  };
  material.customProgramCacheKey = () => `mountain-${kind}-surface-v3`;
  return material;
}

/** Angular weathered stone; all copies use the same closed geometry and remain buried at the heel. */
export function mountainBoulderGeometry() {
  const geometry = new THREE.IcosahedronGeometry(0.56, 2);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    const crag = 1 + Math.sin(x * 17 + z * 11) * 0.11 + Math.cos(y * 19 - x * 9) * 0.07;
    positions.setXYZ(i, x * crag, Math.max(-0.43, y * crag), z * crag);
  }
  geometry.computeVertexNormals();
  return geometry;
}
