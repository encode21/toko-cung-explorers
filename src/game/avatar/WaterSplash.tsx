/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { waterAt } from "@/game/swimming/model";
/** Six pooled droplets and a ripple, shared by local/remote avatars; no physics or bone writes. */
export function WaterSplash() {
  const root = useRef<T.Group>(null),
    mesh = useRef<T.InstancedMesh>(null),
    ring = useRef<T.Mesh>(null);
  const material = useRef<T.MeshBasicMaterial>(null);
  const state = useRef({ wet: false, age: 1, surface: 0 });
  const scratch = useMemo(
    () => ({
      world: new T.Vector3(),
      anchor: new T.Vector3(),
      local: new T.Vector3(),
      last: new T.Vector3(),
      object: new T.Object3D(),
    }),
    [],
  );
  useFrame(({ camera }, dt) => {
    if (!root.current || !mesh.current || !ring.current || !material.current) return;
    root.current.getWorldPosition(scratch.world);
    const water = waterAt(scratch.world.x, scratch.world.z);
    const wet = !!water && scratch.world.y < water.surface - 0.06;
    const moving = scratch.world.distanceToSquared(scratch.last) > 0.16;
    const s = state.current;
    if (
      (wet !== s.wet || (wet && moving && s.age > 0.65)) &&
      camera.position.distanceToSquared(scratch.world) < 900
    ) {
      s.age = 0;
      s.surface = water?.surface ?? s.surface;
      scratch.anchor.set(scratch.world.x, s.surface + 0.02, scratch.world.z);
      scratch.last.copy(scratch.world);
    }
    s.wet = wet;
    s.age += Math.min(dt, 0.05);
    const t = s.age / 0.65;
    mesh.current.visible = ring.current.visible = t < 1;
    if (t >= 1) return;
    root.current.worldToLocal(scratch.local.copy(scratch.anchor));
    ring.current.position.copy(scratch.local);
    ring.current.scale.setScalar(0.25 + t * 0.7);
    (ring.current.material as T.MeshBasicMaterial).opacity = (1 - t) * 0.45;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3,
        r = 0.15 + t * 0.5;
      scratch.object.position.set(
        scratch.local.x + Math.cos(a) * r,
        scratch.local.y + Math.sin(t * Math.PI) * 0.22,
        scratch.local.z + Math.sin(a) * r,
      );
      scratch.object.scale.setScalar(0.045 * (1 - t * 0.7));
      scratch.object.updateMatrix();
      mesh.current.setMatrixAt(i, scratch.object.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    material.current.opacity = 0.65 * (1 - t);
  });
  return (
    <group ref={root}>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, 6]}
        visible={false}
        frustumCulled={false}
        raycast={() => {}}
      >
        <sphereGeometry args={[1, 5, 4]} />
        <meshBasicMaterial ref={material} color="#e1fbef" transparent depthWrite={false} />
      </instancedMesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false} raycast={() => {}}>
        <ringGeometry args={[0.91, 1, 24]} />
        <meshBasicMaterial color="#e1fbef" transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
