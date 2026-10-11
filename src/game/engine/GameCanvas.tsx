/** @jsxImportSource @/game/jsx */
import { DungeonScene, PrincipalBuilding } from "@/game/dungeon/DungeonScene";
import { useDungeon } from "@/game/dungeon/store";
import { useChannels } from "@/net/channel-store";
import { QuestMarkers } from "@/game/core/QuestMarkers";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Lightformer } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useEffect, Suspense, lazy } from "react";
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
const ReactiveWorldDebug = import.meta.env.DEV
  ? lazy(() =>
      import("@/game/reactive-world/ReactiveWorldDebug").then((m) => ({
        default: m.ReactiveWorldDebug,
      })),
    )
  : null;
const DungeonDebug = import.meta.env.DEV
  ? lazy(() => import("@/game/dungeon/DungeonDebug").then((m) => ({ default: m.DungeonDebug })))
  : null;
function SceneReady() {
  useEffect(() => {
    useChannels.setState({ sceneReady: true });
    return () => {
      useChannels.setState({ sceneReady: false });
    };
  }, []);
  return null;
}
const SKY = "#b9d8ef";

export function GameCanvas() {
  const low = LOW_QUALITY;
  const dungeon = useDungeon((s) => !!s.data?.instance && s.data.instance.realm !== "WORLD");
  const revision = useDungeon((s) => s.sceneRevision);

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

        {!dungeon && <SceneEnvironment />}
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

        {!dungeon && <SkyEnvironment />}
        <Suspense fallback={null}>
          <Physics
            key={`physics-${revision}`}
            gravity={[0, -20, 0]}
            timeStep={low ? 1 / 40 : 1 / 60}
          >
            {dungeon ? (
              <DungeonScene />
            ) : (
              <>
                <OutdoorNeighborhood />
                <PrincipalBuilding />
                <TokoCung />
                <WorldZones />
                <QuestMarkers />
                <Npcs />
                <ActivityProps />
                <NakamaOps />
              </>
            )}
            <Player />
            <RemotePlayers />
          </Physics>
          {!dungeon && (
            <>
              <Waypoint />
              <VehicleExhaust />
            </>
          )}
          <SceneReady key={`ready-${revision}`} />
        </Suspense>
        <AdaptiveDpr />
      </Canvas>
      {DungeonDebug && (
        <Suspense fallback={null}>
          <DungeonDebug />
        </Suspense>
      )}
      {import.meta.env.DEV && <SceneTimeDebug />}
      {ReactiveWorldDebug && (
        <Suspense fallback={null}>
          <ReactiveWorldDebug />
        </Suspense>
      )}
    </>
  );
}
