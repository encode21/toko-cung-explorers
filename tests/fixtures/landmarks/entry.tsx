/* eslint-disable react-refresh/only-export-components -- Standalone QA fixture. */
// Fixed-camera stills of authored landmarks: ?cam=x,y,z,tx,ty,tz&worldTime=HH:MM
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { SceneEnvironment } from "@/game/time/SceneEnvironment";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import { MountainScene } from "@/game/mountain/MountainScene";
import { ClubFacade } from "@/game/club/ClubFacade";
import { PrincipalBuilding } from "@/game/dungeon/DungeonScene";
import "@/styles.css";

const cam = (new URLSearchParams(location.search).get("cam") ?? "22,3,18,22,3,35")
  .split(",")
  .map(Number);
function Camera() {
  useFrame(({ camera }) => {
    camera.position.set(cam[0]!, cam[1]!, cam[2]!);
    camera.lookAt(cam[3]!, cam[4]!, cam[5]!);
    window.landmarksReady = true;
  });
  return null;
}
declare global {
  interface Window {
    landmarksReady?: boolean;
  }
}
createRoot(document.getElementById("root")!).render(
  <main style={{ height: "100dvh" }}>
    <Canvas camera={{ fov: 55, far: 500 }} dpr={1} shadows>
      <Camera />
      <SceneEnvironment />
      <Suspense fallback={null}>
        <Physics>
          <OutdoorNeighborhood />
          <MountainScene />
          <PrincipalBuilding />
          <ClubFacade />
        </Physics>
      </Suspense>
    </Canvas>
  </main>,
);
