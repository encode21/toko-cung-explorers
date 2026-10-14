import { useEffect } from "react";
import { PerspectiveCamera } from "three";
import { projectActionAnchors, hideActionAnchors } from "@/game/interactions/action-projection";
import { useGame } from "@/state/game-store";

/** Exercise the real HUD projection without loading the full world/physics into the UI fixture. */
export function ActionCameraFixture() {
  useEffect(() => {
    const camera = new PerspectiveCamera(58, 1, 0.1, 200);
    let frame = 0;
    const update = () => {
      const viewport = document.querySelector(".world-viewport")?.getBoundingClientRect();
      if (viewport) {
        const [x, y, z] = useGame.getState().playerPos;
        camera.aspect = viewport.width / viewport.height;
        camera.updateProjectionMatrix();
        camera.position.set(x + 6, y + 7, z + 9);
        camera.lookAt(x, y, z);
        projectActionAnchors(camera, viewport.width, viewport.height);
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      hideActionAnchors();
    };
  }, []);
  return null;
}
