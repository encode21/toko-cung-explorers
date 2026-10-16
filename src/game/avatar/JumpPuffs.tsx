/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import type { AvatarV2Props } from "./BaseAvatarV2";

/** Five pooled low-poly puffs, one draw call, anchored at contact rather than following the feet. */
export function JumpPuffs({ animation }: Pick<AvatarV2Props, "animation">) {
  const root = useRef<T.Group>(null);
  const mesh = useRef<T.InstancedMesh>(null);
  const material = useRef<T.MeshBasicMaterial>(null);
  const previous = useRef<string | undefined>(undefined);
  const age = useRef(1);
  const duration = useRef(0.28);
  const scratch = useMemo(
    () => ({ anchor: new T.Vector3(), local: new T.Vector3(), point: new T.Object3D() }),
    [],
  );
  useFrame(({ camera }, delta) => {
    if (!root.current || !mesh.current || !material.current) return;
    const name = typeof animation === "object" ? animation.current : animation;
    const burst = name !== previous.current && (name === "Jump" || name === "JumpLand");
    previous.current = name;
    if (burst) {
      root.current.getWorldPosition(scratch.anchor);
      age.current = camera.position.distanceToSquared(scratch.anchor) < 24 * 24 ? 0 : 1;
      duration.current = name === "JumpLand" ? 0.32 : 0.25;
    }
    age.current += Math.min(delta, 0.05);
    const progress = age.current / duration.current;
    mesh.current.visible = progress < 1;
    if (progress >= 1) return;
    root.current.updateWorldMatrix(true, false);
    root.current.worldToLocal(scratch.local.copy(scratch.anchor));
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 + 0.3;
      const radius = 0.16 + progress * (0.32 + i * 0.018);
      scratch.point.position.set(
        scratch.local.x + Math.cos(angle) * radius,
        scratch.local.y + 0.035 + Math.sin(progress * Math.PI) * 0.1,
        scratch.local.z + Math.sin(angle) * radius,
      );
      scratch.point.scale.setScalar((0.07 + i * 0.005) * (1 - progress * 0.72));
      scratch.point.updateMatrix();
      mesh.current.setMatrixAt(i, scratch.point.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    material.current.opacity = 0.36 * (1 - progress);
  });
  return (
    <group ref={root} userData={{ ignoreCameraCollision: true }}>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, 5]}
        visible={false}
        frustumCulled={false}
        raycast={() => {}}
      >
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial
          ref={material}
          color="#f7edcc"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
