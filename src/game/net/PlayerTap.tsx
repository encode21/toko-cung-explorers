import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Raycaster, Vector2 } from "three";
import { useHud } from "@/state/hud-store";
import { gameUiBlocked } from "@/state/game-ui-store";

/** A short tap in the camera zone picks an avatar or an interactive world object; swipes stay camera-only. */
export function PlayerTap() {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    const ray = new Raycaster();
    const point = new Vector2();
    const tap = (event: Event) => {
      if (gameUiBlocked()) return;
      const { x, y } = (event as CustomEvent<{ x: number; y: number }>).detail;
      const rect = gl.domElement.getBoundingClientRect();
      point.set(((x - rect.left) / rect.width) * 2 - 1, (-(y - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(point, camera);
      // Decorative light beams do not occlude taps; solid world surfaces still do.
      for (const hit of ray.intersectObjects(scene.children, true)) {
        let object = hit.object;
        let visible = true;
        object.traverseAncestors((ancestor) => {
          if (!ancestor.visible) visible = false;
        });
        if (!object.visible || !visible || object.userData["tapThrough"]) continue;
        while (object.parent && !object.userData["playerId"] && !object.userData["worldTap"])
          object = object.parent;
        if (typeof object.userData["worldTap"] === "function") {
          object.userData["worldTap"]();
          break;
        }
        if (typeof object.userData["playerId"] === "string")
          useHud.setState({ selectedPlayer: object.userData["playerId"] });
        break;
      }
    };
    window.addEventListener("game-player-tap", tap);
    return () => window.removeEventListener("game-player-tap", tap);
  }, [camera, gl, scene]);
  return null;
}
