import { useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { hideActionAnchors, projectActionAnchors } from "./action-projection";

/** Lives beside the active camera; UI buttons remain in the HUD above touch-look controls. */
export function ActionProjection() {
  useFrame(({ camera, size }) => projectActionAnchors(camera, size.width, size.height));
  useEffect(() => hideActionAnchors, []);
  return null;
}
