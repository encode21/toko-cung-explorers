/** @jsxImportSource @/game/jsx */
import { useEffect, useMemo } from "react";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import * as THREE from "three";
import { mountainTexture, mountainTriplanar } from "./MountainTextures";
import { MountainBridge } from "./MountainBridge";
import {
  mountainGroundHeight,
  nearestMountainTrail,
  MOUNTAIN_PATH_WIDTH,
  mountainWorldPoint,
} from "./model";
import { mountainGroundMesh } from "./terrain-mesh";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};
function lineDistance(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax,
    dz = bz - az;
  const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
}

function groundAppearance(positions: Float32Array) {
  const colors = new Float32Array(positions.length);
  const wear = new Float32Array(positions.length / 3);
  const grass = new THREE.Color("#537539");
  const darkGrass = new THREE.Color("#365b37");
  const rock = new THREE.Color("#72766b");
  const soil = new THREE.Color("#6d6453");
  const c = new THREE.Color();
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]!,
      y = positions[i + 1]!,
      z = positions[i + 2]!;
    const slope = Math.hypot(
      mountainGroundHeight(x + 0.5, z) - mountainGroundHeight(x - 0.5, z),
      mountainGroundHeight(x, z + 0.5) - mountainGroundHeight(x, z - 0.5),
    );
    const patch = (Math.sin(x * 0.24 + z * 0.11) + Math.cos(x * 0.1 - z * 0.31)) * 0.18 + 0.3;
    c.copy(grass).lerp(darkGrass, clamp(patch));
    c.lerp(rock, smooth(0.45, 1.5, slope) * 0.88);
    const trail = nearestMountainTrail(x, z);
    // Irregular feathered margins turn a path into worn earth, without sharp slab outlines.
    const margin = Math.sin(x * 0.55 + z * 0.17) * 0.25 + Math.cos(z * 0.8) * 0.18;
    let dirt = 1 - smooth(1.7, MOUNTAIN_PATH_WIDTH / 2 + 0.9 + margin, trail.distance);
    // Walkways between the helipad, campfire, noticeboard and shelters.
    if (z > 255 && z < 350 && x > 926 && x < 1094) {
      const paths = [
        [365, 65, 344, 68],
        [365, 65, 376, 55],
        [365, 65, 378, 74],
        [344, 68, 348, 78],
        [378, 74, 370, 78],
      ];
      const campPath = Math.min(
        ...paths.map(([ax, az, bx, bz]) => {
          const a = mountainWorldPoint([ax!, 8, az!]),
            b = mountainWorldPoint([bx!, 8, bz!]);
          return lineDistance(x, z, a[0], a[2], b[0], b[2]);
        }),
      );
      dirt = Math.max(dirt, (1 - smooth(1.4, 3.3 + margin, campPath)) * 0.8);
    }
    // Keep the river bed and cliff faces mineral rather than painting a path below the bridge.
    if (x > 955 && x < 1015 && Math.abs(z - 159) < 15 && y < 24) dirt *= 0.15;
    c.lerp(soil, dirt);
    const sand = smooth(295, 345, z) * (1 - smooth(5, 14, y));
    c.lerp(new THREE.Color("#c7b994"), sand);
    dirt *= 1 - sand * 0.97;
    c.multiplyScalar(0.96 + 0.06 * Math.sin(x * 1.8 + z * 2.3));
    colors.set([c.r, c.g, c.b], i);
    wear[i / 3] = dirt;
  }
  return { colors, wear };
}

/** One opaque matte material, with object-space grain that wraps rock walls without stretching. */
function groundMaterial() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const ground = mountainTexture("ground"),
    rock = mountainTexture("rock");
  material.onBeforeCompile = (shader) => {
    shader.uniforms["groundScan"] = { value: ground.texture };
    shader.uniforms["groundScanReady"] = ground.ready;
    shader.uniforms["rockScan"] = { value: rock.texture };
    shader.uniforms["rockScanReady"] = rock.ready;
    shader.vertexShader =
      "varying vec3 mountainSurface; varying vec3 mountainNormal; varying float mountainDirt; attribute float trailWear;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\n mountainSurface = position; mountainNormal=objectNormal; mountainDirt=trailWear;",
    );
    shader.fragmentShader =
      `varying vec3 mountainSurface; varying vec3 mountainNormal; varying float mountainDirt;
      uniform sampler2D groundScan; uniform sampler2D rockScan;
      uniform float groundScanReady; uniform float rockScanReady;
      ${mountainTriplanar}
      float mountainHash(vec3 p) { p=fract(p*.1031); p+=dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z); }
      float mountainNoise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(mountainHash(i),mountainHash(i+vec3(1,0,0)),f.x),
          mix(mountainHash(i+vec3(0,1,0)),mountainHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(mountainHash(i+vec3(0,0,1)),mountainHash(i+vec3(1,0,1)),f.x),
          mix(mountainHash(i+vec3(0,1,1)),mountainHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
        float broad=mountainNoise(mountainSurface*.65);
        float grain=mountainNoise(mountainSurface*7.0);
        float grainFade=1.0-smoothstep(.1,.7,length(fwidth(mountainSurface)));
        diffuseColor.rgb *= .74 + broad*.38 + (grain-.5)*.32*grainFade;
        vec3 dirtScan=mountainScan(groundScan,mountainSurface,mountainNormal,3.6);
        vec3 cliffScan=mountainScan(rockScan,mountainSurface,mountainNormal,2.7);
        float cliff=(1.-smoothstep(.35,.76,abs(mountainNormal.y)))*(1.-mountainDirt);
        diffuseColor.rgb=mix(diffuseColor.rgb,cliffScan*1.18,cliff*rockScanReady*.82);
        diffuseColor.rgb=mix(diffuseColor.rgb,dirtScan*1.32,mountainDirt*groundScanReady*.94);
`,
    );
  };
  material.customProgramCacheKey = () => "mountain-earth-v3";
  return material;
}

export function MountainTerrain() {
  const data = useMemo(() => {
    const mesh = mountainGroundMesh();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    const appearance = groundAppearance(mesh.positions);
    geometry.setAttribute("color", new THREE.BufferAttribute(appearance.colors, 3));
    geometry.setAttribute("trailWear", new THREE.BufferAttribute(appearance.wear, 1));
    geometry.setIndex(new THREE.BufferAttribute(mesh.triangles, 1));
    geometry.computeVertexNormals();
    return { ...mesh, geometry, material: groundMaterial() };
  }, []);
  useEffect(
    () => () => {
      data.geometry.dispose();
      data.material.dispose();
    },
    [data],
  );
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      name="MountainTerrain"
      userData={{ mountainTrail: true }}
    >
      <mesh name="MountainGround" geometry={data.geometry} material={data.material} receiveShadow />
      <TrimeshCollider args={[data.positions, data.triangles]} friction={0.85} />
    </RigidBody>
  );
}

/** The timber crossing shares the trail's fixed, continuous collision surface. */
export function MountainTrail() {
  return <MountainBridge />;
}
