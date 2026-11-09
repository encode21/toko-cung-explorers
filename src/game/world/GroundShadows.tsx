/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { groundContacts, type GroundContact } from "./contact-shadows";
import { BUILDING_LOTS } from "./outdoor-layout";
import { BENCHES } from "./street-props";
import { avatarSurfaceY } from "../avatar/grounding";
import { useRenderBudget } from "../engine/AdaptiveQuality";
const staticContacts: GroundContact[] = [
  ...BUILDING_LOTS.map((l) => ({
    x: l.x,
    y: avatarSurfaceY({ x: l.x, z: l.z }),
    z: l.z,
    width: l.width + 1,
    length: l.depth + 1,
    yaw: l.rotation,
  })),
  ...BENCHES.filter((b) => b.position[1] >= 0).map((b) => ({
    x: b.position[0],
    y: avatarSurfaceY({ x: b.position[0], z: b.position[2] }),
    z: b.position[2],
    width: 3.4,
    length: 1.5,
    yaw: b.yaw,
  })),
];
const plane = new T.PlaneGeometry(1, 1);
const material = new T.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexShader: `varying vec2 shadowUV;void main(){shadowUV=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
  fragmentShader: `varying vec2 shadowUV;void main(){float r=length((shadowUV-.5)*2.);float a=(1.-smoothstep(.22,1.,r))*.16;gl_FragColor=vec4(.12,.18,.16,a);}`,
});
export function GroundShadows() {
  const ref = useRef<T.InstancedMesh>(null);
  const o = useMemo(() => new T.Object3D(), []);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    const cap = useRenderBudget.getState().tier === "LOW" ? 48 : 96;
    let count = 0;
    const add = (p: GroundContact) => {
      if (count >= cap || Math.hypot(p.x - camera.position.x, p.z - camera.position.z) > 45) return;
      o.position.set(p.x, p.y + 0.012, p.z);
      o.rotation.set(-Math.PI / 2, 0, p.yaw);
      o.scale.set(p.width, p.length, 1);
      o.updateMatrix();
      ref.current!.setMatrixAt(count++, o.matrix);
    };
    // Registered trees and vehicles share the small pool ahead of static buildings.
    for (const contacts of groundContacts.values()) for (const p of contacts) add(p);
    for (const p of staticContacts) add(p);
    ref.current.count = count;
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      name="GroundContactShadows"
      ref={ref}
      args={[plane, material, 96]}
      frustumCulled={false}
      raycast={() => {}}
      dispose={null}
    />
  );
}
