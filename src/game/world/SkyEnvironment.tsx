/** @jsxImportSource @/game/jsx */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LOW_QUALITY } from "@/game/engine/quality";
import { sceneLighting as light } from "@/game/time/lighting";

const centers: [number, number, number, number][] = [
  [-65, 25, -95, 1.4],
  [40, 33, -115, 1.9],
  [-20, 40, -145, 1.2],
  [95, 29, -40, 1.5],
  [-100, 35, 40, 1.7],
  [30, 28, 110, 1.3],
  [95, 42, 80, 1.1],
  [-55, 26, 100, 1.5],
];
const puffs: [number, number, number, number, number, number][] = [
  [0, 0, 0, 8, 1.5, 3.5],
  [-5, 0, 0, 4, 1.2, 3],
  [5, 0.1, 0, 4, 1.4, 3],
  [-1.5, 1.1, 0, 3.5, 1.8, 2.8],
  [2.2, 0.9, 0, 3, 1.6, 2.5],
];

/** Gradient dome + one instanced cloud draw + two small celestial discs. No textures. */
export function SkyEnvironment() {
  const root = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.InstancedMesh>(null);
  const sun = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  const resources = useMemo(
    () => ({
      dome: new THREE.SphereGeometry(190, 24, 12),
      puff: new THREE.SphereGeometry(1, 10, 6),
      disc: new THREE.SphereGeometry(1, 16, 8),
      sky: new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { topColor: { value: light.top }, horizonColor: { value: light.horizon } },
        vertexShader:
          "varying float height; void main(){height=position.y/190.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader:
          "uniform vec3 topColor; uniform vec3 horizonColor; varying float height; void main(){gl_FragColor=vec4(mix(horizonColor,topColor,smoothstep(0.0,0.4,height)),1.0);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n}",
      }),
      cloud: new THREE.ShaderMaterial({
        uniforms: { cloudColor: { value: light.cloud } },
        vertexShader: `varying float shade; void main(){shade=0.83+0.17*normal.y;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform vec3 cloudColor; varying float shade; void main(){gl_FragColor=vec4(cloudColor*shade,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
      }),
      sun: new THREE.MeshBasicMaterial({
        color: "#fff1cf",
        fog: false,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
      moon: new THREE.MeshBasicMaterial({
        color: "#c4d5e8",
        fog: false,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [],
  );
  const count = (LOW_QUALITY ? 4 : centers.length) * puffs.length;
  useEffect(() => {
    const object = new THREE.Object3D();
    let i = 0;
    for (const [x, y, z, scale] of centers.slice(0, LOW_QUALITY ? 4 : centers.length)) {
      for (const [px, py, pz, sx, sy, sz] of puffs) {
        object.position.set(x + px * scale, y + py * scale, z + pz * scale);
        object.scale.set(sx * scale, sy * scale, sz * scale);
        object.updateMatrix();
        clouds.current?.setMatrixAt(i++, object.matrix);
      }
    }
    if (clouds.current) {
      clouds.current.instanceMatrix.needsUpdate = true;
      clouds.current.computeBoundingSphere();
    }
    return () => {
      Object.values(resources).forEach((resource) => resource.dispose());
    };
  }, [resources]);
  useFrame(({ camera }, delta) => {
    if (!root.current || !clouds.current || !sun.current || !moon.current) return;
    root.current.position.copy(camera.position);
    elapsed.current += Math.min(delta, 0.1);
    clouds.current.position.x = Math.sin(elapsed.current * 0.008) * 12;
    clouds.current.rotation.y = Math.sin(elapsed.current * 0.002) * 0.08;
    sun.current.position.copy(light.direction).multiplyScalar(175);
    sun.current.visible = light.sunVisibility > 0;
    resources.sun.opacity = light.sunVisibility;
    resources.sun.color.copy(light.sun);
    moon.current.position.copy(light.direction).multiplyScalar(-175);
    moon.current.visible = light.moonVisibility > 0;
    resources.moon.opacity = light.moonVisibility * 0.75;
  });
  return (
    <group ref={root} name="TimeOfDaySky" userData={{ ignoreCameraCollision: true }}>
      <mesh geometry={resources.dome} material={resources.sky} renderOrder={-100} />
      <mesh
        ref={sun}
        geometry={resources.disc}
        material={resources.sun}
        scale={2.6}
        renderOrder={-90}
      />
      <mesh
        ref={moon}
        geometry={resources.disc}
        material={resources.moon}
        scale={1.9}
        renderOrder={-90}
      />
      <instancedMesh
        ref={clouds}
        args={[resources.puff, resources.cloud, count]}
        castShadow={false}
        receiveShadow={false}
      />
    </group>
  );
}
