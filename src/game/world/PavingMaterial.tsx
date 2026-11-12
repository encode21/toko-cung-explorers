/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { MeshStandardMaterial } from "three";
import { ROAD_SEGMENTS } from "./outdoor-layout";

// The guide follows the shared street plan, so it cannot drift when a road moves.
const guideDistance = ROAD_SEGMENTS.map((r) => {
  const across =
    r.axis === "x" ? `pavingXZ.y-(${r.z.toFixed(2)})` : `pavingXZ.x-(${r.x.toFixed(2)})`;
  const along =
    r.axis === "x" ? `pavingXZ.x-(${r.x.toFixed(2)})` : `pavingXZ.y-(${r.z.toFixed(2)})`;
  return `if(abs(${along})<${(r.length / 2 - 0.2).toFixed(2)}) guide=min(guide,abs(abs(${across})-${(r.width / 2 + 1).toFixed(2)}));`;
}).join("\n");

/** World-space brickwork, tactile paving and asphalt aggregate; no repeated image downloads. */
export function PavingMaterial({ color, sidewalk }: { color: string; sidewalk: boolean }) {
  const m = useMemo(() => {
    const material = new MeshStandardMaterial({ color, roughness: 0.93 });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = "varying vec2 pavingXZ;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\npavingXZ=(modelMatrix*vec4(transformed,1.)).xz;",
      );
      shader.fragmentShader =
        `varying vec2 pavingXZ;
float pavingHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float pavingNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(pavingHash(i),pavingHash(i+vec2(1,0)),f.x),mix(pavingHash(i+vec2(0,1)),pavingHash(i+1.),f.x),f.y);}
` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
    ${
      sidewalk
        ? `
      vec2 brick=pavingXZ/vec2(.36,.18);brick.x+=mod(floor(brick.y),2.)*.5;
      vec2 aa=max(fwidth(brick),vec2(.001));vec2 cell=fract(brick);
      vec2 joint=smoothstep(vec2(.025),vec2(.025)+aa,min(cell,1.-cell));
      float mortar=1.-joint.x*joint.y;
      float shade=.82+.26*pavingHash(floor(brick));
      float fade=1.-smoothstep(.25,.9,max(aa.x,aa.y));
      diffuseColor.rgb*=mix(1.,shade*(1.-mortar*.32),fade);
      diffuseColor.rgb*=.95+.1*pavingNoise(pavingXZ*30.);
      float guide=1000.;${guideDistance}
      float guideMask=1.-smoothstep(.19,.21,guide);
      vec2 tile=fract(pavingXZ/.4);float tileJoint=step(.025,min(min(tile.x,1.-tile.x),min(tile.y,1.-tile.y)));
      float ribs=.86+.14*smoothstep(.35,.65,fract((pavingXZ.x+pavingXZ.y)*24.));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.64,.405,.085)*ribs*(.82+.18*tileJoint),guideMask);
    `
        : `
      float grain=pavingNoise(pavingXZ*32.);
      float aggregate=pavingHash(floor(pavingXZ*86.));
      float micro=1.-smoothstep(.1,.6,max(fwidth(pavingXZ.x),fwidth(pavingXZ.y)));
      diffuseColor.rgb*=.86+.18*grain+.1*aggregate*micro;
      diffuseColor.rgb*=.97+.06*pavingNoise(pavingXZ*.35);
    `
    }
   `,
      );
    };
    material.customProgramCacheKey = () => (sidewalk ? "city-brick-tactile-v1" : "city-asphalt-v1");
    return material;
  }, [color, sidewalk]);
  useEffect(() => () => m.dispose(), [m]);
  return <primitive object={m} attach="material" />;
}
