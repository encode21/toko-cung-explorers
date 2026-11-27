/* eslint-disable react-refresh/only-export-components -- Standalone QA fixture. */
// Fixed-camera stills of authored landmarks: ?cam=x,y,z,tx,ty,tz&worldTime=HH:MM
import { Suspense, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { InstancedMesh, Mesh, Vector3 } from "three";
import { SceneEnvironment } from "@/game/time/SceneEnvironment";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import { MountainScene } from "@/game/mountain/MountainScene";
import { ClubFacade } from "@/game/club/ClubFacade";
import { PrincipalBuilding } from "@/game/dungeon/DungeonScene";
import { MOSQUE_TERRACE } from "@/game/world/mosque-layout";
import { useGame } from "@/state/game-store";
import "@/styles.css";

const cam = (new URLSearchParams(location.search).get("cam") ?? "22,3,18,22,3,35")
  .split(",")
  .map(Number);
if (cam[0]! > 90 && cam[0]! < 145 && cam[2]! > 90) {
  // Outdoor district loading follows the player even in this free-camera fixture.
  useGame.setState({ playerPos: [cam[0]!, 0.83, cam[2]!] });
}
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
  const [origin, direction] = useMemo(() => [new Vector3(), new Vector3()] as const, []);
  useFrame(({ scene }) => {
    const mosque = scene.getObjectByName("MasjidCung");
    if (!mosque) return;
    const ray = () => {
      const hit = world.castRay(new rapier.Ray(origin, direction), 30, true);
      return hit?.timeOfImpact ?? null;
    };
    const mosqueRay = (x: number, y: number, z: number, dx: number, dy: number, dz: number) => {
      mosque.localToWorld(origin.set(x, y, z));
      direction.set(dx, dy, dz).transformDirection(mosque.matrixWorld);
      return ray();
    };
    origin.set(MOSQUE_TERRACE.position[0], 2, MOSQUE_TERRACE.bounds.maxZ - 0.7);
    direction.set(0, -1, 0);
    const terrace = ray();
    let instances = 0,
      meshes = 0;
    mosque.traverse((o) => {
      if (o instanceof Mesh) meshes++;
      if (o instanceof InstancedMesh) instances += o.count;
    });
    Object.assign(window, {
      mosqueQA: {
        courtyardToHall: mosqueRay(0, 1, 6.4, 0, 0, -1),
        floor: mosqueRay(0, 2, 5.5, 0, -1, 0),
        dome: mosqueRay(0, 20, -1.6, 0, -1, 0),
        minaret: mosqueRay(-5.05, 1, 6.4, 0, 0, -1),
        portico: mosqueRay(0, 10, 3.4, 0, -1, 0),
        colonnade: mosqueRay(4.65, 5, 5.2, 0, -1, 0),
        terrace,
        retiredDungeon: !!scene.getObjectByName("principal-dungeon"),
        instances,
        meshes,
      },
    });
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
