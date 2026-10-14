import React, { Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import { TokoCung } from "@/game/world/TokoCung";
import { SceneEnvironment } from "@/game/time/SceneEnvironment";
import { SkyEnvironment } from "@/game/world/SkyEnvironment";
import { Npcs } from "@/game/npc/Npc";
import { VehicleExhaust } from "@/game/traffic/VehicleExhaust";
import { ShadowBudget } from "@/game/engine/VisualBudget";
import { AdaptiveQuality, useRenderBudget } from "@/game/engine/AdaptiveQuality";
import { useGame } from "@/state/game-store";
import { useGameSettings } from "@/state/game-settings";
import { useNet } from "@/net/net-store";
import { playerId } from "@/net/useWorldChannel";
import { trafficVehicles, trafficActors } from "@/game/traffic/traffic-runtime";
import { useSceneTime } from "@/game/time/scene-time";
useGameSettings.setState({ graphics: "MEDIUM" });
useNet.setState({
  connected: true,
  roster: [{ id: playerId, joinedAt: 1, available: true, name: "QA" }],
});
let elapsed = 0;
let routePaused = false;
const trackedGeometry = new Map();
let orphanGeometry = [];
function CameraRoute() {
  useFrame(({ camera, gl, scene }, dt) => {
    if (!routePaused) elapsed += Math.min(dt, 0.1);
    const a = elapsed / 28;
    const x = Math.sin(a) * 23,
      z = 12 + Math.cos(a) * 19;
    camera.position.set(x, 3.3, z);
    camera.lookAt(0, 2, -4);
    useGame.setState({ playerPos: [x, 1, z] });
    const present = new Set();
    scene.traverse((o) => {
      if (!o.geometry) return;
      const g = o.geometry;
      present.add(g.uuid);
      if (!trackedGeometry.has(g.uuid)) {
        trackedGeometry.set(g.uuid, {
          uuid: g.uuid,
          type: g.type,
          name: o.name,
          parent: o.parent?.name,
        });
        g.addEventListener("dispose", () => trackedGeometry.delete(g.uuid));
      }
    });
    orphanGeometry = [...trackedGeometry.values()].filter((g) => !present.has(g.uuid));
    window.perfStats = {
      orphanGeometry,
      fps: useRenderBudget.getState().fps,
      frameMs: dt * 1000,
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      programs: gl.info.programs.length,
      renderer: gl
        .getContext()
        .getParameter(
          gl.getContext().getExtension("WEBGL_debug_renderer_info")?.UNMASKED_RENDERER_WEBGL ||
            gl.getContext().RENDERER,
        ),
      objects: scene.children.length,
      traffic: trafficVehicles.size,
      actors: trafficActors.size,
      heap: performance.memory?.usedJSHeapSize ?? null,
    };
  });
  return null;
}
function App() {
  const [mounted, setMounted] = useState(true);
  window.perfControl = {
    setMounted,
    pauseRoute: () => {
      routePaused = true;
    },
  };
  return (
    <div style={{ height: "100dvh" }}>
      <Canvas shadows camera={{ position: [12, 4, 20], fov: 58 }} gl={{ antialias: true }}>
        <color attach="background" args={["#b9d8ef"]} />
        <fog attach="fog" args={["#b9d8ef", 60, 260]} />
        {mounted && (
          <>
            <SceneEnvironment />
            <SkyEnvironment />
            <Suspense fallback={null}>
              <Physics timeStep={1 / 40}>
                <OutdoorNeighborhood />
                <TokoCung />
                <Npcs />
              </Physics>
              <VehicleExhaust />
            </Suspense>
          </>
        )}
        <AdaptiveQuality />
        <ShadowBudget />
        <CameraRoute />
      </Canvas>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
