/** @jsxImportSource @/game/jsx */
import { Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Physics, useRapier } from "@react-three/rapier";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import { TokoCung } from "@/game/world/TokoCung";
import { PrincipalBuilding } from "@/game/dungeon/DungeonScene";
import { ClubFacade } from "@/game/club/ClubFacade";
import { SwimmingBeach } from "@/game/swimming/SwimmingBeach";
import { FishingSpot } from "@/game/fishing/FishingSpot";
import { PlazaObby } from "@/game/obby/PlazaObby";
import { SkyEnvironment } from "@/game/world/SkyEnvironment";
import { SceneEnvironment } from "@/game/time/SceneEnvironment";
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { CityAdBoard } from "@/game/world/CityAdvertising";
import { CITY_AD_SLOTS } from "@/game/world/city-advertising";
import { LOW_QUALITY, outdoorViewDistance } from "@/game/engine/quality";
import { useGame } from "@/state/game-store";
import type { Vec3 } from "@/game/world/layout";

const qa = ((window as any).cityQA = { frames: 0 });
useGame.setState({ playerPos: [0, 0.83, 12], overlay: "none" });
function Probe() {
  const { world, rapier } = useRapier();
  qa.ground = (x: number, z: number) => {
    const hit = world.castRay(new rapier.Ray({ x, y: 1, z }, { x: 0, y: -1, z: 0 }), 5, true);
    return hit ? 1 - hit.timeOfImpact : null;
  };
  useFrame(({ gl }) => {
    qa.frames++;
    qa.calls = gl.info.render.calls;
    qa.triangles = gl.info.render.triangles;
  });
  return null;
}
function Scene() {
  const [mode, setMode] = useState("city");
  const [imageUrl, setImageUrl] = useState("");
  qa.mode = setMode;
  qa.ad = setImageUrl;
  return (
    <>
      {mode === "city" ? (
        <>
          <OutdoorNeighborhood />
          <TokoCung />
          <PrincipalBuilding />
          <ClubFacade />
          <SwimmingBeach />
          <FishingSpot />
          <PlazaObby />
        </>
      ) : (
        <>
          <mesh rotation-x={-Math.PI / 2} position-y={-0.005} receiveShadow>
            <planeGeometry args={[150, 150]} />
            <meshStandardMaterial color="#9faaa8" roughness={0.95} />
          </mesh>
          {mode === "ad" ? (
            <CityAdBoard
              slot={{ ...CITY_AD_SLOTS[0]!, id: "qa", position: [0, 0, 0], yaw: 0, imageUrl }}
            />
          ) : (
            <VehicleModel
              kind={mode === "truck" ? "truck" : "mpv"}
              color="#eceee8"
              rider
              emptyBed
            />
          )}
        </>
      )}
      <Probe />
    </>
  );
}
const view = outdoorViewDistance(false, LOW_QUALITY);
createRoot(document.getElementById("root")!).render(
  <Canvas
    shadows={!LOW_QUALITY}
    dpr={1}
    camera={{ position: [34, 24, 49], fov: 50, near: 0.1, far: view.far }}
    gl={{ preserveDrawingBuffer: true }}
    onCreated={({ camera, gl, scene }) => {
      Object.assign(qa, { scene, gl, camera });
      qa.view = (position: Vec3, target: Vec3) => {
        useGame.setState({ playerPos: [target[0], 0.83, target[2]] });
        camera.position.set(...position);
        camera.lookAt(...target);
        camera.updateProjectionMatrix();
      };
      qa.view([34, 24, 49], [0, 2, -3]);
    }}
  >
    <color attach="background" args={["#b9d8ef"]} />
    <fog attach="fog" args={["#b9d8ef", view.fogNear, view.fogFar]} />
    <SceneEnvironment />
    <SkyEnvironment />
    {!LOW_QUALITY && (
      <Environment>
        <Lightformer intensity={1.6} position={[0, 12, 0]} scale={[24, 24, 1]} />
        <Lightformer
          intensity={0.9}
          color="#bcdcf5"
          position={[-14, 4, -6]}
          rotation-y={Math.PI / 2}
          scale={[30, 6, 1]}
        />
      </Environment>
    )}
    <Suspense fallback={null}>
      <Physics gravity={[0, -9.81, 0]}>
        <Scene />
      </Physics>
    </Suspense>
  </Canvas>,
);
