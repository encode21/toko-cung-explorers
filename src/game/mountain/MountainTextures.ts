import * as THREE from "three";

type MountainTexture = { texture: THREE.Texture; ready: { value: number } };
const textures = new Map<"rock" | "ground", MountainTexture>();

/** Small shared CC0 scans: loaded once for the scene, not duplicated for each instanced batch. */
export function mountainTexture(kind: "rock" | "ground"): MountainTexture {
  const cached = textures.get(kind);
  if (cached) return cached;
  const ready = { value: 0 };
  const texture = new THREE.TextureLoader().load(
    `/assets/mountain/${kind === "rock" ? "rock-face" : "forest-ground"}.webp`,
    () => {
      ready.value = 1;
    },
  );
  texture.name = `Mountain-${kind}-albedo`;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const resource = { texture, ready };
  textures.set(kind, resource);
  return resource;
}

/** World-space projection avoids streaking a cliff face or scaling the grain with each boulder. */
export const mountainTriplanar = `
vec3 mountainScan(sampler2D scan,vec3 p,vec3 normalDirection,float metres){
  vec3 weights=pow(abs(normalDirection),vec3(4.));
  weights/=max(weights.x+weights.y+weights.z,.0001);
  return texture2D(scan,p.yz/metres).rgb*weights.x
    +texture2D(scan,p.xz/metres).rgb*weights.y
    +texture2D(scan,p.xy/metres).rgb*weights.z;
}`;
