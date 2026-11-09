/** @jsxImportSource @/game/jsx */
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import { TokoCung } from "@/game/world/TokoCung";
import { SwimmingBeach } from "@/game/swimming/SwimmingBeach";
import { useGame } from "@/state/game-store";

const qa = ((window as any).qa = { frames: [] as number[], calls: [] as number[] });
useGame.setState({ playerPos: [0, 0.83, 12], overlay: "none" });
function Probe() {
  const { world, rapier } = useRapier();
  qa.groundAt = (x: number, z: number) => {
    const hit = world.castRay(new rapier.Ray({ x, y: 10, z }, { x: 0, y: -1, z: 0 }), 20, true);
    return hit ? 10 - hit.timeOfImpact : null;
  };
  qa.colliders = () => world.colliders.len();
  useFrame(({ gl }, dt) => {
    qa.frames.push(dt * 1000);
    qa.calls.push(gl.info.render.calls);
  });
  return null;
}
document.body.style.margin = "0";
createRoot(document.getElementById("root")!).render(
  <Canvas
    dpr={1}
    camera={{ position: [22, 15, 38], fov: 50 }}
    gl={{ preserveDrawingBuffer: true }}
    onCreated={({ camera, scene }) => {
      qa.scene = scene;
      qa.view = (x: number, z: number) => {
        useGame.setState({ playerPos: [x, 0.83, z] });
        camera.position.set(x + 22, 15, z + 26);
        camera.lookAt(x, 2, z - 8);
      };
      qa.view(0, 12);
    }}
  >
    <color attach="background" args={["#b9d8ef"]} />
    <fog attach="fog" args={["#b9d8ef", 60, 160]} />
    <ambientLight intensity={1.8} />
    <directionalLight position={[10, 25, 18]} intensity={2} />
    <Suspense fallback={null}>
      <Physics gravity={[0, -9.81, 0]}>
        <OutdoorNeighborhood />
        <SwimmingBeach />
        <TokoCung />
        <Probe />
      </Physics>
    </Suspense>
  </Canvas>,
);
