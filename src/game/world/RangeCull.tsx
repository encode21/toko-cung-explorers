/** @jsxImportSource @/game/jsx */
import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

/**
 * Stops drawing detail that is unreadable from afar (e.g. floor labels): three.js draws everything
 * inside the frustum, however small. Measured from the camera, so bus rides and zoomed-out views
 * cull correctly. Colliders and simulations keep running; nothing remounts.
 */
export function RangeCull({
  x,
  z,
  range,
  children,
}: {
  x: number;
  z: number;
  /** Draw radius (m) from the cluster centre. */
  range: number;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (ref.current)
      ref.current.visible = Math.hypot(camera.position.x - x, camera.position.z - z) < range;
  });
  return <group ref={ref}>{children}</group>;
}
