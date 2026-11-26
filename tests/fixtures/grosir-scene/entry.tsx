import { Suspense, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { PerspectiveCamera, Vector3 } from "three";
import { GameViewport } from "@/ui/game-ui/GameViewport";
import { HudSheetHost } from "@/ui/hud/HudSheet";
import { StoreInterior } from "@/game/world/StoreInterior";
import { Shelf } from "@/game/world/Shelf";
import { SHELVES, STORE } from "@/game/world/layout";
import { KIOSK } from "@/game/interactions/kiosk";
import { KioskCameraFocus } from "@/game/player/kiosk-camera";
import { useKioskView } from "@/game/warung/kiosk-view";
import { useWarung, openKiosk } from "@/game/warung/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { resetTransport } from "../warung/client";
import "@/styles.css";

const originalPosition = new Vector3(2.6, 2.2, -3.8);
const originalTarget = new Vector3(4.5, 1.2, 3.0);
const { snapshot } = resetTransport("empty");
useWarung.setState({
  data: snapshot,
  inside: null,
  serviceView: false,
  customers: [],
  customer: null,
  order: null,
  basket: [],
  busy: false,
  error: "",
  payChoice: false,
});
useGame.setState({
  overlay: "none",
  inside: true,
  playerPos: [...KIOSK.position],
  toast: null,
  nearby: null,
});
Object.assign(window, {
  openGrosirScene: openKiosk,
  closeGrosirScene: () => useHud.getState().setSheet(null),
  warung: useWarung,
});

function Camera() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const focus = useMemo(() => new KioskCameraFocus(), []);
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)"), []);
  useEffect(() => () => focus.reset(camera), [focus, camera]);
  useFrame((state, delta) => {
    // The production Player writes its normal orbit before applying this same camera-only controller.
    camera.position.copy(originalPosition);
    camera.lookAt(originalTarget);
    focus.update(camera, useHud.getState().sheet === "grosir", delta, reduced.matches, KIOSK, {
      width: size.width,
      height: size.height,
      ...useKioskView.getState(),
    });
    camera.updateMatrixWorld();
    const project = (x: number, y: number, z: number) => {
      const point = new Vector3(x, y, z).project(camera);
      return [((point.x + 1) * size.width) / 2, ((1 - point.y) * size.height) / 2, point.z];
    };
    Object.assign(window, {
      kioskCameraState: {
        time: state.clock.elapsedTime,
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
        view: camera.view,
        scene: useKioskView.getState(),
        screen: project(KIOSK.position[0], KIOSK.position[1] + 1.42, KIOSK.position[2] - 0.076),
        feet: project(KIOSK.position[0], KIOSK.position[1], KIOSK.position[2]),
        top: project(KIOSK.position[0], KIOSK.position[1] + 1.86, KIOSK.position[2]),
        loaded: !!state.scene.getObjectByName("KioskTouchscreen"),
      },
    });
  });
  return null;
}
function Preview() {
  return (
    <GameViewport allowPortrait>
      <Canvas
        camera={{ position: originalPosition.toArray(), fov: 58, near: 0.05, far: 100 }}
        shadows
      >
        <color attach="background" args={["#8cb7c4"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[2, 5, -3]} intensity={2.4} castShadow />
        <Camera />
        <Suspense fallback={null}>
          <Physics gravity={[0, -20, 0]}>
            <mesh position={[0, -0.025, (STORE.minZ + STORE.maxZ) / 2]} receiveShadow>
              <boxGeometry args={[STORE.maxX - STORE.minX, 0.05, STORE.maxZ - STORE.minZ]} />
              <meshStandardMaterial color="#e6dfce" roughness={0.9} />
            </mesh>
            <StoreInterior />
            {SHELVES.map((zone) => (
              <Shelf key={zone.id} zone={zone} />
            ))}
          </Physics>
        </Suspense>
      </Canvas>
      <HudSheetHost />
    </GameViewport>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
