/* eslint-disable react-refresh/only-export-components -- Standalone QA fixture. */
// Fixed-camera stills of authored landmarks: ?cam=x,y,z,tx,ty,tz&worldTime=HH:MM
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
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
function MosqueProbe() {
  const { world, rapier } = useRapier();
  useFrame(({ scene }) => {
    const mosque = scene.getObjectByName("MasjidCung");
    if (!mosque) return;
    const ray = (x: number, y: number, z: number, dx: number, dy: number, dz: number) => {
      const hit = world.castRay(new rapier.Ray({ x, y, z }, { x: dx, y: dy, z: dz }), 30, true);
      return hit?.timeOfImpact ?? null;
    };
    let instances = 0,
      meshes = 0;
    mosque.traverse((o) => {
      if ((o as any).isMesh) meshes++;
      if ((o as any).isInstancedMesh) instances += (o as any).count;
    });
    (window as any).mosqueQA = {
      courtyardToHall: ray(35, 1, 28.6, 0, 0, 1),
      floor: ray(35, 2, 29.5, 0, -1, 0),
      dome: ray(35, 20, 36.6, 0, -1, 0),
      minaret: ray(40.05, 1, 28.6, 0, 0, 1),
      portico: ray(35, 10, 31.6, 0, -1, 0),
      colonnade: ray(30.35, 5, 29.8, 0, -1, 0),
      retiredDungeon: !!scene.getObjectByName("principal-dungeon"),
      instances,
      meshes,
    };
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
          <MosqueProbe />
        </Physics>
      </Suspense>
    </Canvas>
  </main>,
);
