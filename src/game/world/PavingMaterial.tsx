/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { MeshStandardMaterial } from "three";
/** Quiet paving joints/grain in world metres; the road geometry stays exactly unchanged. */
export function PavingMaterial({ color, sidewalk }: { color: string; sidewalk: boolean }) {
  const m = useMemo(() => {
    const material = new MeshStandardMaterial({ color, roughness: 0.93 });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = "varying vec2 pavingXZ;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\npavingXZ=(modelMatrix*vec4(transformed,1.)).xz;",
      );
      shader.fragmentShader = "varying vec2 pavingXZ;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
    ${sidewalk ? `vec2 grid=abs(fract(pavingXZ/1.6)-.5);vec2 aa=fwidth(pavingXZ/1.6);float edge=max(grid.x,grid.y);float line=smoothstep(.49-max(aa.x,aa.y),.5,edge);diffuseColor.rgb*=1.-line*.09*(1.-smoothstep(.03,.14,max(aa.x,aa.y)));` : `float grain=fract(sin(dot(floor(pavingXZ*9.),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=.985+grain*.03;`}
   `,
      );
    };
    material.customProgramCacheKey = () => (sidewalk ? "soft-paving" : "soft-asphalt");
    return material;
  }, [color, sidewalk]);
  useEffect(() => () => m.dispose(), [m]);
  return <primitive object={m} attach="material" />;
}
