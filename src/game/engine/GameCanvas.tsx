/** @jsxImportSource @/game/jsx */
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Lightformer } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { OutdoorNeighborhood } from "@/game/world/OutdoorNeighborhood";
import { WorldZones } from "@/game/world/WorldZones";
import { TokoCung } from "@/game/world/TokoCung";
import { ActivityProps } from "@/game/world/props/ActivityProps";
import { Npcs } from "@/game/npc/Npc";
import { NakamaOps } from "@/game/simulation/NakamaOps";
import { Player } from "@/game/player/Player";
import { Waypoint } from "@/game/navigation/Waypoint";
import { RemotePlayers } from "@/game/net/RemotePlayers";
import { LOW_QUALITY } from "@/game/engine/quality";

import { VehicleExhaust } from "@/game/traffic/VehicleExhaust";
import { SceneTimeDebug } from "@/game/time/SceneTimeDebug";
import { SceneEnvironment } from "@/game/time/SceneEnvironment";
import { SkyEnvironment } from "@/game/world/SkyEnvironment";
const SKY = "#b9d8ef";

export function GameCanvas() {
  const low = LOW_QUALITY;

  return (
    <>
      <Canvas
        shadows={!low}
        dpr={low ? 1 : [1, 1.5]}
        performance={{ min: 0.4 }}
        camera={{ position: [0, 4, 20], fov: 58, near: 0.1, far: low ? 260 : 420 }}
        gl={{ antialias: !low, powerPreference: "high-performance", stencil: false, depth: true }}
      >
        <color attach="background" args={[SKY]} />
        <fog attach="fog" args={[SKY, low ? 60 : 80, low ? 160 : 260]} />

        <SceneEnvironment />
        {!low && (
          <Environment>
            <Lightformer
              intensity={1.6}
              position={[0, 12, 0]}
              scale={[24, 24, 1]}
              color="#ffffff"
            />
            <Lightformer
              intensity={0.9}
              color="#bcdcf5"
              position={[-14, 4, -6]}
              rotation-y={Math.PI / 2}
              scale={[30, 6, 1]}
            />
          </Environment>
        )}

        <SkyEnvironment />
        <Suspense fallback={null}>
          <Physics gravity={[0, -20, 0]} timeStep={low ? 1 / 40 : 1 / 60}>
            <OutdoorNeighborhood />
            <TokoCung />
            <WorldZones />
            <Npcs />
            <ActivityProps />
            <NakamaOps />
            <Player />
            <RemotePlayers />
          </Physics>
          <Waypoint />
          <VehicleExhaust />
        </Suspense>
        <AdaptiveDpr />
      </Canvas>
      {import.meta.env.DEV && <SceneTimeDebug />}
    </>
  );
}
