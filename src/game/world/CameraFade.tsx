/** @jsxImportSource @/game/jsx */
import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import * as THREE from "three";

/** Overhead signs fade near the camera instead of filling the viewport. */
export function CameraFade({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const bounds = useRef(new THREE.Box3());
  const initialized = useRef(false);
  const opacity = useRef(1);
  useFrame(({ camera }, dt) => {
    if (!group.current) return;
    if (!initialized.current) {
      group.current.updateWorldMatrix(true, true);
      bounds.current.setFromObject(group.current);
      initialized.current = !bounds.current.isEmpty();
    }
    const distance = bounds.current.distanceToPoint(camera.position);
    const target = THREE.MathUtils.smoothstep(distance, 1.8, 3);
    if (target === 1 && opacity.current > 0.999) return;
    opacity.current = THREE.MathUtils.damp(opacity.current, target, 14, Math.min(dt, 0.05));
    group.current.visible = opacity.current > 0.02;
    group.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => {
        if (!material.transparent) {
          material.transparent = true;
          material.needsUpdate = true;
        }
        material.opacity = opacity.current;
        material.depthWrite = opacity.current > 0.99;
      });
    });
  });
  return <group ref={group}>{children}</group>;
}
